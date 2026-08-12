import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Hàm gọi TikWM API giải mã mọi loại link TikTok (kể cả vt.tiktok.com)
async function fetchTiktokDataViaApi(tiktokUrl: string) {
  try {
    const response = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({
        url: tiktokUrl,
        count: "12",
        cursor: "0",
        web: "1",
        hd: "1",
      }),
    });

    const result = await response.json();

    if (result && result.code === 0 && result.data) {
      const title = result.data.title || "";
      const author = result.data.author?.nickname || "";
      
      return {
        success: true,
        text: `Tiêu đề/Mô tả video gốc: "${title}". KOC/KOL: ${author}`,
      };
    }
    
    return { success: false, text: "" };
  } catch (error) {
    console.error("Lỗi khi gọi API TikWM:", error);
    return { success: false, text: "" };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, duration } = body;

    let extractedData = "";

    // 1. Tự động tìm link TikTok trong tin nhắn/URL người dùng dán vào
    const tiktokUrlRegex = /(https?:\/\/[^\s]+tiktok\.com[^\s]+)/gi;
    const matchedUrls = message.match(tiktokUrlRegex);

    if (matchedUrls && matchedUrls.length > 0) {
      const tiktokUrl = matchedUrls[0];
      const scrapedResult = await fetchTiktokDataViaApi(tiktokUrl);
      
      if (scrapedResult.success && scrapedResult.text) {
        extractedData = `\n[THÔNG TIN BÓC TÁCH TỪ TIKWM API]: ${scrapedResult.text}`;
      }
    }

    // 2. Tạo Prompt điều khiển AI "Sáng tạo lại 90%" kịch bản
    const systemPrompt = `
Bạn là một Chuyên gia Viết Kịch Bản Video Ngắn TikTok/Reels Affiliate triệu view.
Nhiệm vụ của bạn: Dựa trên thông tin sản phẩm/link đối thủ được cung cấp, hãy SÁNG TẠO LẠI 90% KỊCH BẢN MỚI.

[QUY TẮC RE-CREATE 90% - KHÔNG NHÁI 100%]:
1. GIỮ LẠI (10%): Tên sản phẩm, tính năng cốt lõi, giá tiền/ưu đãi chính xác.
2. SÁNG TẠO MỚI (90%): 
   - Thay đổi hoàn toàn Lời thoại (Voiceover): Dùng văn phong giật gân mới, câu từ tự nhiên, thu hút hơn.
   - Thay đổi Góc quay (Visual Prompt): AI tự đề xuất các góc quay KOC biến thể hoàn toàn mới.
   - Đảm bảo video KHÔNG BAO GIỜ bị TikTok quét dính bản quyền hoặc trùng lặp nội dung.

[Mô tả từ người dùng / Dữ liệu link đối thủ]: ${message} ${extractedData}
[Thời lượng video yêu cầu]: ${duration || "15s"}

[YÊU CẦU ĐẦU RA]: Bắt buộc trả về đúng định dạng JSON thuần túy (không chứa markdown \`\`\`json) theo cấu trúc:
{
  "scenes": [
    {
      "scene_number": 1,
      "duration": "5s",
      "visual_prompt": "Mô tả hình ảnh bằng tiếng Anh cho AI render video",
      "visual_prompt_vi": "Mô tả hình ảnh bằng tiếng Việt cho người dùng xem",
      "voiceover": "Lời thoại KOC giật gân, sáng tạo mới 100%"
    }
  ]
}
    `;

    // 3. Gọi Gemini API với các mô hình thế hệ 2.5 và 2.0
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu API Key cho AI Chat" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Khai báo danh sách các mô hình chuẩn
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
    let responseText = "";
    let apiError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(systemPrompt);
        const resText = result.response.text();

        if (resText && resText.trim().length > 0) {
          responseText = resText;
          break; // Đã lấy được dữ liệu thành công
        }
      } catch (err) {
        apiError = err;
        console.warn(`Lỗi khi gọi model ${modelName}, đang thử model tiếp theo...`);
      }
    }

    if (!responseText) {
      throw apiError || new Error("Không thể khởi tạo kịch bản từ các model Gemini.");
    }

    // Trích xuất chuỗi JSON an toàn
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsedScript = JSON.parse(jsonString);

    return NextResponse.json({ script: parsedScript });
  } catch (error: any) {
    console.error("Lỗi API Chat:", error);
    return NextResponse.json(
      { error: error.message || "Không thể khởi tạo kịch bản xào lại 90%." },
      { status: 500 }
    );
  }
}