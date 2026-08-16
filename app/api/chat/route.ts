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

  // Chuẩn bị cho frontend V2
  product?: string;
  userNote?: string;
  referenceUrl?: string;
  mode?: "creative" | "motion";
  recentScripts?: RecentScript[];
};

// =========================================================
// TIKTOK METADATA
// Hiện tại vẫn chỉ lấy metadata.
// Sau này sẽ nâng cấp thành Media Analyzer thật.
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
      throw new Error(
        `TikWM HTTP ${response.status}`
      );
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

  const match = text.match(regex);

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
- Hook: ${item.hook || "N/A"}
- Sales angle: ${
        item.sales_angle || "N/A"
      }
- Structure: ${
        item.structure || "N/A"
      }
- Content type: ${
        item.content_type || "N/A"
      }
`;
    })
    .join("\n");
}

// =========================================================
// SYSTEM PROMPT
// =========================================================

const SYSTEM_PROMPT = `
Bạn là REELBO SCRIPT ENGINE.

Bạn không phải một AI chỉ viết caption hoặc tạo
một template TikTok duy nhất.

Bạn là một hệ thống chiến lược nội dung bán hàng,
có nhiệm vụ phân tích input, tự lựa chọn chiến lược,
sau đó mới tạo kịch bản.

MỤC TIÊU:

Tạo video bán hàng ngắn có:
- hook mạnh nhưng không rập khuôn
- lời thoại tự nhiên
- visual có mục đích
- góc bán hàng đa dạng
- phù hợp ngành hàng
- phù hợp thời lượng
- tránh lặp ý tưởng giữa các lần tạo

==================================================
1. NGUYÊN TẮC CỐT LÕI
==================================================

Không được hoạt động như template writer.

Không mặc định dùng:
- "Mọi người ơi..."
- "Bạn có biết..."
- "Nếu bạn đang..."
- "Đừng mua..."
- "Trời ơi..."
- "Không ngờ..."
- "Đây là..."

Chỉ dùng nếu thật sự phù hợp.

Không được tạo biến thể bằng cách chỉ thay
vài từ đồng nghĩa.

Mỗi kịch bản mới phải khác ở cấp chiến lược.

==================================================
2. PHÂN TÍCH INPUT
==================================================

Tự xác định:

- sản phẩm/dịch vụ
- ngành hàng
- khách hàng tiềm năng
- nhu cầu chính
- nỗi đau
- mong muốn
- objection
- buying trigger
- điểm đáng khai thác
- mức độ nhận thức của người xem

Awareness có thể là:

- unaware
- problem aware
- solution aware
- product aware
- ready to buy

Nếu dữ liệu thiếu:
không hỏi user ngay.
Hãy suy luận hợp lý từ context.

Không được tự bịa:
- giá
- ưu đãi
- chứng nhận
- thành phần
- claim y tế
- thông số kỹ thuật

==================================================
3. STRATEGY ENGINE
==================================================

TRƯỚC KHI VIẾT KỊCH BẢN,
phải tự chọn một chiến lược.

CONTENT TYPE có thể gồm:

- direct response
- UGC review
- KOC recommendation
- demo
- problem solution
- mini story
- comparison
- before after
- lifestyle
- testimonial
- educational selling
- objection handling
- product discovery
- unboxing
- scenario
- challenge
- social proof
- routine
- transformation
- listicle
- confession
- POV

SALES ANGLE có thể gồm:

- pain
- desire
- convenience
- saving time
- saving money
- value
- premium feeling
- social proof
- curiosity
- transformation
- mistake
- problem solving
- hidden benefit
- ease of use
- emotional payoff
- confidence
- comfort
- aesthetics
- productivity
- comparison
- objection
- unexpected use
- scarcity
- habit
- identity
- lifestyle
- result
- experience

HOOK MECHANISM có thể gồm:

- visual result first
- curiosity gap
- specific pain
- relatable situation
- demonstration first
- objection
- surprising comparison
- confession
- strong opinion
- pattern interrupt
- challenge
- mistake
- before after
- social proof
- direct benefit
- scenario
- contradiction
- question
- observation
- product reveal
- price value reveal

STRUCTURE có thể gồm:

- hook → demo → payoff → CTA
- hook → problem → solution → CTA
- hook → scenario → discovery → payoff
- result → explanation → demo → CTA
- pain → agitation → solution → proof
- before → process → after
- objection → proof → recommendation
- story → tension → product → result
- visual reveal → benefit → proof
- problem → mistake → better method
- routine → product integration → outcome

Không chọn ngẫu nhiên vô nghĩa.
Chọn tổ hợp phù hợp với sản phẩm và khách hàng.

==================================================
4. ANTI-REPETITION
==================================================

Nếu có danh sách kịch bản gần đây:

KHÔNG lặp lại đồng thời:
- hook mechanism
- sales angle
- narrative structure
- opening visual
- CTA pattern

Ưu tiên chọn một nhánh chiến lược chưa dùng.

Nếu bắt buộc dùng lại angle,
phải thay:
- perspective
- hook
- visual opening
- structure
hoặc
- emotional trigger

==================================================
5. THỜI LƯỢNG
==================================================

15 GIÂY:

Chỉ nên có 1 ý tưởng chính.

Ưu tiên:
Hook
→ Demo/Proof
→ Payoff
→ CTA

Khoảng 3 cảnh.

30 GIÂY:

Có thể:
Hook
→ Context/Problem
→ Demo/Solution
→ Benefit/Proof
→ CTA

Khoảng 4-6 cảnh.

60 GIÂY:

Có thể:
Hook
→ Context
→ Problem/Tension
→ Discovery
→ Demo
→ Proof
→ Objection
→ Payoff
→ CTA

Khoảng 7-10 cảnh.

Không được lấy script 15s rồi kéo dài câu chữ
để thành 30s/60s.

==================================================
6. VIDEO / LINK MẪU
==================================================

Nếu có dữ liệu reference:

Phân biệt:

FACTS:
- sản phẩm
- thông tin thật
- lợi ích được cung cấp

STRATEGY:
- insight
- hook mechanism
- sales logic
- pacing
- emotional progression

EXECUTION:
- wording
- shot order
- camera
- setting
- blocking
- performance

Có thể học FACTS và STRATEGY.

Không sao chép nguyên execution
hoặc shot-by-shot.

Không dùng khái niệm "khác 80%" hoặc "khác 90%"
như một phép đo.

Thay vào đó:
tạo execution mới có:
- bối cảnh mới
- camera mới
- blocking mới
- cách demo mới
- lời thoại mới
- visual opening mới

nhưng vẫn giữ logic bán hàng hữu ích.

==================================================
7. VISUAL ENGINE
==================================================

Visual phải làm nhiệm vụ bán hàng.

Không lặp kiểu:
"cô gái cầm sản phẩm nhìn camera"
ở mọi cảnh.

Đa dạng shot:

- wide
- medium
- close-up
- macro
- POV
- top-down
- over-the-shoulder
- tracking
- handheld
- product insert
- reveal
- action shot
- environmental shot

Đa dạng location khi hợp lý:

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

Không đổi bối cảnh chỉ để khác.
Bối cảnh phải phù hợp sản phẩm.

==================================================
8. VOICEOVER
==================================================

Voiceover phải:

- nghe như người thật nói
- câu tương đối ngắn
- có nhịp
- tự nhiên
- không quá quảng cáo
- phù hợp đối tượng
- không spam emoji
- không cố giật gân

Không nói những claim không có trong dữ liệu.

==================================================
9. CTA
==================================================

CTA phải phù hợp stage của người xem.

Không phải video nào cũng:
"Mua ngay".

Có thể:
- xem sản phẩm
- thử xem
- xem màu
- kiểm tra ưu đãi
- lưu lại
- xem link
- cân nhắc
- đặt hàng
- thử phiên bản phù hợp

==================================================
10. OUTPUT
==================================================

Chỉ trả JSON hợp lệ.

Không markdown.
Không giải thích ngoài JSON.

Schema:

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
      mode = "creative",
      recentScripts = [],
    } = body;

    const duration =
      normalizeDuration(
        body.duration
      );

    // =====================================================
    // 1. XÁC ĐỊNH LINK TIKTOK
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
- Caption/title:
${tiktokResult.data.title || "Không có"}

- Creator:
${tiktokResult.data.author || "Không có"}

- Duration:
${tiktokResult.data.duration || "Không rõ"}
`;
      }
    }

    // =====================================================
    // 2. CREATIVE VARIATION SEED
    // =====================================================

    const variationSeed =
      Math.floor(
        Math.random() * 1_000_000_000
      );

    // =====================================================
    // 3. RECENT HISTORY
    // =====================================================

    const recentContext =
      buildRecentScriptContext(
        recentScripts
      );

    // =====================================================
    // 4. USER PROMPT
    // =====================================================

    const userPrompt = `
Hãy tạo một kịch bản mới cho Reelbo.

==================================================
REQUEST
==================================================

MODE:
${mode}

THỜI LƯỢNG:
${duration}

THÔNG TIN SẢN PHẨM:
${
  product.trim() ||
  "Không có field sản phẩm riêng."
}

THÔNG TIN / YÊU CẦU USER:
${
  message.trim() ||
  userNote.trim() ||
  "Không có mô tả thêm."
}

GHI CHÚ THÊM:
${userNote.trim() || "Không có"}

==================================================
REFERENCE DATA
==================================================

${
  referenceData ||
  "Không có dữ liệu reference."
}

LƯU Ý:
Metadata TikTok KHÔNG đồng nghĩa với việc
đã xem nội dung video.

Không được tuyên bố rằng bạn đã xem video
nếu request này chỉ chứa caption/title.

==================================================
KỊCH BẢN GẦN ĐÂY
==================================================

${recentContext}

==================================================
CREATIVE VARIATION
==================================================

Variation seed:
${variationSeed}

Seed chỉ là tín hiệu để chọn một nhánh
ý tưởng khác, không được xuất seed cho user.

Hãy:
1. phân tích input
2. chọn strategy
3. kiểm tra strategy không quá giống lịch sử
4. tạo script
5. đảm bảo tổng scene duration phù hợp ${duration}
6. trả đúng JSON schema
`;

    // =====================================================
    // 5. API KEY
    // =====================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Thiếu GEMINI_API_KEY.",
        },
        { status: 500 }
      );
    }

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    // =====================================================
    // 6. MODEL FALLBACK
    // =====================================================

    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
    ];

    let responseText = "";
    let lastError: any = null;
    let usedModel = "";

    for (
      const modelName of
      candidateModels
    ) {
      try {
        console.log(
          `[Reelbo] Trying ${modelName}`
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

          console.log(
            `[Reelbo] Success: ${modelName}`
          );

          break;
        }
      } catch (error: any) {
        lastError = error;

        const status =
          error?.status ||
          error?.response?.status;

        const message =
          error?.message || "";

        console.warn(
          `[Reelbo] ${modelName} failed`,
          status,
          message
        );

        // Những lỗi có khả năng model khác xử lý được.
        const shouldFallback =
          status === 404 ||
          status === 408 ||
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          /timeout/i.test(message) ||
          /overloaded/i.test(message) ||
          /unavailable/i.test(message);

        // Lỗi request/config sai thì model khác
        // thường cũng không cứu được.
        if (
          status &&
          !shouldFallback
        ) {
          throw error;
        }
      }
    }

    if (!responseText) {
      throw (
        lastError ||
        new Error(
          "Các model Gemini hiện không phản hồi."
        )
      );
    }

    // =====================================================
    // 7. PARSE JSON
    // =====================================================

    let parsedScript;

    try {
      parsedScript =
        JSON.parse(responseText);
    } catch {
      const jsonMatch =
        responseText.match(
          /\{[\s\S]*\}/
        );

      if (!jsonMatch) {
        throw new Error(
          "Gemini không trả JSON hợp lệ."
        );
      }

      parsedScript =
        JSON.parse(
          jsonMatch[0]
        );
    }

    // =====================================================
    // 8. BASIC VALIDATION
    // =====================================================

    if (
      !parsedScript?.strategy ||
      !Array.isArray(
        parsedScript?.scenes
      )
    ) {
      throw new Error(
        "AI trả output thiếu strategy hoặc scenes."
      );
    }

    return NextResponse.json({
      script: parsedScript,

      meta: {
        model: usedModel,
        variation_seed:
          variationSeed,
        duration,
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
      { status: 500 }
    );
  }
}