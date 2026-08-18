import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: Request) {
  let tempFilePath = "";

  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Thiếu videoUrl." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    // =====================================================
    // 1. TẢI VIDEO THẬT VỀ SERVER
    // =====================================================
    const videoRes = await fetch(videoUrl, { cache: "no-store" });

    if (!videoRes.ok) {
      return NextResponse.json(
        { error: `Không tải được video mẫu: ${videoRes.status}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    tempFilePath = path.join(os.tmpdir(), `reelbo-${Date.now()}.mp4`);
    await fs.writeFile(tempFilePath, buffer);

    // =====================================================
    // 2. GEMINI CLIENT
    // =====================================================
    const ai = new GoogleGenAI({ apiKey });

    // =====================================================
    // 3. UPLOAD VIDEO LÊN GEMINI FILES API
    // =====================================================
    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadedFile.name || !uploadedFile.uri) {
      throw new Error("Gemini upload video thất bại.");
    }

    // =====================================================
    // 4. ĐỢI GEMINI XỬ LÝ VIDEO
    // =====================================================
    let file = uploadedFile;

    for (let i = 0; i < 30; i++) {
      if (file.state !== "PROCESSING") break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      file = await ai.files.get({ name: uploadedFile.name });
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini không xử lý được video mẫu.");
    }

    if (file.state === "PROCESSING") {
      throw new Error("Gemini xử lý video quá lâu. Vui lòng thử lại.");
    }

    // =====================================================
    // 5. PROMPT PHÂN TÍCH VIDEO (ĐÃ NÂNG CẤP)
    // =====================================================
    const analysisPrompt = `
Bạn đang xem VIDEO MẪU THẬT.

Nhiệm vụ của bạn là phân tích chính xác nội dung video để một hệ thống AI Video khác (Minimax) có thể tạo lại kịch bản, góc quay mới nhưng GIỮ NGUYÊN visual của sản phẩm và nhân vật.

Chỉ trả JSON hợp lệ.

Schema:
{
  "product_guess": "",
  "product_visual_detail": "", 
  "character_description": "", 
  "transcript": "",
  "hook": "",
  "sales_logic": "",
  "pacing": "",
  "video_summary": "",
  "scenes": [
    {
      "scene_number": 1,
      "start_time": "",
      "end_time": "",
      "action": "",
      "shot_type": "",
      "camera_movement": "",
      "location": "",
      "product_visible": true,
      "spoken_content": ""
    }
  ]
}

YÊU CẦU:

1. PRODUCT & VISUAL (QUAN TRỌNG NHẤT)
- product_guess: Tên chính xác của sản phẩm. Nếu không rõ, ghi "không rõ".
- product_visual_detail: Mô tả CỰC KỲ CHI TIẾT ngoại hình sản phẩm (Màu sắc, kiểu dáng, chất liệu, logo, kích thước tương đối). Đây là mỏ neo để hệ thống sinh video không làm biến dạng sản phẩm.
- character_description: Mô tả chi tiết ngoại hình, trang phục, kiểu tóc của nhân vật chính (nếu có).

2. TRANSCRIPT
- Ghi lại sát lời nói thực tế trong video. Không tự viết lại.
- Nếu nghe không rõ, ghi "[không rõ]".

3. SCENE ANALYSIS
Với từng cảnh hãy xác định:
- start_time, end_time
- action (người/vật đang làm gì)
- shot_type, camera_movement, location
- product_visible (true/false)
- spoken_content (lời nói trong cảnh)

4. HOOK & SALES LOGIC
- Hook phải là hook THỰC SỰ của video, không sáng tác.
- Mô tả logic bán hàng thực tế (ví dụ: problem → demo → benefit → CTA).

5. VIDEO SUMMARY
Tóm tắt ngắn nội dung video thực sự diễn ra. Không suy đoán ngoài dữ liệu video.
`;

    // =====================================================
    // 6. MODEL FALLBACK (GIỮ NGUYÊN CƠ CHẾ CỦA BẠN)
    // =====================================================
    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ];

    let responseText = "";
    let usedModel = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Reelbo Video Analyzer] Trying ${modelName}...`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  fileData: {
                    fileUri: file.uri!,
                    mimeType: file.mimeType || "video/mp4",
                  },
                },
                { text: analysisPrompt },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text || "";

        if (text.trim()) {
          responseText = text.trim();
          usedModel = modelName;
          console.log(`[Reelbo Video Analyzer] Thành công bằng ${modelName}`);
          break;
        }
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const errorMessage = error?.message || "";

        console.warn(`[Reelbo Video Analyzer] ${modelName} failed`, status, errorMessage);

        const shouldFallback =
          status === 404 || status === 408 || status === 429 ||
          status === 500 || status === 502 || status === 503 || status === 504 ||
          /timeout/i.test(errorMessage) || /overloaded/i.test(errorMessage) ||
          /unavailable/i.test(errorMessage) || /high demand/i.test(errorMessage);

        if (status && !shouldFallback) {
          throw error;
        }
      }
    }

    // =====================================================
    // 7. KHÔNG MODEL NÀO THÀNH CÔNG
    // =====================================================
    if (!responseText) {
      throw (lastError || new Error("Các model Gemini phân tích video hiện không phản hồi."));
    }

    // =====================================================
    // 8. PARSE JSON
    // =====================================================
    let analysis: any;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Gemini không trả JSON video hợp lệ.");
      }
      analysis = JSON.parse(jsonMatch[0]);
    }

    // =====================================================
    // 9. BASIC VALIDATION
    // =====================================================
    if (!analysis || !Array.isArray(analysis.scenes)) {
      throw new Error("Video Analyzer trả dữ liệu thiếu scenes.");
    }

    // =====================================================
    // 10. SUCCESS
    // =====================================================
    return NextResponse.json({
      success: true,
      analysis,
      meta: {
        model: usedModel,
      },
    });
  } catch (error: any) {
    console.error("Analyze video error:", error);
    return NextResponse.json(
      { error: "Không thể phân tích video mẫu: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  } finally {
    // =====================================================
    // 11. XÓA FILE TẠM
    // =====================================================
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }
  }
}
