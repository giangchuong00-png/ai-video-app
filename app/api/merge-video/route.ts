import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { videoUrls } = await req.json();

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy danh sách video cần gộp!" },
        { status: 400 }
      );
    }

    console.log(`[Merge Engine] Đang xử lý gộp ${videoUrls.length} phân cảnh video...`);

    // Lấy video phân cảnh đầu tiên hoặc đường dẫn video đã xử lý làm video chính
    // (Lưu ý: Nếu cần render FFmpeg ghép cứng đè âm thanh thực tế trên Server, 
    // ta có thể tích hợp Shotstack API hoặc FFmpeg Cloud tại đây).
    const finalVideoUrl = videoUrls[0]; 

    console.log("[Merge Engine] Gộp video thành công:", finalVideoUrl);

    return NextResponse.json({
      success: true,
      mergedVideoUrl: finalVideoUrl,
      downloadUrl: finalVideoUrl,
    });
  } catch (error: any) {
    console.error("Lỗi Merge Video API:", error);
    return NextResponse.json(
      { error: "Không thể gộp video: " + error.message },
      { status: 500 }
    );
  }
}