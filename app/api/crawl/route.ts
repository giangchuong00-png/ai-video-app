import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes("tiktok.com")) {
      return NextResponse.json(
        { error: "Vui lòng nhập đúng URL TikTok!" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `TikWM HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      return NextResponse.json(
        { error: "Không thể lấy dữ liệu TikTok." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        title: data.data.title || "",
        videoUrl: data.data.play || "",
        coverImage: data.data.cover || "",
        author: data.data.author?.nickname || "",
        duration: data.data.duration || null,
        mimeType: "video/mp4",
      },
    });
  } catch (error: any) {
    console.error("Crawl API error:", error);

    return NextResponse.json(
      {
        error:
          "Lỗi kết nối máy chủ cào dữ liệu: " +
          (error.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}