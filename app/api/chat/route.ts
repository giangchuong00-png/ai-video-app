import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ==========================================================
// TYPES
// ==========================================================

type RecentScript = {
  hook?: string;
  sales_angle?: string;
  structure?: string;
  content_type?: string;
};

type RequestBody = {
  message?: string;
  duration?: "15s" | "30s" | "60s" | string;
  product?: string;
  userNote?: string;
  referenceUrl?: string;
  mode?: "creative" | "motion";
  recentScripts?: RecentScript[];
};

type CreativeRoute = {
  content_type: string;
  sales_angle: string;
  structure: string;
  perspective: string;
};

// ==========================================================
// CURRENT VIDEO ENGINE CAPABILITY
// ==========================================================

const MODEL_MAX_SCENE_SECONDS = 6;
const PREFERRED_MIN_SCENE_SECONDS = 2;

// ==========================================================
// CREATIVE ROUTES
// ==========================================================

const CREATIVE_ROUTES: CreativeRoute[] = [
  {
    content_type: "problem_solution",
    sales_angle: "pain_point",
    structure:
      "problem → tension → solution → payoff → CTA",
    perspective:
      "người trực tiếp gặp vấn đề",
  },

  {
    content_type: "warning",
    sales_angle: "mistake_warning",
    structure:
      "sai lầm → hậu quả → giải pháp → sản phẩm → CTA",
    perspective:
      "người chia sẻ kinh nghiệm",
  },

  {
    content_type: "comparison",
    sales_angle: "comparison_test",
    structure:
      "so sánh → kiểm chứng → khác biệt → kết luận → CTA",
    perspective:
      "người thử nghiệm khách quan",
  },

  {
    content_type: "deal_value",
    sales_angle: "value_for_money",
    structure:
      "hook → giá trị → bằng chứng → deal → CTA",
    perspective:
      "người săn deal",
  },

  {
    content_type: "lifestyle_pov",
    sales_angle: "identity_lifestyle",
    structure:
      "routine → bất tiện → sản phẩm → trải nghiệm → payoff",
    perspective:
      "người sử dụng thực tế",
  },

  {
    content_type: "product_demo",
    sales_angle: "proof_demo",
    structure:
      "hook → demo → chi tiết → kết quả → CTA",
    perspective:
      "người trực tiếp demo sản phẩm",
  },

  {
    content_type: "storytelling",
    sales_angle: "emotional_discovery",
    structure:
      "vấn đề → phát hiện → trải nghiệm → thay đổi → CTA",
    perspective:
      "người dùng kể trải nghiệm",
  },
];

// ==========================================================
// LOCATIONS
// ==========================================================

const NEW_LOCATION_POOL = [
  "modern living room",
  "bright modern kitchen",
  "minimalist home studio",
  "sunlit balcony",
  "clean work desk",
  "cozy reading corner",
  "modern cafe",
  "minimal beauty vanity",
  "soft daylight window corner",
  "premium product studio",
  "modern dressing room",
  "clean bathroom vanity",
];

// ==========================================================
// DURATION HELPERS
// ==========================================================

function normalizeDuration(
  duration?: string
): "15s" | "30s" | "60s" {
  if (duration === "30s") {
    return "30s";
  }

  if (duration === "60s") {
    return "60s";
  }

  return "15s";
}

function durationToSeconds(
  duration: "15s" | "30s" | "60s"
): number {
  if (duration === "30s") {
    return 30;
  }

  if (duration === "60s") {
    return 60;
  }

  return 15;
}

function parseSceneDuration(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return 0;
  }

  const match =
    value.match(
      /(\d+(?:\.\d+)?)/
    );

  if (!match) {
    return 0;
  }

  const parsed =
    Number(match[1]);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function roundDuration(
  seconds: number
): number {
  return Math.round(
    seconds * 10
  ) / 10;
}

// ==========================================================
// VOICEOVER DURATION HELPERS
// ==========================================================

function countVietnameseWords(
  text: string
): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function getRecommendedMaxWords(
  durationSeconds: number
): number {
  if (durationSeconds <= 2) {
    return 7;
  }

  if (durationSeconds <= 3) {
    return 10;
  }

  if (durationSeconds <= 4) {
    return 13;
  }

  if (durationSeconds <= 5) {
    return 16;
  }

  if (durationSeconds <= 6) {
    return 19;
  }

  return Math.max(
    19,
    Math.floor(
      durationSeconds * 3.2
    )
  );
}

function voiceoverFitsScene(
  text: string,
  durationSeconds: number
): boolean {
  const cleanText =
    String(text || "").trim();

  if (!cleanText) {
    return true;
  }

  const words =
    countVietnameseWords(
      cleanText
    );

  const maxWords =
    getRecommendedMaxWords(
      durationSeconds
    );

  return words <= maxWords;
}

// ==========================================================
// NORMALIZE ONE SCENE
// ==========================================================

function normalizeScene(
  scene: any,
  index: number,
  parsedScript: any,
  product: string
) {
  const spec =
    scene?.scene_spec ||
    {};

  const cinematic =
    scene?.cinematic_spec ||
    {};

  let sceneDuration =
    parseSceneDuration(
      scene?.duration
    );

  if (
    sceneDuration <= 0
  ) {
    sceneDuration = 3;
  }

  return {
    ...scene,

    scene_number:
      index + 1,

    duration:
      `${roundDuration(
        sceneDuration
      )}s`,

    scene_spec: {
      purpose:
        spec.purpose ||
        "",

      location:
        spec.location ||
        scene.location ||
        "",

      shot_type:
        spec.shot_type ||
        scene.shot_type ||
        "medium close-up",

      camera_angle:
        spec.camera_angle ||
        "eye-level",

      camera_movement:
        spec.camera_movement ||
        "subtle slow movement",

      lighting:
        spec.lighting ||
        "soft natural realistic lighting",

      subject:
        spec.subject ||
        "same subject",

      product:
        spec.product ||
        parsedScript
          ?.product_identity
          ?.name ||
        product ||
        "same product",

      action:
        spec.action ||
        scene.action ||
        "",

      composition:
        spec.composition ||
        "clean commercial composition",

      motion_complexity:
        spec.motion_complexity ||
        "low",

      product_visibility:
        spec.product_visibility ||
        "high",

      character_visibility:
        spec.character_visibility ||
        "medium",

      continuity_instruction:
        spec.continuity_instruction ||
        "keep the same product identity and same character identity",

      forbidden:
        Array.isArray(
          spec.forbidden
        )
          ? spec.forbidden
          : [
              "different product",
              "different product color",
              "different character",
              "deformed hands",
              "extra fingers",
              "plastic skin",
              "cartoon look",
              "CGI look",
              "complex body motion",
            ],
    },

    cinematic_spec: {
      lens_look:
        cinematic.lens_look ||
        "50mm-like",

      aperture_feel:
        cinematic.aperture_feel ||
        "f/2.8-like",

      depth_of_field:
        cinematic.depth_of_field ||
        "moderate",

      camera_distance:
        cinematic.camera_distance ||
        "1.2m",

      camera_height:
        cinematic.camera_height ||
        "chest level",

      camera_motion:
        cinematic.camera_motion ||
        spec.camera_movement ||
        "subtle slow push-in",

      motion_strength:
        cinematic.motion_strength ||
        "low",

      stabilization:
        cinematic.stabilization ||
        "natural stable handheld",

      lighting_style:
        cinematic.lighting_style ||
        spec.lighting ||
        "soft natural realistic lighting",

      key_light_direction:
        cinematic.key_light_direction ||
        "front-side",

      shadow_style:
        cinematic.shadow_style ||
        "soft natural shadows",

      color_temperature:
        cinematic.color_temperature ||
        "neutral-warm",

      realism_profile:
        cinematic.realism_profile ||
        "real commercial social media footage",

      physical_plausibility:
        cinematic.physical_plausibility ||
        "high",

      product_preservation_priority:
        cinematic
          .product_preservation_priority ||
        "critical",

      character_preservation_priority:
        cinematic
          .character_preservation_priority ||
        (
          spec.character_visibility ===
          "none"
            ? "none"
            : "high"
        ),
    },

    visual_prompt:
      String(
        scene.visual_prompt ||
        ""
      ).trim(),

    visual_prompt_vi:
      String(
        scene.visual_prompt_vi ||
        ""
      ).trim(),

    voiceover:
      String(
        scene.voiceover ||
        ""
      ).trim(),
  };
}

// ==========================================================
// FALLBACK SPLITTER
// ==========================================================

function fallbackSplitLongScene(
  scene: any
): any[] {
  const totalSeconds =
    parseSceneDuration(
      scene.duration
    );

  if (
    totalSeconds <=
    MODEL_MAX_SCENE_SECONDS
  ) {
    return [scene];
  }

  const partCount =
    Math.ceil(
      totalSeconds /
        MODEL_MAX_SCENE_SECONDS
    );

  const result: any[] =
    [];

  let assigned = 0;

  for (
    let i = 0;
    i < partCount;
    i++
  ) {
    const remaining =
      totalSeconds -
      assigned;

    const remainingParts =
      partCount - i;

    const duration =
      i ===
      partCount - 1
        ? remaining
        : Math.min(
            MODEL_MAX_SCENE_SECONDS,
            remaining /
              remainingParts
          );

    const rounded =
      roundDuration(
        duration
      );

    assigned += rounded;

    result.push({
      ...scene,

      duration:
        `${rounded}s`,

      scene_spec: {
        ...(scene.scene_spec ||
          {}),

        purpose:
          `${
            scene
              ?.scene_spec
              ?.purpose ||
            "Continue original scene"
          } - part ${
            i + 1
          }/${partCount}`,

        action:
          `${
            scene
              ?.scene_spec
              ?.action ||
            "continue the same simple action"
          }. Continuation part ${
            i + 1
          } of ${partCount}.`,

        continuity_instruction:
          "Continue seamlessly from the adjacent sub-scene. Preserve the exact same product, character, wardrobe, lighting family and environment.",
      },

      visual_prompt:
        `${
          scene.visual_prompt ||
          ""
        } Continuation shot ${
          i + 1
        } of ${partCount}. Maintain exact product and character identity, same environment and visual continuity.`,

      visual_prompt_vi:
        `${
          scene.visual_prompt_vi ||
          ""
        } Đây là phần tiếp nối ${
          i + 1
        }/${partCount} của cùng một phân cảnh.`,

      voiceover:
        i === 0
          ? scene.voiceover ||
            ""
          : "",
    });
  }

  return result;
}

// ==========================================================
// SEMANTIC DURATION ADAPTER
// ==========================================================

async function adaptLongScenesWithGemini({
  ai,
  scenes,
  productIdentity,
  characterIdentity,
  candidateModels,
}: {
  ai: GoogleGenAI;
  scenes: any[];
  productIdentity: any;
  characterIdentity: any;
  candidateModels: string[];
}): Promise<{
  scenes: any[];
  used: boolean;
  model: string;
  fallbackUsed: boolean;
}> {
  const longScenes =
    scenes.filter(
      (scene) =>
        parseSceneDuration(
          scene.duration
        ) >
        MODEL_MAX_SCENE_SECONDS
    );

  if (
    longScenes.length === 0
  ) {
    return {
      scenes,
      used: false,
      model: "",
      fallbackUsed:
        false,
    };
  }

  console.log(
    `[Duration Adapter] phát hiện ${longScenes.length} scene dài hơn ${MODEL_MAX_SCENE_SECONDS}s`
  );

  const adapterPrompt = `
Bạn là REELBO DURATION ADAPTER.

Video Director đã tạo một số scene dài hơn giới hạn kỹ thuật của video engine.

VIDEO ENGINE MAXIMUM SINGLE SCENE:
${MODEL_MAX_SCENE_SECONDS} giây.

NHIỆM VỤ:

Tách CHỈ những scene dài hơn ${MODEL_MAX_SCENE_SECONDS}s thành các sub-scene tự nhiên về nội dung.

Không được chia máy móc nếu có thể chia theo:
- thay đổi hành động
- thay đổi framing
- chuyển từ KOC sang product close-up
- chuyển từ giới thiệu sang demo
- chuyển từ demo sang proof
- chuyển từ product holding sang macro detail

==================================================
QUY TẮC BẮT BUỘC
==================================================

1. Mỗi scene sau khi xử lý phải <= ${MODEL_MAX_SCENE_SECONDS}s.

2. Tổng duration của các sub-scene phải bằng duration scene gốc.

Ví dụ:

scene gốc = 9s

có thể:

4s + 5s

hoặc:

3s + 6s

Không được:

6s + 6s.

3. Không thay đổi:
- Product Identity
- Character Identity
- sales logic
- claim
- nội dung cốt lõi
- CTA
- thông tin sản phẩm

4. Một sub-scene chỉ nên có MỘT hành động chính.

5. Hai sub-scene tách từ cùng một scene phải có continuity.

6. Có thể đổi góc camera nhẹ giữa các sub-scene nếu giúp video tự nhiên.

7. Không tạo chuyển động cơ thể phức tạp.

8. Voiceover phải được chia theo nghĩa.

9. Voiceover phải đọc vừa trong duration mới.

10. visual_prompt phải được viết lại phù hợp cho từng sub-scene.

11. cinematic_spec phải được giữ logic liên tục.

12. Scene nào <= ${MODEL_MAX_SCENE_SECONDS}s:
GIỮ NGUYÊN nội dung và duration.

13. Không tự thêm scene nếu không cần.

14. Không làm thay đổi tổng logic video.

==================================================
PRODUCT IDENTITY
==================================================

${JSON.stringify(
  productIdentity || {},
  null,
  2
)}

==================================================
CHARACTER IDENTITY
==================================================

${JSON.stringify(
  characterIdentity || {},
  null,
  2
)}

==================================================
SCENES HIỆN TẠI
==================================================

${JSON.stringify(
  scenes,
  null,
  2
)}

==================================================
OUTPUT
==================================================

Chỉ trả JSON:

{
  "scenes": [
    {
      "duration": "4s",

      "scene_spec": {
        "purpose": "",
        "location": "",
        "shot_type": "",
        "camera_angle": "",
        "camera_movement": "",
        "lighting": "",
        "subject": "",
        "product": "",
        "action": "",
        "composition": "",
        "motion_complexity": "low",
        "product_visibility": "high",
        "character_visibility": "medium",
        "continuity_instruction": "",
        "forbidden": []
      },

      "cinematic_spec": {
        "lens_look": "",
        "aperture_feel": "",
        "depth_of_field": "",
        "camera_distance": "",
        "camera_height": "",
        "camera_motion": "",
        "motion_strength": "",
        "stabilization": "",
        "lighting_style": "",
        "key_light_direction": "",
        "shadow_style": "",
        "color_temperature": "",
        "realism_profile": "",
        "physical_plausibility": "",
        "product_preservation_priority": "",
        "character_preservation_priority": ""
      },

      "visual_prompt": "",
      "visual_prompt_vi": "",
      "voiceover": ""
    }
  ]
}

Không Markdown.
`;

  for (
    const modelName of
    candidateModels
  ) {
    try {
      console.log(
        `[Duration Adapter] thử model ${modelName}`
      );

      const response =
        await ai.models.generateContent(
          {
            model:
              modelName,

            contents: [
              {
                role:
                  "user",

                parts: [
                  {
                    text:
                      adapterPrompt,
                  },
                ],
              },
            ],

            config: {
              responseMimeType:
                "application/json",
            },
          }
        );

      const text =
        response.text?.trim();

      if (!text) {
        continue;
      }

      let parsed: any;

      try {
        parsed =
          JSON.parse(
            text
              .replace(
                /```json/gi,
                ""
              )
              .replace(
                /```/g,
                ""
              )
              .trim()
          );
      } catch {
        const match =
          text.match(
            /\{[\s\S]*\}/
          );

        if (!match) {
          continue;
        }

        parsed =
          JSON.parse(
            match[0]
          );
      }

      if (
        !Array.isArray(
          parsed?.scenes
        ) ||
        parsed.scenes
          .length === 0
      ) {
        continue;
      }

      const invalidScene =
        parsed.scenes.find(
          (scene: any) =>
            parseSceneDuration(
              scene.duration
            ) >
            MODEL_MAX_SCENE_SECONDS
        );

      if (
        invalidScene
      ) {
        console.warn(
          "[Duration Adapter] Gemini vẫn trả scene > giới hạn. Thử model khác."
        );

        continue;
      }

      const originalTotal =
        scenes.reduce(
          (
            sum,
            scene
          ) =>
            sum +
            parseSceneDuration(
              scene.duration
            ),
          0
        );

      const adaptedTotal =
        parsed.scenes.reduce(
          (
            sum: number,
            scene: any
          ) =>
            sum +
            parseSceneDuration(
              scene.duration
            ),
          0
        );

      const difference =
        Math.abs(
          originalTotal -
            adaptedTotal
        );

      if (
        difference > 0.6
      ) {
        console.warn(
          `[Duration Adapter] tổng duration lệch ${difference}s. Thử model khác.`
        );

        continue;
      }

      console.log(
        `[Duration Adapter] semantic split thành công | ${scenes.length} → ${parsed.scenes.length} scenes | model=${modelName}`
      );

      return {
        scenes:
          parsed.scenes,

        used: true,

        model:
          modelName,

        fallbackUsed:
          false,
      };
    } catch (
      error
    ) {
      console.warn(
        `[Duration Adapter] ${modelName} lỗi:`,
        error
      );
    }
  }

  console.warn(
    "[Duration Adapter] Semantic Splitter thất bại. Dùng fallback local."
  );

  const fallbackScenes =
    scenes.flatMap(
      (scene) =>
        fallbackSplitLongScene(
          scene
        )
    );

  return {
    scenes:
      fallbackScenes,

    used: true,

    model:
      "local-fallback",

    fallbackUsed:
      true,
  };
}

// ==========================================================
// SEMANTIC VOICEOVER DURATION GUARD
// ==========================================================

async function guardVoiceovers({
  ai,
  scenes,
  candidateModels,
}: {
  ai: GoogleGenAI;
  scenes: any[];
  candidateModels: string[];
}): Promise<{
  scenes: any[];
  changed: number;
  model: string;
}> {
  const problemScenes =
    scenes
      .map(
        (
          scene,
          index
        ) => {
          const duration =
            parseSceneDuration(
              scene.duration
            );

          const voiceover =
            String(
              scene.voiceover ||
              ""
            ).trim();

          return {
            index,

            duration,

            voiceover,

            currentWords:
              countVietnameseWords(
                voiceover
              ),

            maxWords:
              getRecommendedMaxWords(
                duration
              ),
          };
        }
      )
      .filter(
        (item) =>
          Boolean(
            item.voiceover
          ) &&
          !voiceoverFitsScene(
            item.voiceover,
            item.duration
          )
      );

  if (
    problemScenes.length ===
    0
  ) {
    return {
      scenes,
      changed: 0,
      model: "",
    };
  }

  console.log(
    `[Voiceover Guard] phát hiện ${problemScenes.length} scene có lời thoại quá dài.`
  );

  const prompt = `
Bạn là REELBO VOICEOVER DURATION GUARD.

Một số lời thoại tiếng Việt của video đang dài hơn thời lượng scene.

Nhiệm vụ:

RÚT GỌN CHỈ các voiceover được cung cấp.

==================================================
QUY TẮC
==================================================

1. Giữ nguyên ý bán hàng.

2. Không thêm claim mới.

3. Không thay đổi thông tin sản phẩm.

4. Không thay đổi giá / tính năng / lợi ích nếu dữ liệu gốc không có.

5. Không đổi nghĩa câu.

6. Không biến câu thành văn quảng cáo cứng.

7. Phải giống cách KOC Việt Nam nói tự nhiên.

8. Không thêm lời dẫn hoặc giải thích.

9. Không thay đổi duration.

10. Voiceover mới phải <= maxWords.

11. Ưu tiên câu ngắn tự nhiên.

12. Không cắt câu khiến mất nghĩa.

13. Không đưa index khác ngoài danh sách input.

==================================================
SCENES CẦN RÚT GỌN
==================================================

${JSON.stringify(
  problemScenes,
  null,
  2
)}

==================================================
OUTPUT
==================================================

Chỉ trả JSON:

{
  "voiceovers": [
    {
      "index": 0,
      "voiceover": ""
    }
  ]
}

Không Markdown.
`;

  for (
    const modelName of
    candidateModels
  ) {
    try {
      console.log(
        `[Voiceover Guard] thử model ${modelName}`
      );

      const response =
        await ai.models.generateContent(
          {
            model:
              modelName,

            contents: [
              {
                role:
                  "user",

                parts: [
                  {
                    text:
                      prompt,
                  },
                ],
              },
            ],

            config: {
              responseMimeType:
                "application/json",
            },
          }
        );

      const text =
        response.text?.trim();

      if (!text) {
        continue;
      }

      let parsed: any;

      try {
        parsed =
          JSON.parse(
            text
              .replace(
                /```json/gi,
                ""
              )
              .replace(
                /```/g,
                ""
              )
              .trim()
          );
      } catch {
        const match =
          text.match(
            /\{[\s\S]*\}/
          );

        if (!match) {
          continue;
        }

        parsed =
          JSON.parse(
            match[0]
          );
      }

      if (
        !Array.isArray(
          parsed?.voiceovers
        )
      ) {
        continue;
      }

      const updatedScenes =
        scenes.map(
          (scene) => ({
            ...scene,
          })
        );

      let changed = 0;

      for (
        const item of
        parsed.voiceovers
      ) {
        const index =
          Number(
            item?.index
          );

        const newVoiceover =
          String(
            item?.voiceover ||
            ""
          ).trim();

        if (
          !Number.isInteger(
            index
          ) ||
          index < 0 ||
          index >=
            updatedScenes.length ||
          !newVoiceover
        ) {
          continue;
        }

        const duration =
          parseSceneDuration(
            updatedScenes[
              index
            ].duration
          );

        if (
          !voiceoverFitsScene(
            newVoiceover,
            duration
          )
        ) {
          console.warn(
            `[Voiceover Guard] Scene ${
              index + 1
            } vẫn quá dài sau rewrite.`
          );

          continue;
        }

        updatedScenes[
          index
        ] = {
          ...updatedScenes[
            index
          ],

          voiceover:
            newVoiceover,
        };

        changed++;
      }

      console.log(
        `[Voiceover Guard] sửa ${changed}/${problemScenes.length} scene | model=${modelName}`
      );

      return {
        scenes:
          updatedScenes,

        changed,

        model:
          modelName,
      };
    } catch (
      error
    ) {
      console.warn(
        `[Voiceover Guard] ${modelName} lỗi:`,
        error
      );
    }
  }

  console.warn(
    "[Voiceover Guard] Không rewrite được. Giữ nguyên voiceover để Audio Engine kiểm tra."
  );

  return {
    scenes,
    changed: 0,
    model:
      "none",
  };
}

// ==========================================================
// MAIN SYSTEM PROMPT
// ==========================================================

const SYSTEM_PROMPT = `
Bạn là REELBO AI DIRECTOR.

Bạn nhận dữ liệu đã được phân tích từ:
- video mẫu
- ảnh mẫu
- link TikTok
- thông tin sản phẩm
- Multimodal Analyzer

Nhiệm vụ của bạn:

1. Giữ đúng Product Identity.
2. Hiểu pacing gốc.
3. Không sao chép visual gốc.
4. Tạo kịch bản bán hàng mới.
5. Thiết kế từng scene.
6. Thiết kế Cinematic Spec cho từng scene.
7. Giảm tối đa các tình huống khiến AI Video dễ lỗi.
8. Chuẩn bị dữ liệu cho Video Engine phía sau.

==================================================
1. PRODUCT IDENTITY LOCK
==================================================

Nếu input chứa Product Identity từ Video Analyzer:

đó là nguồn sự thật chính về hình ảnh sản phẩm.

Phải giữ:

- loại sản phẩm
- màu chính
- màu phụ
- hình dạng
- vật liệu nếu nhìn thấy
- logo / chữ nếu nhìn thấy
- texture
- chi tiết nhận diện

Cấm:

- tự đổi màu
- tự đổi kiểu dáng
- tự thêm logo
- tự thêm phiên bản
- tự biến thành sản phẩm khác
- tự thêm claim không có dữ liệu

Nếu không chắc:
ghi "unknown".

==================================================
2. CHARACTER IDENTITY
==================================================

Nếu user sử dụng ảnh KOC:

coi đây là SAME CHARACTER xuyên suốt video.

Không tự yêu cầu:

- đổi mặt
- đổi giới tính
- đổi tóc
- đổi màu da
- tạo một người khác

==================================================
3. VISUAL DIVERSIFIER
==================================================

Video mới phải khác visual video mẫu.

Nếu input chứa:

- BỐI CẢNH GỐC PHẢI TRÁNH
- CAMERA GỐC
- CAMERA MOVEMENT GỐC
- HÀNH ĐỘNG GỐC
- ÁNH SÁNG GỐC
- BỐ CỤC GỐC

hãy coi chúng là dữ liệu để tránh sao chép.

Mỗi scene mới nên thay đổi ít nhất 3/5 yếu tố:

1. location
2. shot / camera angle
3. lighting
4. action
5. composition

==================================================
4. DYNAMIC SCENE DURATION
==================================================

KHÔNG ép mọi scene 5 giây.

KHÔNG ép:
15s = 3 scene.

AI tự quyết:

- số lượng scene
- duration từng scene
- pacing

dựa trên:

- video mẫu
- hook
- lời thoại
- sản phẩm
- action
- nhịp dựng

Thông thường:

2–6 giây.

Tuy nhiên:

Nếu về mặt storytelling một scene hợp lý cần 7–10 giây,
bạn vẫn được phép thiết kế scene đó.

Reelbo có Duration Adapter phía sau để chia scene dài thành các shot render phù hợp với Video Engine.

Vì vậy:

KHÔNG được phá storytelling chỉ để ép mọi scene <= 6 giây.

Tổng duration các scene phải gần bằng thời lượng user chọn.

==================================================
5. ACTION COMPLEXITY
==================================================

Một scene nên chỉ có MỘT hành động chính.

Ví dụ tốt:

- KOC đưa sản phẩm gần camera.
- KOC xoay nhẹ sản phẩm.
- KOC chỉ vào chi tiết.
- Hai tay mở nắp.
- Camera push-in.
- Camera slide ngang.
- Close-up sản phẩm đang được sử dụng.

Không tạo một scene có:

đi bộ + ngồi + đứng + mở hộp + xoay người + cầm sản phẩm + di chuyển sang phòng khác.

==================================================
6. CAMERA SAFETY PROFILE
==================================================

Không dùng No-Legs Rule cứng cho mọi sản phẩm.

BEAUTY / SKINCARE / ĐỒ CẦM TAY / ELECTRONICS:

ưu tiên:

- close-up
- medium close-up
- chest-up
- waist-up
- hands + product
- macro

tránh:

- full-body walking
- chạy
- chuyển động cơ thể phức tạp

THỜI TRANG THÂN TRÊN:

ưu tiên:

- waist-up
- thigh-up
- medium shot
- close-up chất liệu
- slow turn

GIÀY / DÉP:

được phép thấy:

- bàn chân
- cổ chân
- lower leg
- close-up sản phẩm khi mang

tránh:

- full-body walking dài
- chạy
- chuyển động chân phức tạp

PRODUCT ONLY:

ưu tiên:

- macro
- tabletop
- hand interaction
- product rotation
- top-down
- slow slide
- slow push-in

==================================================
7. CINEMATIC SPEC ENGINE
==================================================

Mỗi scene phải có một cinematic_spec.

Không chọn thông số điện ảnh chỉ để nghe "xịn".

Thông số phải phục vụ:

- tính chân thật
- độ ổn định
- sản phẩm dễ nhìn
- AI dễ render

LENS LOOK:

wide-like:
chỉ dùng khi cần thấy không gian.

35mm-like:
phù hợp lifestyle, room context.

50mm-like:
ưu tiên cho KOC, product holding, natural commercial footage.

telephoto-like:
chỉ dùng cho close-up đặc biệt.

Không ép mọi scene 35mm.

APERTURE FEEL:

Dùng dạng:

- shallow
- moderate
- deep

Nếu cần metadata kỹ thuật:

- f/1.8-like
- f/2.8-like
- f/4-like

Ưu tiên moderate depth of field để sản phẩm không bị out-focus.

CAMERA DISTANCE:

- macro
- 0.5m
- 1m
- 1.5m
- 2m
- room-wide

CAMERA HEIGHT:

- tabletop level
- waist level
- chest level
- eye level
- slightly above eye level

MOTION STRENGTH:

ưu tiên:

- very_low
- low
- medium

Hạn chế high nếu không thật sự cần.

==================================================
8. PHYSICAL PLAUSIBILITY GUARD
==================================================

Mọi scene phải tuân theo chuyển động hợp lý.

Yêu cầu:

- realistic gravity
- believable object weight
- natural inertia
- realistic hand-object interaction
- product không bay/lơ lửng
- không teleport
- không xuyên vật thể
- không biến đổi kích thước vô lý

Nếu action quá phức tạp:
hãy đơn giản hóa.

==================================================
9. REALISM PROFILE
==================================================

Mục tiêu:

REAL COMMERCIAL SOCIAL MEDIA FOOTAGE.

Ưu tiên:

- natural skin texture
- realistic materials
- realistic product reflections
- physically believable lighting
- natural shadows
- subtle camera movement
- realistic proportions
- smartphone / mirrorless camera feeling
- natural exposure
- moderate depth of field

Tránh:

- plastic skin
- CGI look
- cartoon
- anime
- game render
- wax skin
- fantasy lighting
- overly glossy face
- excessive sharpness
- fake HDR
- extreme camera movement

==================================================
10. PRODUCT PRESERVATION PRIORITY
==================================================

Mỗi scene phải xác định mức ưu tiên giữ sản phẩm:

"critical"
"high"
"medium"

Nếu sản phẩm là trung tâm scene:
dùng "critical".

Nếu sản phẩm chỉ xuất hiện phụ:
có thể dùng "high".

Không nên dùng "low" trong video bán hàng.

==================================================
11. CHARACTER PRESERVATION PRIORITY
==================================================

Nếu có KOC và KOC xuất hiện:

ưu tiên:
"critical" hoặc "high".

Nếu scene product-only:
có thể dùng "none".

==================================================
12. VOICEOVER
==================================================

Voiceover:

- tiếng Việt tự nhiên
- giống KOC nói thật
- không copy nguyên video mẫu
- giữ đúng thông tin sản phẩm
- câu ngắn, dễ đọc
- không nhồi quá nhiều chữ
- phải đọc vừa duration scene

Ước lượng an toàn:

2s:
không quá khoảng 7 từ.

3s:
không quá khoảng 10 từ.

4s:
không quá khoảng 13 từ.

5s:
không quá khoảng 16 từ.

6s:
không quá khoảng 19 từ.

Không bắt buộc dùng đủ số từ.

==================================================
13. OUTPUT
==================================================

Chỉ trả JSON hợp lệ.

Không Markdown.

Schema bắt buộc:

{
  "strategy": {
    "content_type": "",
    "sales_angle": "",
    "structure": "",
    "visual_strategy": "",
    "camera_safety_profile": "",
    "pacing_strategy": "",
    "original_visual_avoidance": []
  },

  "product_identity": {
    "name": "",
    "category": "",
    "main_color": "",
    "secondary_colors": [],
    "material": "",
    "shape": "",
    "logo_or_text": "",
    "texture": "",
    "distinctive_features": []
  },

  "character_identity": {
    "description": "",
    "consistency_instruction": ""
  },

  "hook": "",

  "scenes": [
    {
      "scene_number": 1,

      "duration": "3.5s",

      "scene_spec": {
        "purpose": "",
        "location": "",
        "shot_type": "",
        "camera_angle": "",
        "camera_movement": "",
        "lighting": "",
        "subject": "",
        "product": "",
        "action": "",
        "composition": "",
        "motion_complexity": "low",
        "product_visibility": "high",
        "character_visibility": "medium",
        "continuity_instruction": "",
        "forbidden": []
      },

      "cinematic_spec": {
        "lens_look": "50mm-like",
        "aperture_feel": "f/2.8-like",
        "depth_of_field": "moderate",
        "camera_distance": "1.2m",
        "camera_height": "chest level",
        "camera_motion": "slow push-in",
        "motion_strength": "low",
        "stabilization": "natural stable handheld",
        "lighting_style": "soft natural window light",
        "key_light_direction": "front-side",
        "shadow_style": "soft natural shadows",
        "color_temperature": "neutral-warm",
        "realism_profile": "real commercial social media footage",
        "physical_plausibility": "high",
        "product_preservation_priority": "critical",
        "character_preservation_priority": "high"
      },

      "visual_prompt": "",
      "visual_prompt_vi": "",
      "voiceover": ""
    }
  ],

  "cta": ""
}

==================================================
14. VISUAL PROMPT
==================================================

visual_prompt phải bằng tiếng Anh.

Nó phải được sinh dựa trên:

scene_spec
+
cinematic_spec
+
product_identity

Không viết kiểu:

"Beautiful girl holding product cinematic 4K."

Phải cụ thể.

==================================================
15. FINAL RULES
==================================================

- Không ép scene 5 giây.
- Không ép số scene.
- Không copy bối cảnh gốc.
- Không bịa sản phẩm.
- Không spam từ khóa điện ảnh.
- Không dùng camera movement quá phức tạp.
- Product consistency quan trọng hơn cinematic spectacle.
- Character consistency quan trọng hơn dramatic movement.
- Realism quan trọng hơn AI-art style.
`;

// ==========================================================
// POST
// ==========================================================

export async function POST(
  req: Request
) {
  try {
    const body: RequestBody =
      await req.json();

    const {
      message = "",
      product = "",
      userNote = "",
      referenceUrl = "",
      recentScripts = [],
    } = body;

    const mode =
      body.mode ===
      "motion"
        ? "motion"
        : "creative";

    const duration =
      normalizeDuration(
        body.duration
      );

    const targetSeconds =
      durationToSeconds(
        duration
      );

    const apiKey =
      process.env
        .GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Thiếu GEMINI_API_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    // ======================================================
    // MODEL FALLBACK
    // ======================================================

    const candidateModels =
      [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
      ];

    // ======================================================
    // CREATIVE ROUTE
    // ======================================================

    const routeIndex =
      (
        recentScripts.length +
        Math.floor(
          Math.random() *
            CREATIVE_ROUTES.length
        )
      ) %
      CREATIVE_ROUTES.length;

    const selectedRoute =
      CREATIVE_ROUTES[
        routeIndex
      ];

    // ======================================================
    // RECENT MEMORY
    // ======================================================

    const recentMemory =
      recentScripts.length >
      0
        ? JSON.stringify(
            recentScripts.slice(
              -8
            ),
            null,
            2
          )
        : "Không có.";

    // ======================================================
    // USER PROMPT
    // ======================================================

    const userPrompt = `
TẠO KỊCH BẢN VIDEO MỚI CHO REELBO.

==================================================
THÔNG SỐ
==================================================

MODE:
${mode}

TỔNG THỜI LƯỢNG MỤC TIÊU:
${targetSeconds} giây.

Không ép số scene.

Không ép mỗi scene 5 giây.

Hãy tự quyết:
- số scene
- duration mỗi scene
- pacing

Tổng duration phải gần ${targetSeconds} giây.

Nếu storytelling cần một scene dài hơn ${MODEL_MAX_SCENE_SECONDS}s,
vẫn có thể tạo scene đó.

Duration Adapter phía sau sẽ xử lý giới hạn Video Engine.

==================================================
SẢN PHẨM USER NHẬP
==================================================

${product || "Không có mô tả trực tiếp."}

==================================================
USER NOTE
==================================================

${userNote || "Không có"}

==================================================
REFERENCE URL
==================================================

${referenceUrl || "Không có"}

==================================================
DỮ LIỆU MULTIMODAL ANALYZER
==================================================

${message}

==================================================
CONTENT STRATEGY
==================================================

Content Type:
${selectedRoute.content_type}

Sales Angle:
${selectedRoute.sales_angle}

Structure:
${selectedRoute.structure}

Perspective:
${selectedRoute.perspective}

==================================================
BỐI CẢNH MỚI THAM KHẢO
==================================================

${JSON.stringify(
  NEW_LOCATION_POOL
)}

Không dùng location nào đã xuất hiện trong video mẫu.

==================================================
RECENT SCRIPT MEMORY
==================================================

${recentMemory}

Không tạo hook / visual opening / structure quá giống các kịch bản gần đây.

==================================================
YÊU CẦU
==================================================

1. Đọc kỹ Product Identity từ analyzer.
2. Giữ đúng sản phẩm.
3. Đọc original_visual và tránh sao chép.
4. Dựa trên pacing analyzer để chia scene.
5. Duration scene phải linh hoạt.
6. Mỗi scene chỉ có một action chính.
7. Chọn Camera Safety phù hợp sản phẩm.
8. Tạo cinematic_spec cho từng scene.
9. Motion strength ưu tiên thấp.
10. Physical plausibility phải cao.
11. Product preservation phải high hoặc critical.
12. visual_prompt bằng tiếng Anh.
13. visual_prompt_vi bằng tiếng Việt.
14. Voiceover phải vừa duration scene.
15. Chỉ trả JSON hợp lệ.
`;

    // ======================================================
    // DIRECTOR MODEL FALLBACK
    // ======================================================

    let responseText =
      "";

    let usedModel =
      "";

    for (
      const modelName of
      candidateModels
    ) {
      try {
        console.log(
          `[Reelbo Director] thử model ${modelName}`
        );

        const response =
          await ai.models.generateContent(
            {
              model:
                modelName,

              contents: [
                {
                  role:
                    "user",

                  parts: [
                    {
                      text:
                        userPrompt,
                    },
                  ],
                },
              ],

              config: {
                systemInstruction:
                  SYSTEM_PROMPT,

                responseMimeType:
                  "application/json",
              },
            }
          );

        if (
          response.text?.trim()
        ) {
          responseText =
            response.text.trim();

          usedModel =
            modelName;

          break;
        }
      } catch (
        modelError
      ) {
        console.warn(
          `[Reelbo Director] ${modelName} lỗi:`,
          modelError
        );
      }
    }

    if (!responseText) {
      throw new Error(
        "Gemini không phản hồi kịch bản."
      );
    }

    // ======================================================
    // PARSE JSON
    // ======================================================

    let parsedScript: any;

    try {
      parsedScript =
        JSON.parse(
          responseText
            .replace(
              /```json/gi,
              ""
            )
            .replace(
              /```/g,
              ""
            )
            .trim()
        );
    } catch {
      const jsonMatch =
        responseText.match(
          /\{[\s\S]*\}/
        );

      if (
        !jsonMatch
      ) {
        throw new Error(
          "Gemini không trả JSON hợp lệ."
        );
      }

      parsedScript =
        JSON.parse(
          jsonMatch[0]
        );
    }

    if (
      !Array.isArray(
        parsedScript
          ?.scenes
      ) ||
      parsedScript.scenes
        .length === 0
    ) {
      throw new Error(
        "Kịch bản không có phân cảnh."
      );
    }

    // ======================================================
    // NORMALIZE DIRECTOR OUTPUT
    // ======================================================

    parsedScript.scenes =
      parsedScript.scenes.map(
        (
          scene: any,
          index: number
        ) =>
          normalizeScene(
            scene,
            index,
            parsedScript,
            product
          )
      );

    const beforeAdapterCount =
      parsedScript.scenes
        .length;

    const beforeAdapterSeconds =
      parsedScript.scenes.reduce(
        (
          sum: number,
          scene: any
        ) =>
          sum +
          parseSceneDuration(
            scene.duration
          ),
        0
      );

    // ======================================================
    // DURATION ADAPTER
    // ======================================================

    const adapterResult =
      await adaptLongScenesWithGemini(
        {
          ai,

          scenes:
            parsedScript.scenes,

          productIdentity:
            parsedScript
              .product_identity,

          characterIdentity:
            parsedScript
              .character_identity,

          candidateModels,
        }
      );

    // ======================================================
    // NORMALIZE AFTER ADAPTER
    // ======================================================

    parsedScript.scenes =
      adapterResult.scenes.map(
        (
          scene: any,
          index: number
        ) =>
          normalizeScene(
            scene,
            index,
            parsedScript,
            product
          )
      );

    // ======================================================
    // FINAL DURATION SAFETY
    // ======================================================

    const stillTooLong =
      parsedScript.scenes.some(
        (
          scene: any
        ) =>
          parseSceneDuration(
            scene.duration
          ) >
          MODEL_MAX_SCENE_SECONDS
      );

    if (
      stillTooLong
    ) {
      console.warn(
        "[Duration Adapter] Final safety split activated."
      );

      parsedScript.scenes =
        parsedScript.scenes
          .flatMap(
            (
              scene: any
            ) =>
              fallbackSplitLongScene(
                scene
              )
          )
          .map(
            (
              scene: any,
              index: number
            ) =>
              normalizeScene(
                scene,
                index,
                parsedScript,
                product
              )
          );
    }

    // ======================================================
    // VOICEOVER DURATION GUARD
    // ======================================================

    const voiceoverGuardResult =
      await guardVoiceovers({
        ai,

        scenes:
          parsedScript.scenes,

        candidateModels,
      });

    parsedScript.scenes =
      voiceoverGuardResult.scenes.map(
        (
          scene: any,
          index: number
        ) =>
          normalizeScene(
            scene,
            index,
            parsedScript,
            product
          )
      );

    // ======================================================
    // FINAL DURATION
    // ======================================================

    const plannedSeconds =
      parsedScript.scenes.reduce(
        (
          sum: number,
          scene: any
        ) =>
          sum +
          parseSceneDuration(
            scene.duration
          ),
        0
      );

    // ======================================================
    // FINAL VOICEOVER VALIDATION
    // ======================================================

    const voiceoverWarnings =
      parsedScript.scenes
        .map(
          (
            scene: any,
            index: number
          ) => {
            const sceneSeconds =
              parseSceneDuration(
                scene.duration
              );

            const voiceover =
              String(
                scene.voiceover ||
                ""
              ).trim();

            const words =
              countVietnameseWords(
                voiceover
              );

            const maxWords =
              getRecommendedMaxWords(
                sceneSeconds
              );

            return {
              scene_number:
                index + 1,

              duration:
                scene.duration,

              words,

              max_words:
                maxWords,

              fits:
                voiceoverFitsScene(
                  voiceover,
                  sceneSeconds
                ),
            };
          }
        )
        .filter(
          (
            item: {
              scene_number: number;
              duration: string;
              words: number;
              max_words: number;
              fits: boolean;
            }
          ) =>
            !item.fits
        );

    // ======================================================
    // LOGS
    // ======================================================

    console.log(
      `[Reelbo Director] ${beforeAdapterCount} original scenes | target=${targetSeconds}s | planned-before-adapter=${beforeAdapterSeconds}s | model=${usedModel}`
    );

    console.log(
      `[Duration Adapter] used=${adapterResult.used} | model=${adapterResult.model || "not-needed"} | fallback=${adapterResult.fallbackUsed}`
    );

    console.log(
      `[Duration Adapter] final scenes=${parsedScript.scenes.length} | final duration=${plannedSeconds}s | max-single-scene=${MODEL_MAX_SCENE_SECONDS}s`
    );

    console.log(
      `[Voiceover Guard] changed=${voiceoverGuardResult.changed} | model=${voiceoverGuardResult.model || "not-needed"}`
    );

    console.log(
      `[Voiceover Guard] remaining warnings=${voiceoverWarnings.length}`
    );

    console.log(
      "[Reelbo Director] cinematic_spec scene 1 =",
      !!parsedScript
        ?.scenes?.[0]
        ?.cinematic_spec
    );

    // ======================================================
    // RETURN
    // ======================================================

    return NextResponse.json({
      success: true,

      script:
        parsedScript,

      meta: {
        model:
          usedModel,

        duration,

        target_seconds:
          targetSeconds,

        planned_seconds:
          plannedSeconds,

        scene_count:
          parsedScript.scenes
            .length,

        original_scene_count:
          beforeAdapterCount,

        dynamic_scene_duration:
          true,

        duration_adapter:
          true,

        duration_adapter_used:
          adapterResult.used,

        duration_adapter_model:
          adapterResult.model ||
          null,

        duration_adapter_fallback:
          adapterResult.fallbackUsed,

        video_engine_max_scene_seconds:
          MODEL_MAX_SCENE_SECONDS,

        preferred_min_scene_seconds:
          PREFERRED_MIN_SCENE_SECONDS,

        voiceover_duration_guard:
          true,

        voiceover_guard_changed:
          voiceoverGuardResult.changed,

        voiceover_guard_model:
          voiceoverGuardResult.model ||
          null,

        voiceover_warning_count:
          voiceoverWarnings.length,

        voiceover_warnings:
          voiceoverWarnings,

        cinematic_spec:
          true,

        mode,
      },
    });
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      "[Reelbo Script Engine] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Lỗi tạo kịch bản: " +
          message,
      },
      {
        status: 500,
      }
    );
  }
}