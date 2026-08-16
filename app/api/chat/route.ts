import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// =========================================================
// TYPES
// =========================================================

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
  angle: string;
  hook: string;
  structure: string;
  perspective: string;
  visual_opening: string;
};

// =========================================================
// CREATIVE ROUTE LIBRARY
//
// Đây là tầng chiến lược.
// Không phải template lời thoại.
// Model bắt buộc lấy một route khác khi Tạo lại.
// =========================================================

const CREATIVE_ROUTES: CreativeRoute[] = [
  {
    content_type: "problem solution",
    angle: "pain point",
    hook: "specific pain",
    structure: "problem → tension → solution → payoff",
    perspective: "người đang trực tiếp gặp vấn đề",
    visual_opening: "mở bằng vấn đề thực tế trước khi cho thấy sản phẩm",
  },

  {
    content_type: "lifestyle",
    angle: "lifestyle",
    hook: "relatable situation",
    structure: "scenario → discovery → payoff",
    perspective: "một khoảnh khắc đời thường cụ thể",
    visual_opening: "bắt đầu bằng hành động đời thường không giới thiệu sản phẩm",
  },

  {
    content_type: "comparison",
    angle: "comparison",
    hook: "visual comparison",
    structure: "A vs B → difference → recommendation",
    perspective: "so sánh hai lựa chọn hoặc hai trạng thái",
    visual_opening: "split comparison hoặc thay đổi trực tiếp trước camera",
  },

  {
    content_type: "demo",
    angle: "product experience",
    hook: "demonstration first",
    structure: "demo → reaction → benefit → payoff",
    perspective: "trải nghiệm trực tiếp",
    visual_opening: "sản phẩm hoạt động ngay từ frame đầu, chưa cần nói",
  },

  {
    content_type: "objection handling",
    angle: "objection",
    hook: "objection first",
    structure: "objection → test → proof → conclusion",
    perspective: "người từng nghi ngờ sản phẩm",
    visual_opening: "mở bằng điều khiến người mua còn lăn tăn",
  },

  {
    content_type: "transformation",
    angle: "transformation",
    hook: "result first",
    structure: "result → before → change → after",
    perspective: "kết quả sau sử dụng",
    visual_opening: "show kết quả trước rồi mới giải thích",
  },

  {
    content_type: "product discovery",
    angle: "curiosity",
    hook: "curiosity gap",
    structure: "mystery → reveal → demo → payoff",
    perspective: "phát hiện một thứ đáng chú ý",
    visual_opening: "giấu một phần sản phẩm hoặc kết quả rồi reveal",
  },

  {
    content_type: "scenario",
    angle: "convenience",
    hook: "specific situation",
    structure: "situation → friction → product → easier outcome",
    perspective: "một tình huống sử dụng cụ thể",
    visual_opening: "bắt đầu bằng tình huống cần giải quyết nhanh",
  },

  {
    content_type: "direct response",
    angle: "value",
    hook: "unexpected value",
    structure: "expectation → reveal → proof → CTA",
    perspective: "giá trị nhận được so với kỳ vọng",
    visual_opening: "mở bằng kết quả hoặc trải nghiệm trông vượt kỳ vọng",
  },

  {
    content_type: "POV",
    angle: "identity",
    hook: "persona statement",
    structure: "identity → situation → product fit → payoff",
    perspective: "một kiểu người cụ thể",
    visual_opening: "POV tình huống gắn với persona",
  },

  {
    content_type: "educational selling",
    angle: "mistake",
    hook: "mistake",
    structure: "mistake → consequence → better method → product",
    perspective: "người chỉ ra một lỗi thường gặp",
    visual_opening: "show lỗi hoặc cách dùng sai trước",
  },

  {
    content_type: "KOC recommendation",
    angle: "experience",
    hook: "honest observation",
    structure: "observation → experience → useful detail → recommendation",
    perspective: "KOC chia sẻ trải nghiệm thật",
    visual_opening: "một chi tiết nhỏ được phát hiện trong lúc sử dụng",
  },

  {
    content_type: "mini story",
    angle: "emotional payoff",
    hook: "unfinished situation",
    structure: "setup → tension → discovery → payoff",
    perspective: "mini story đời thường",
    visual_opening: "bắt đầu giữa một tình huống đang diễn ra",
  },

  {
    content_type: "routine",
    angle: "habit",
    hook: "routine interruption",
    structure: "routine → friction → product integration → outcome",
    perspective: "thói quen hằng ngày",
    visual_opening: "một routine bình thường rồi xuất hiện friction",
  },

  {
    content_type: "before after",
    angle: "aesthetics",
    hook: "before after",
    structure: "before → switch → after → reason",
    perspective: "thay đổi visual",
    visual_opening: "before state rõ ràng ngay frame đầu",
  },

  {
    content_type: "social proof",
    angle: "social proof",
    hook: "social observation",
    structure: "observation → reason → proof → recommendation",
    perspective: "quan sát từ hành vi nhiều người",
    visual_opening: "show nhiều lựa chọn/feedback/tình huống sử dụng",
  },

  {
    content_type: "confession",
    angle: "hidden benefit",
    hook: "confession",
    structure: "confession → unexpected detail → demo → payoff",
    perspective: "người dùng thú nhận một điều không ngờ",
    visual_opening: "bắt đầu bằng reaction hoặc hành vi bất ngờ",
  },

  {
    content_type: "challenge",
    angle: "result",
    hook: "challenge",
    structure: "challenge → test → result → verdict",
    perspective: "đưa sản phẩm vào một bài test",
    visual_opening: "test bắt đầu ngay frame đầu",
  },

  {
    content_type: "UGC review",
    angle: "comfort",
    hook: "micro experience",
    structure: "first impression → use → detail → verdict",
    perspective: "first-person UGC",
    visual_opening: "cận hành động sử dụng, không giới thiệu dài",
  },

  {
    content_type: "scenario",
    angle: "desire",
    hook: "desired moment",
    structure: "desired situation → product → emotional payoff",
    perspective: "điều khách hàng muốn cảm nhận",
    visual_opening: "show khoảnh khắc mong muốn trước",
  },
];

// =========================================================
// TIKTOK METADATA
//
// Hiện tại mới lấy metadata.
// Chưa phải video analyzer thật.
// =========================================================

async function fetchTiktokDataViaApi(tiktokUrl: string) {
  try {
    const response = await fetch("https://www.tikwm.com/api/", {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },

      body: new URLSearchParams({
        url: tiktokUrl,
        count: "12",
        cursor: "0",
        web: "1",
        hd: "1",
      }),

      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`TikWM HTTP ${response.status}`);
    }

    const result = await response.json();

    if (
      result &&
      result.code === 0 &&
      result.data
    ) {
      const title =
        result.data.title || "";

      const author =
        result.data.author?.nickname || "";

      const duration =
        result.data.duration || null;

      return {
        success: true,

        data: {
          title,
          author,
          duration,
        },
      };
    }

    return {
      success: false,
      data: null,
    };
  } catch (error) {
    console.error(
      "TikWM API error:",
      error
    );

    return {
      success: false,
      data: null,
    };
  }
}

// =========================================================
// HELPERS
// =========================================================

function extractTikTokUrl(
  text: string
): string | null {
  if (!text) return null;

  const regex =
    /(https?:\/\/[^\s]*tiktok\.com[^\s]*)/gi;

  const match =
    text.match(regex);

  return match?.[0] || null;
}

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

function buildRecentScriptContext(
  recentScripts?: RecentScript[]
) {
  if (
    !recentScripts ||
    recentScripts.length === 0
  ) {
    return "Không có lịch sử kịch bản gần đây.";
  }

  const limited =
    recentScripts.slice(-8);

  return limited
    .map((item, index) => {
      return `
Phiên bản ${index + 1}

Hook / ý mở đầu:
${item.hook || "N/A"}

Sales angle:
${item.sales_angle || "N/A"}

Structure:
${item.structure || "N/A"}

Content type:
${item.content_type || "N/A"}
`;
    })
    .join("\n");
}

// =========================================================
// NORMALIZE TEXT ĐỂ KIỂM TRA LẶP
// =========================================================

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textTokens(text: string) {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2)
  );
}

// Jaccard similarity.
// Không cần embedding cho MVP.
function calculateSimilarity(
  a: string,
  b: string
) {
  if (!a || !b) {
    return 0;
  }

  const setA =
    textTokens(a);

  const setB =
    textTokens(b);

  if (
    setA.size === 0 ||
    setB.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }

  const union =
    new Set([...setA, ...setB]).size;

  return union === 0
    ? 0
    : intersection / union;
}

// =========================================================
// LẤY REPRESENTATIVE IDEA CỦA SCRIPT
//
// Không chỉ kiểm tra field hook.
// Ghép hook + scene 1 để phát hiện kiểu:
// "tuổi thiếu nhi → tuổi thiếu tiền"
// bị paraphrase.
// =========================================================

function getScriptIdea(script: any) {
  const hook =
    script?.hook || "";

  const scene1Voice =
    script?.scenes?.[0]
      ?.voiceover || "";

  return `${hook} ${scene1Voice}`.trim();
}

function isTooSimilarToHistory(
  script: any,
  recentScripts: RecentScript[]
) {
  if (!recentScripts.length) {
    return false;
  }

  const currentIdea =
    getScriptIdea(script);

  if (!currentIdea) {
    return false;
  }

  for (const old of recentScripts) {
    if (!old.hook) continue;

    const similarity =
      calculateSimilarity(
        currentIdea,
        old.hook
      );

    console.log(
      `[Reelbo Diversity] Similarity: ${similarity.toFixed(2)}`
    );

    // Có thể chỉnh 0.42 sau này.
    if (similarity >= 0.42) {
      return true;
    }
  }

  return false;
}

// =========================================================
// FORBIDDEN HOOKS
// =========================================================

function buildForbiddenIdeas(
  recentScripts: RecentScript[]
) {
  const hooks =
    recentScripts
      .slice(-8)
      .map((item) => item.hook)
      .filter(Boolean);

  if (!hooks.length) {
    return "Chưa có ý tưởng bị cấm.";
  }

  return hooks
    .map(
      (hook, index) =>
        `${index + 1}. ${hook}`
    )
    .join("\n");
}

// =========================================================
// SYSTEM PROMPT
// =========================================================

const SYSTEM_PROMPT = `
Bạn là REELBO SCRIPT ENGINE.

Bạn là hệ thống chiến lược nội dung video bán hàng,
không phải template writer.

Mục tiêu là tạo ra số lượng rất lớn các concept
bán hàng khác nhau cho nhiều ngành hàng.

==================================================
1. QUY TẮC CỐT LÕI
==================================================

Mỗi request phải được xem là một creative problem mới.

Không được chỉ thay câu chữ của kịch bản cũ.

Một kịch bản được coi là THỰC SỰ MỚI khi thay đổi
ít nhất nhiều yếu tố cấp chiến lược như:

- insight
- sales angle
- hook mechanism
- customer perspective
- emotional trigger
- narrative structure
- opening visual
- demonstration style
- CTA logic

==================================================
2. KHÔNG MẶC ĐỊNH DÙNG CÁC HOOK SAU
==================================================

Không mặc định:

"Mọi người ơi..."
"Bạn có biết..."
"Nếu bạn đang..."
"Đừng mua..."
"Trời ơi..."
"Không ngờ..."
"Đây là..."

Không mặc định sử dụng joke,
wordplay hoặc câu chơi chữ.

Một câu từng hiệu quả không có nghĩa
là phải tái sử dụng.

==================================================
3. PHÂN TÍCH SẢN PHẨM
==================================================

Trước khi viết, tự xác định:

- product
- category
- probable customer
- core desire
- pain
- objection
- buying trigger
- awareness stage
- available facts

Awareness:

- unaware
- problem aware
- solution aware
- product aware
- ready to buy

==================================================
4. SOURCE OF TRUTH
==================================================

Không tự bịa:

- giá
- ưu đãi
- thành phần
- chất liệu
- chứng nhận
- claim sức khỏe
- thông số
- tính năng chưa được cung cấp

Dữ liệu user là source of truth.

==================================================
5. CREATIVE ROUTE
==================================================

Mỗi request sẽ nhận một CREATIVE ROUTE bắt buộc.

Route gồm:

- content type
- angle
- hook mechanism
- structure
- perspective
- visual opening

BẮT BUỘC tuân thủ route.

Không được quay trở lại concept quen thuộc
chỉ vì model đánh giá nó "viral" hơn.

==================================================
6. SEMANTIC ANTI-REPETITION
==================================================

Danh sách "Ý TƯỞNG ĐÃ DÙNG" không chỉ cấm copy chữ.

CẤM:

- paraphrase cùng ý
- joke cùng logic
- ẩn dụ cùng logic
- insight cùng logic
- opening premise cùng logic

Ví dụ:

"qua tuổi thiếu nhi là tới tuổi thiếu tiền"

và:

"hết thời thiếu nhi thì bước vào thời thiếu tiền"

được coi là CÙNG MỘT CONCEPT.

Nếu concept đã tồn tại trong lịch sử,
phải bỏ hoàn toàn premise đó và nghĩ premise khác.

==================================================
7. VIDEO / LINK REFERENCE
==================================================

Nếu chỉ có metadata TikTok:

không được giả vờ đã xem video.

Metadata chỉ là một tín hiệu nhỏ.

Nếu có reference:

có thể học:

- facts
- broad selling logic
- category clues

Không sao chép:

- wording
- exact hook
- exact scene chain
- exact blocking
- exact execution

==================================================
8. VISUAL ENGINE
==================================================

Visual phải giúp truyền tải sales argument.

Dùng linh hoạt:

- wide
- medium
- close-up
- macro
- POV
- top-down
- over-the-shoulder
- tracking
- handheld
- reveal
- product insert
- action shot
- environmental shot

Không phải cảnh nào cũng:
"người cầm sản phẩm nhìn camera".

Location có thể gồm:

- bedroom
- living room
- kitchen
- bathroom
- balcony
- street
- office
- studio
- shop
- cafe
- car
- dressing room

Nhưng location phải có logic.

==================================================
9. VOICEOVER
==================================================

Voiceover:

- nói như người thật
- ngắn
- dễ đọc
- có nhịp
- không văn quảng cáo cứng
- không cố giật gân
- không spam claim

==================================================
10. THỜI LƯỢNG
==================================================

15s:

ưu tiên 1 concept.

Khoảng 3 cảnh.

Không nhồi quá nhiều luận điểm.

30s:

khoảng 4-6 cảnh.

Có đủ:
hook → context/problem → demo/proof → payoff.

60s:

khoảng 7-10 cảnh.

Có thể kể story,
xử lý objection,
demo sâu hơn.

Không kéo dài script 15s bằng filler.

==================================================
11. CTA
==================================================

CTA phụ thuộc awareness.

Có thể:

- xem thử
- xem màu
- xem mẫu
- kiểm tra link
- lưu lại
- cân nhắc
- đặt hàng

Không mặc định "mua ngay".

==================================================
12. OUTPUT
==================================================

Chỉ trả JSON hợp lệ.

Không markdown.

Không giải thích ngoài JSON.

{
  "strategy": {
    "content_type": "",
    "target_customer": "",
    "awareness_stage": "",
    "core_desire": "",
    "pain_point": "",
    "objection": "",
    "sales_angle": "",
    "hook_mechanism": "",
    "structure": "",
    "visual_strategy": "",
    "reason": ""
  },

  "hook": "",

  "scenes": [
    {
      "scene_number": 1,
      "duration": "",
      "shot_type": "",
      "location": "",
      "action": "",
      "visual_prompt": "",
      "visual_prompt_vi": "",
      "voiceover": ""
    }
  ],

  "cta": ""
}
`;

// =========================================================
// API ROUTE
// =========================================================

export async function POST(req: Request) {
  try {
    const body: RequestBody =
      await req.json();

    const {
      message = "",
      product = "",
      userNote = "",
      referenceUrl = "",
      mode = "creative",
      recentScripts = [],
    } = body;

    const duration =
      normalizeDuration(
        body.duration
      );

    // =====================================================
    // 1. TIKTOK
    // =====================================================

    const tiktokUrl =
      referenceUrl ||
      extractTikTokUrl(message);

    let referenceData = "";

    if (tiktokUrl) {
      const tiktokResult =
        await fetchTiktokDataViaApi(
          tiktokUrl
        );

      if (
        tiktokResult.success &&
        tiktokResult.data
      ) {
        referenceData = `
TikTok URL:
${tiktokUrl}

TikTok metadata:

Caption/title:
${tiktokResult.data.title || "Không có"}

Creator:
${tiktokResult.data.author || "Không có"}

Duration:
${tiktokResult.data.duration || "Không rõ"}
`;
      }
    }

    // =====================================================
    // 2. HISTORY
    // =====================================================

    const recentContext =
      buildRecentScriptContext(
        recentScripts
      );

    const forbiddenIdeas =
      buildForbiddenIdeas(
        recentScripts
      );

    // =====================================================
    // 3. API KEY
    // =====================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

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

    // =====================================================
    // 4. MODELS
    // =====================================================

    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
    ];

    let lastError: any = null;

    let finalScript: any =
      null;

    let usedModel = "";

    let finalRoute:
      | CreativeRoute
      | null = null;

    let finalVariationSeed =
      0;

    // =====================================================
    // 5. DIVERSITY RETRY LOOP
    //
    // Nếu hook mới còn quá giống history:
    // backend tự regenerate.
    // =====================================================

    const MAX_CREATIVE_ATTEMPTS =
      recentScripts.length > 0
        ? 3
        : 1;

    for (
      let creativeAttempt = 0;
      creativeAttempt <
      MAX_CREATIVE_ATTEMPTS;
      creativeAttempt++
    ) {
      // ===================================================
      // ROUTE ROTATION
      //
      // Lần đầu history 0 -> route 0
      // lần 2 history 1 -> route 1
      // ...
      //
      // Retry cũng nhảy route tiếp theo.
      // ===================================================

      const routeIndex =
        (recentScripts.length +
          creativeAttempt) %
        CREATIVE_ROUTES.length;

      const selectedRoute =
        CREATIVE_ROUTES[
          routeIndex
        ];

      finalRoute =
        selectedRoute;

      const variationSeed =
        Math.floor(
          Math.random() *
            1_000_000_000
        );

      finalVariationSeed =
        variationSeed;

      // ===================================================
      // USER PROMPT
      // ===================================================

      const userPrompt = `
Tạo một kịch bản bán hàng MỚI cho Reelbo.

==================================================
REQUEST
==================================================

MODE:
${mode}

THỜI LƯỢNG:
${duration}

THÔNG TIN SẢN PHẨM DO USER CUNG CẤP:

${
  product.trim() ||
  "User không nhập field sản phẩm riêng."
}

THÔNG TIN REQUEST:

${
  message.trim() ||
  userNote.trim() ||
  "Không có mô tả thêm."
}

==================================================
REFERENCE
==================================================

${
  referenceData ||
  "Không có metadata reference."
}

CẢNH BÁO:

Nếu trên chỉ có metadata TikTok,
bạn CHƯA xem nội dung video.

Không được suy diễn rằng đã xem chuyển động,
lời thoại hoặc shot của video.

==================================================
CREATIVE ROUTE BẮT BUỘC
==================================================

CONTENT TYPE:
${selectedRoute.content_type}

SALES ANGLE:
${selectedRoute.angle}

HOOK MECHANISM:
${selectedRoute.hook}

NARRATIVE STRUCTURE:
${selectedRoute.structure}

PERSPECTIVE:
${selectedRoute.perspective}

VISUAL OPENING:
${selectedRoute.visual_opening}

Đây là creative route BẮT BUỘC.

Không được đổi sang angle khác
chỉ vì một concept khác quen thuộc hơn.

==================================================
LỊCH SỬ KỊCH BẢN
==================================================

${recentContext}

==================================================
Ý TƯỞNG / HOOK ĐÃ DÙNG — CẤM LẶP
==================================================

${forbiddenIdeas}

CẤM cả:

- copy nguyên văn
- paraphrase
- cùng joke
- cùng premise
- cùng semantic meaning

Ví dụ nếu lịch sử có premise
"tuổi thiếu nhi → tuổi thiếu tiền"

thì mọi câu mang logic
"lớn lên → thiếu tiền"
đều bị coi là LẶP.

Phải nghĩ một premise khác hoàn toàn.

==================================================
DIVERSITY RETRY
==================================================

Creative attempt:
${creativeAttempt + 1}

Variation seed:
${variationSeed}

${
  creativeAttempt > 0
    ? `
Kịch bản trước trong chính request này
đã bị backend đánh giá là QUÁ GIỐNG lịch sử.

Ở lần này bắt buộc phải đổi insight,
hook premise và opening scene mạnh hơn.
`
    : ""
}

==================================================
NHIỆM VỤ
==================================================

1. Phân tích sản phẩm.
2. Tuân thủ creative route bắt buộc.
3. Loại bỏ các semantic premise đã dùng.
4. Viết một concept thực sự mới.
5. Tạo số cảnh phù hợp ${duration}.
6. Tổng duration phải hợp lý.
7. Trả đúng JSON schema.
`;

      let responseText = "";

      // ===================================================
      // MODEL FALLBACK
      // ===================================================

      for (
        const modelName of
        candidateModels
      ) {
        try {
          console.log(
            `[Reelbo] Creative attempt ${
              creativeAttempt + 1
            } | Trying ${modelName}`
          );

          const response =
            await ai.models.generateContent({
              model: modelName,

              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text: userPrompt,
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
            });

          const text =
            response.text || "";

          if (text.trim()) {
            responseText =
              text.trim();

            usedModel =
              modelName;

            break;
          }
        } catch (error: any) {
          lastError =
            error;

          const status =
            error?.status ||
            error?.response?.status;

          const errorMessage =
            error?.message || "";

          console.warn(
            `[Reelbo] ${modelName} failed`,
            status,
            errorMessage
          );

          const shouldFallback =
            status === 404 ||
            status === 408 ||
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504 ||
            /timeout/i.test(
              errorMessage
            ) ||
            /overloaded/i.test(
              errorMessage
            ) ||
            /unavailable/i.test(
              errorMessage
            );

          if (
            status &&
            !shouldFallback
          ) {
            throw error;
          }
        }
      }

      if (!responseText) {
        continue;
      }

      // ===================================================
      // PARSE JSON
      // ===================================================

      let parsedScript: any;

      try {
        parsedScript =
          JSON.parse(
            responseText
          );
      } catch {
        const jsonMatch =
          responseText.match(
            /\{[\s\S]*\}/
          );

        if (!jsonMatch) {
          console.warn(
            "[Reelbo] Không tìm thấy JSON hợp lệ."
          );

          continue;
        }

        parsedScript =
          JSON.parse(
            jsonMatch[0]
          );
      }

      // ===================================================
      // VALIDATION
      // ===================================================

      if (
        !parsedScript
          ?.strategy ||
        !Array.isArray(
          parsedScript?.scenes
        ) ||
        parsedScript.scenes
          .length === 0
      ) {
        console.warn(
          "[Reelbo] Output thiếu strategy/scenes."
        );

        continue;
      }

      // ===================================================
      // BACKEND DUPLICATE CHECK
      // ===================================================

      const tooSimilar =
        isTooSimilarToHistory(
          parsedScript,
          recentScripts
        );

      if (
        tooSimilar &&
        creativeAttempt <
          MAX_CREATIVE_ATTEMPTS -
            1
      ) {
        console.warn(
          "[Reelbo] Hook quá giống lịch sử. Regenerating..."
        );

        continue;
      }

      finalScript =
        parsedScript;

      break;
    }

    // =====================================================
    // KHÔNG TẠO ĐƯỢC
    // =====================================================

    if (!finalScript) {
      throw (
        lastError ||
        new Error(
          "AI chưa tạo được kịch bản đủ khác biệt. Vui lòng thử lại."
        )
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json({
      script: finalScript,

      meta: {
        model:
          usedModel,

        duration,

        variation_seed:
          finalVariationSeed,

        creative_route:
          finalRoute,

        history_count:
          recentScripts.length,
      },
    });
  } catch (error: any) {
    console.error(
      "Reelbo Script API Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Không thể tạo kịch bản AI.",
      },
      {
        status: 500,
      }
    );
  }
}