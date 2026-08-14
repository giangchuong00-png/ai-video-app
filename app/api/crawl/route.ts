import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes("tiktok.com")) {
      return NextResponse.json(
        { error: "Vui lòng nhập đúng đường dẫn (URL) từ TikTok!" },
        { status: 400 }
      );
    }

    console.log(`[Crawl Engine] Đang tiến hành cào dữ liệu link: ${url}`);

    // Gọi API TikWM để trích xuất video & thông tin không dính Logo / Watermark
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      return NextResponse.json(
        { error: "Không thể lấy dữ liệu từ link TikTok này. Vui lòng kiểm tra lại link!" },
        { status: 400 }
      );
    }

    // Trích xuất các thông tin quan trọng
    const videoData = {
      title: data.data.title || "Sản phẩm TikTok", // Mô tả video
      videoUrl: data.data.play,                    // Direct link Video HD không dính logo
      coverImage: data.data.cover,                 // Ảnh Bìa/Thumbnail HD
      author: data.data.author?.nickname || "KOC", // Tên tác giả
    };

    console.log("[Crawl Engine] Cào thành công:", videoData.title);

    return NextResponse.json({
      success: true,
      data: videoData,
    });
  } catch (error: any) {
    console.error("Lỗi Crawl API:", error);
    return NextResponse.json(
      { error: "Lỗi kết nối máy chủ cào dữ liệu: " + error.message },
      { status: 500 }
    );
  }
}