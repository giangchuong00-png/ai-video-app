import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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

// THƯ VIỆN ĐA DẠNG CHIẾN LƯỢC TÂM LÝ & GÓC NHÌN BÁN HÀNG
const CREATIVE_ROUTES: CreativeRoute[] = [
  {
    content_type: "problem solution",
    angle: "pain point",
    hook: "specific pain",
    structure: "problem → tension → solution → payoff",
    perspective: "người trực tiếp gặp vấn đề",
    visual_opening: "mở bằng cảnh giải quyết vấn đề tại phòng khách hoặc bàn làm việc",
  },
  {
    content_type: "bóc phốt / cảnh báo",
    angle: "warning",
    hook: "cảnh báo sai lầm khi mua hàng",
    structure: "shocking mistake → proof → right way → product",
    perspective: "chuyên gia bóc tách sự thật",
    visual_opening: "KOC cầm sản phẩm trước gương studio, biểu cảm ngạc nhiên",
  },
  {
    content_type: "so sánh thực chiến",
    angle: "comparison",
    hook: "so sánh 50k vs 500k",
    structure: "side by side → testing → verdict",
    perspective: "người thử nghiệm khách quan",
    visual_opening: "đặt 2 phiên bản trên mặt bàn gỗ ánh sáng tự nhiên",
  },
  {
    content_type: "xả kho bí mật",
    angle: "urgency deal",
    hook: "bí mật nhà sản xuất không nói",
    structure: "insider leak → proof → huge value → CTA",
    perspective: "người săn deal kỳ cựu",
    visual_opening: "KOC đang khui hộp hàng tại quầy bếp hiện đại",
  },
  {
    content_type: "lifestyle POV",
    angle: "identity",
    hook: "1 ngày của người bận rộn",
    structure: "routine → friction → smart product → payoff",
    perspective: "góc nhìn thứ nhất của người dùng",
    visual_opening: "POV hai bàn tay tương tác sản phẩm trong quán cafe sang trọng",
  },
  {
    content_type: "challenge / test độ bền",
    angle: "extreme demo",
    hook: "thử thách không tưởng",
    structure: "challenge → harsh test → surprise result → CTA",
    perspective: "người kiểm chứng chất lượng",
    visual_opening: "cận cảnh test sản phẩm trên nền ban công nhiều ánh sáng",
  },
  {
    content_type: "tâm sự trải lòng",
    angle: "emotional connection",
    hook: "suýt mất tiền oan vì không biết món này sớm",
    structure: "regret → discovery → transformation",
    perspective: "người dùng chân thành",
    visual_opening: "KOC ngồi tại góc đọc sách ấm cúng, chia sẻ trực diện",
  }
];

function normalizeDuration(duration?: string): "15s" | "30s" | "60s" {
  if (duration === "30s") return "30s";
  if (duration === "60s") return "60s";
  return "15s";
}

const SYSTEM_PROMPT = `
Bạn là REELBO SCRIPT ENGINE - Hệ thống viết kịch bản video TikTok Shop triệu view.

==================================================
1. QUY TẮC CỐT LÕI (BẮT BUỘC ĐỔI MỚI TOÀN DIỆN)
==================================================
- Khi phân tích video mẫu: GIỮ NGUYÊN thông tin cốt lõi của sản phẩm (tính năng, ưu điểm).
- NHƯNG BẮT BUỘC PHẢI ĐỔI MỚI TOÀN BỘ VISUAL:
  + Đổi bối cảnh không gian: Nếu mẫu ngồi bàn thì kịch bản mới cho KOC đứng cạnh cửa sổ, ban công, phòng khách hoặc studio.
  + Đổi góc máy và ánh sáng: Tạo góc nhìn mới (POV, Close-up, Top-down).
- CẤM sao chép nguyên văn câu từ của video mẫu.

==================================================
2. QUY TẮC AN TOÀN VISUAL (NO-LEGS RULE)
==================================================
- TUYỆT ĐỐI KHÔNG miêu tả cảnh toàn thân thấy chân hoặc bước đi.
- MỌI cảnh KOC chỉ được miêu tả: "Medium shot" (từ đùi/hông trở lên) hoặc "Close-up" (cận cảnh khuôn mặt, biểu cảm).
- Cảnh sản phẩm: "Macro view", "Hai bàn tay cầm sản phẩm", "Ánh sáng studio 35mm".

==================================================
3. CẤU TRÚC JSON ĐẦU RA
==================================================
Chỉ trả JSON thuần túy:
{
  "strategy": {
    "content_type": "",
    "sales_angle": "",
    "structure": "",
    "visual_strategy": ""
  },
  "hook": "",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "4s",
      "shot_type": "medium shot",
      "location": "studio / living room",
      "action": "",
      "visual_prompt": "Prompt tiếng Anh điện ảnh 35mm không lấy chân",
      "visual_prompt_vi": "Mô tả tiếng Việt chi tiết",
      "voiceover": "Lời thoại tự nhiên hấp dẫn"
    }
  ],
  "cta": ""
}
`;

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { message = "", product = "", referenceUrl = "", recentScripts = [] } = body;
    const duration = normalizeDuration(body.duration);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Thiếu GEMINI_API_KEY." }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey });

    const routeIndex = (recentScripts.length + Math.floor(Math.random() * 5)) % CREATIVE_ROUTES.length;
    const selectedRoute = CREATIVE_ROUTES[routeIndex];

    const userPrompt = `
Tạo kịch bản bán hàng TikTok MỚI cho Reelbo.
THỜI LƯỢNG: ${duration}
SẢN PHẨM: ${product || "Sản phẩm TikTok Shop"}
DỮ LIỆU ĐẦU VÀO / VIDEO MẪU: ${message}
CHIẾN LƯỢC ÁP DỤNG: ${selectedRoute.content_type} (Góc nhìn: ${selectedRoute.angle})
BỐI CẢNH MỞ ĐẦU YÊU CẦU: ${selectedRoute.visual_opening}

Hãy đổi mới hoàn toàn góc quay, không gian phòng, chỉ lấy từ hông trở lên (No-legs rule).
`;

    const candidateModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    let responseText = "";

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        });
        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch {}
    }

    if (!responseText) throw new Error("Gemini không phản hồi kịch bản.");

    const parsedScript = JSON.parse(responseText.replace(/```json|```/g, "").trim());

    return NextResponse.json({
      script: parsedScript,
    });
  } catch (error: any) {
    console.error("Script API Error:", error);
    return NextResponse.json({ error: "Lỗi tạo kịch bản: " + error.message }, { status: 500 });
  }
}
