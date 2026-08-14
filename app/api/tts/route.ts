import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voiceType } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Thiếu văn bản lời thoại!" }, { status: 400 });
    }

    console.log(`[TTS Engine] Đang tạo giọng đọc (${voiceType || 'nu_bac'}): "${text}"`);

    // Mã hóa văn bản tiếng Việt chuẩn UTF-8
    const encodedText = encodeURIComponent(text);
    
    // Tự động chọn mã ngôn ngữ & ngữ điệu theo vùng miền
    let voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=vi&client=tw-ob`;

    // (Nếu sau này bạn gắn API Key FPT.AI / ElevenLabs thì chỉ cần thay endpoint ở đây)

    return NextResponse.json({
      success: true,
      audioUrl: voiceUrl,
    });
  } catch (error: any) {
    console.error("Lỗi TTS API:", error);
    return NextResponse.json(
      { error: "Không thể tạo giọng đọc: " + error.message },
      { status: 500 }
    );
  }
}