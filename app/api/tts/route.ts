import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

// ==========================================================
// TYPES
// ==========================================================

type TtsRequestBody = {
  text?: string;
  voiceType?: string;
  style?: string;
};

// ==========================================================
// VOICE MAP
// ==========================================================
//
// Reelbo vẫn giữ tên voiceType cũ ở frontend.
// Ở đây map sang voice Gemini.
//
// Sau này nếu mày muốn tinh chỉnh chính xác từng giọng,
// chỉ cần đổi map này.
//

const VOICE_MAP: Record<string, string> = {
  nu_bac: "Kore",
  nu_nam: "Aoede",
  nam_nam: "Puck",
};

// ==========================================================
// STYLE MAP
// ==========================================================

function buildSpeechInstruction(
  voiceType: string,
  customStyle?: string
) {
  if (
    customStyle?.trim()
  ) {
    return customStyle.trim();
  }

  if (
    voiceType === "nam_nam"
  ) {
    return `
Đọc bằng tiếng Việt tự nhiên.
Giọng nam trẻ, gần gũi, năng lượng vừa phải.
Phong cách KOC TikTok bán hàng.
Không đọc như phát thanh viên.
Tốc độ tự nhiên, rõ chữ, có nhấn nhẹ các từ quan trọng.
Không nói quá nhanh.
`;
  }

  if (
    voiceType === "nu_nam"
  ) {
    return `
Đọc bằng tiếng Việt tự nhiên.
Giọng nữ trẻ, thân thiện, mềm và gần gũi.
Phong cách KOC TikTok bán hàng.
Nói tự nhiên như đang chia sẻ trải nghiệm thật.
Tốc độ vừa phải, rõ chữ, có cảm xúc nhẹ.
Không đọc quá quảng cáo.
`;
  }

  return `
Đọc bằng tiếng Việt tự nhiên.
Giọng nữ trẻ, rõ ràng, hiện đại và gần gũi.
Phong cách KOC TikTok bán hàng.
Không đọc như MC hoặc phát thanh viên.
Tốc độ vừa phải, câu ngắn tự nhiên, nhấn nhẹ vào lợi ích sản phẩm.
Giữ cảm giác chân thật và conversational.
`;
}

// ==========================================================
// WAV HELPER
// ==========================================================
//
// Gemini TTS trả PCM raw:
// 24kHz
// mono
// 16-bit
//
// Ta tự đóng PCM thành WAV ngay trên server.
//

function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const header =
    Buffer.alloc(44);

  const byteRate =
    sampleRate *
    channels *
    (bitsPerSample / 8);

  const blockAlign =
    channels *
    (bitsPerSample / 8);

  header.write(
    "RIFF",
    0
  );

  header.writeUInt32LE(
    36 + pcm.length,
    4
  );

  header.write(
    "WAVE",
    8
  );

  header.write(
    "fmt ",
    12
  );

  header.writeUInt32LE(
    16,
    16
  );

  header.writeUInt16LE(
    1,
    20
  );

  header.writeUInt16LE(
    channels,
    22
  );

  header.writeUInt32LE(
    sampleRate,
    24
  );

  header.writeUInt32LE(
    byteRate,
    28
  );

  header.writeUInt16LE(
    blockAlign,
    32
  );

  header.writeUInt16LE(
    bitsPerSample,
    34
  );

  header.write(
    "data",
    36
  );

  header.writeUInt32LE(
    pcm.length,
    40
  );

  return Buffer.concat([
    header,
    pcm,
  ]);
}

// ==========================================================
// POST
// ==========================================================

export async function POST(
  req: Request
) {
  try {
    const body:
      TtsRequestBody =
      await req.json();

    const text =
      String(
        body.text || ""
      ).trim();

    const voiceType =
      String(
        body.voiceType ||
        "nu_bac"
      );

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Thiếu văn bản lời thoại!",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env
        .GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Thiếu GEMINI_API_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================================
    // MOCK MODE
    // ======================================================

    const mockMode =
      process.env
        .VIDEO_MOCK_MODE ===
      "true";

    if (mockMode) {
      console.log(
        `[TTS MOCK] ${voiceType}: "${text}"`
      );

      return NextResponse.json({
        success: true,
        mock: true,
        voiceType,
        audioUrl: null,
        text,
      });
    }

    // ======================================================
    // GEMINI TTS
    // ======================================================

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    const voiceName =
      VOICE_MAP[
        voiceType
      ] || "Kore";

    const speechInstruction =
      buildSpeechInstruction(
        voiceType,
        body.style
      );

    const prompt = `
${speechInstruction}

Hãy đọc chính xác nội dung sau, không thêm câu nào khác:

${text}
`;

    console.log(
      `[TTS Engine] voiceType=${voiceType} | Gemini voice=${voiceName}`
    );

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.1-flash-tts-preview",

          contents: [
            {
              role:
                "user",

              parts: [
                {
                  text:
                    prompt,
                },
              ],
            },
          ],

          config: {
            responseModalities:
              ["AUDIO"],

            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig:
                  {
                    voiceName,
                  },
              },
            },
          },
        }
      );

    // ======================================================
    // READ PCM
    // ======================================================

    const inlineData =
      response
        .candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.inlineData;

    const pcmBase64 =
      inlineData?.data;

    if (!pcmBase64) {
      throw new Error(
        "Gemini TTS không trả audio."
      );
    }

    const pcmBuffer =
      Buffer.from(
        pcmBase64,
        "base64"
      );

    const wavBuffer =
      pcmToWav(
        pcmBuffer
      );

    // ======================================================
    // RETURN WAV DIRECTLY
    // ======================================================

    return new Response(
      new Uint8Array(
        wavBuffer
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "audio/wav",

          "Content-Length":
            String(
              wavBuffer.length
            ),

          "Cache-Control":
            "no-store",

          "X-Reelbo-Voice":
            voiceType,

          "X-Reelbo-TTS-Engine":
            "gemini-3.1-flash-tts-preview",
        },
      }
    );
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : "Unknown error";

    console.error(
      "[TTS Engine] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tạo giọng đọc: " +
          message,
      },
      {
        status: 500,
      }
    );
  }
}