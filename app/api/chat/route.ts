import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, duration } = await req.json();

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let sceneCount = 3;
    if (duration === "30s") sceneCount = 5;
    if (duration === "60s") sceneCount = 9;

    // 🏆 UNIVERSAL CONTENT ENGINE PROMPT (GIỮ NGUYÊN 100% TƯ DUY CỦA BẠN)
    const systemPrompt = `
SYSTEM PROMPT — UNIVERSAL CONTENT ENGINE
Bạn là AI Content Strategist & Scriptwriter chuyên sâu. Nhiệm vụ: Biến mọi sản phẩm, dịch vụ hoặc chủ đề "${message}" thành content thu hút đúng người xem, giúp họ dừng lại, hiểu giá trị, tin tưởng và hành động. Mỗi case là một chiến lược mới.

1. NGUYÊN TẮC CỐT LÕI: Xác định ngầm Sản phẩm, Khách hàng, Nỗi đau, Mức độ nhận thức, Lợi ích cốt lõi & CTA.
2. KHÔNG DÙNG MỘT CÔNG THỨC CỐ ĐỊNH: Chọn góc mạnh nhất (Pain, Desire, Curiosity, Loss, Gain, Proof, Objection, Comparison, Mistake, Education, Story, Demo, Contrarian).
3. HOOK: Thấy đúng vấn đề, tò mò, muốn xem tiếp. Tránh mở đầu chung chung "Bạn có biết...", "Hôm nay mình sẽ...".
4. CUSTOMER PSYCHOLOGY: Luôn chuyển Tính năng -> Lợi ích -> Ý nghĩa thực tế. Trả lời câu hỏi "Vậy thì sao?".
5. SPECIFICITY & NGÔN NGỮ: Ngắn, tự nhiên, 1 câu = 1 ý, giống cách nói thật. Tránh từ sáo rỗng "siêu phẩm", "đột phá".
6. CẤM: Không bịa số liệu/review/kết quả không cơ sở. Không spam keyword, không dùng framework cứng.
7. LOGIC GIÁ CẢ: Với sản phẩm điện máy/gia dụng/giá trị cao, KHÔNG so sánh giá với "2 ly trà sữa/bát phở".
8. YÊU CẦU ĐỊNH DẠNG DỮ LIỆU:
   - Tạo chính xác đúng ${sceneCount} phân cảnh cho thời lượng ${duration}.
   - visual_prompt: Mô tả góc máy, ánh sáng, bối cảnh bằng TIẾNG ANH chi tiết cho AI Video Generator.
   - visual_prompt_vi: Mô tả hình ảnh, hành động thực tế bằng TIẾNG VIỆT.
   - voiceover: Lời thoại KOC/thuyết minh tự nhiên bằng TIẾNG VIỆT.
`;

    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_number: { type: Type.INTEGER },
                duration: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
                visual_prompt_vi: { type: Type.STRING },
                voiceover: { type: Type.STRING },
              },
              required: ["scene_number", "duration", "visual_prompt", "visual_prompt_vi", "voiceover"],
            },
          },
        },
        required: ["scenes"],
      },
    };

    const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Đang gọi Gemini API với model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: schemaConfig,
        });
        if (response) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("Tất cả các model Gemini đều không phản hồi.");
    }

    const responseText = response?.text || "";
    let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const scriptData = JSON.parse(cleanJson);

    return NextResponse.json({ script: scriptData });
  } catch (error: any) {
    console.error("Lỗi API Chat:", error);
    return NextResponse.json(
      { error: "Lỗi tạo kịch bản: " + (error.message || "Unknown Error") },
      { status: 500 }
    );
  }
}