import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { visual_prompt, voiceover, voiceType, scene_number } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Chưa cấu hình REPLICATE_API_TOKEN trong file .env.local" },
        { status: 500 }
      );
    }

    console.log(`[Engine AI] Đang xử lý Phân cảnh ${scene_number}...`);
    console.log(`[Visual Prompt]: ${visual_prompt}`);
    console.log(`[Voiceover]: ${voiceover} (Giọng: ${voiceType || 'nu_bac'})`);

    // 1. SINH VIDEO TỪ MINIMAX VIDEO-01 (REPLICATE)
    const videoInput = {
      prompt: visual_prompt,
      prompt_optimizer: true
    };

    const output: any = await replicate.run("minimax/video-01", { input: videoInput });

    let videoUrl = "";
    if (typeof output === "string") {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (output && output.url) {
      videoUrl = typeof output.url === "function" ? output.url().href : output.url;
    }

    // 2. SINH AUDIO GIỌNG ĐỌC AI KOC (BẮC / NAM) TỪ GOOGLE TTS
    // Tự động encode lời thoại để tạo audio mp4/mp3
    const encodedText = encodeURIComponent(voiceover || "Sản phẩm tuyệt vời!");
    let ttsLang = "vi";
    
    // Tạo link Audio giọng đọc chuẩn
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${ttsLang}&client=tw-ob`;

    console.log(`[Engine AI] Xử lý Phân cảnh ${scene_number} thành công!`);

    return NextResponse.json({
      success: true,
      scene_number,
      video_url: videoUrl,
      audio_url: audioUrl,
      credits_deducted: 20,
    });
  } catch (error: any) {
    console.error("Lỗi Engine API:", error);
    return NextResponse.json(
      { error: "Không thể sinh video: " + (error.message || "Lỗi server Engine") },
      { status: 500 }
    );
  }
}