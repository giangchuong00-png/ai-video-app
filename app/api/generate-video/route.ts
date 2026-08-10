import { NextResponse } from "next/server";
import Replicate from "replicate";

// Khởi tạo Replicate SDK từ API Token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { visual_prompt, scene_number, mode } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Chưa cấu hình REPLICATE_API_TOKEN trong file .env.local" },
        { status: 500 }
      );
    }

    console.log(`[Replicate API] Đang sinh video cho Phân cảnh ${scene_number}...`);
    console.log(`[Prompt EN]: ${visual_prompt}`);

    // Sử dụng model MiniMax Video-01 (Hoặc Kling AI) trên Replicate
    // Đây là model sinh chuyển động KOC cực kỳ chân thực & mượt mà
    const input = {
      prompt: visual_prompt,
      prompt_optimizer: true
    };

    // Gọi API Replicate để sinh video
    const output: any = await replicate.run("minimax/video-01", { input });

    // Output trả về từ Replicate là 1 URL file video .mp4
    let videoUrl = "";
    if (typeof output === "string") {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (output && output.url) {
      videoUrl = typeof output.url === "function" ? output.url().href : output.url;
    }

    console.log(`[Replicate API] Sinh video Phân cảnh ${scene_number} thành công:`, videoUrl);

    return NextResponse.json({
      success: true,
      scene_number,
      video_url: videoUrl,
      credits_deducted: 2,
    });
  } catch (error: any) {
    console.error("Lỗi Replicate API:", error);
    return NextResponse.json(
      { error: "Không thể sinh video: " + (error.message || "Lỗi server Replicate") },
      { status: 500 }
    );
  }
}