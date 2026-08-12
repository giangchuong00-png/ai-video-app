import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Hàm hỗ trợ giải mã link rút gọn TikTok (vt.tiktok.com -> full URL)
async function expandTiktokUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    return res.url || shortUrl;
  } catch (err) {
    return shortUrl;
  }
}

// Hàm hỗ trợ bóc tách thông tin tiêu đề/mô tả từ link TikTok công khai
async function fetchTiktokMetadata(url: string) {
  try {
    const fullUrl = await expandTiktokUrl(url);
    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();

    // Lấy nội dung trong thẻ <title> hoặc <meta name="description">
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/i);

    const title = titleMatch ? titleMatch[1] : "";
    const description = descMatch ? descMatch[1] : "";

    return `${title}${description}`.trim();
  } catch (error) {
    console.error("Lỗi cào dữ liệu TikTok:", error);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, duration } = body;

    let extractedData = "";

    // 1. Kiểm tra xem người dùng có truyền link TikTok hay không
    const tiktokUrlRegex = /(https?:\/\/[^\s]+tiktok\.com[^\s]+)/gi;
    const matchedUrls = message.match(tiktokUrlRegex);

    if (matchedUrls && matchedUrls.length > 0) {
      const tiktokUrl = matchedUrls[0];
      // Tự động cào thông tin sản phẩm từ link
      const scrapedText = await fetchTiktokMetadata(tiktokUrl);
      if (scrapedText) {
        extractedData = `\n[THÔNG TIN BÓC TÁCH TỪ LINK TIKTOK MẪU]: ${scrapedText}`;
      }
    }

    // 2. Tạo Prompt điều khiển AI "xào lại 90%" kịch bản
    const systemPrompt = `
Bạn là một Chuyên gia Viết Kịch Bản Video Ngắn TikTok/Reels Affiliate triệu view.
Nhiệm vụ của bạn: Dựa trên thông tin sản phẩm/link đối thủ được cung cấp, hãy SÁNG TẠO LẠI 90% KỊCH BẢN MỚI.

[QUY TẮC RE-CREATE 90% - KHÔNG NHÁI 100%]:
1. GIỮ LẠI (10%): Tên sản phẩm, tính năng cốt lõi, giá tiền/ưu đãi chính xác.
2. SÁNG TẠO MỚI (90%): 
   - Thay đổi hoàn toàn Lời thoại (Voiceover): Dùng văn phong giật gân mới, câu từ tự nhiên, thu hút hơn.
   - Thay đổi Góc quay (Visual Prompt): AI tự đề xuất các góc quay KOC biến thể hoàn toàn mới (Góc cận cảnh chi tiết, góc nghiêng, góc trải nghiệm thực tế).
   - Đảm bảo video KHÔNG BAO GIỜ bị TikTok quét dính bản quyền hoặc trùng lặp nội dung.

[Mô tả từ người dùng / Dữ liệu link]: ${message}${extractedData}
[Thời lượng video yêu cầu]: ${duration || "15s"}

[YÊU CẦU ĐẦU RA]: Chỉ trả về định dạng JSON thuần túy (không chứa markdown \`\`\`json) theo cấu trúc:
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

    // 3. Gọi Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu API Key cho AI Chat" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // Làm sạch chuỗi JSON nếu AI trả về kèm ký tự ```json
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedScript = JSON.parse(cleanedJson);

    return NextResponse.json({ script: parsedScript });
  } catch (error: any) {
    console.error("Lỗi API Chat:", error);
    return NextResponse.json(
      { error: error.message || "Không thể khởi tạo kịch bản xào lại 90%." },
      { status: 500 }
    );
  }
}