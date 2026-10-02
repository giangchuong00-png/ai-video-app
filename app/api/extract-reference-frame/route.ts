import { NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// TIMESTAMP
// Hỗ trợ:
// "4.8"
// "00:04.8"
// "00:00:04.8"
// ============================================================

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.max(0, value));
  }

  const raw = String(value || "").trim();

  if (!raw) {
    throw new Error("TIMESTAMP_REQUIRED");
  }

  // Nếu Gemini trả đơn giản: "4.8"
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return raw;
  }

  const parts = raw.split(":").map((part) => Number(part));

  if (
    parts.some((part) => !Number.isFinite(part)) ||
    parts.length < 2 ||
    parts.length > 3
  ) {
    throw new Error("INVALID_TIMESTAMP");
  }

  let seconds = 0;

  if (parts.length === 2) {
    // mm:ss
    seconds = parts[0] * 60 + parts[1];
  } else {
    // hh:mm:ss
    seconds =
      parts[0] * 3600 +
      parts[1] * 60 +
      parts[2];
  }

  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("INVALID_TIMESTAMP");
  }

  return String(seconds);
}

// ============================================================
// FFMPEG
// ============================================================

async function resolveFfmpegBinary(): Promise<string> {
    const candidates = [
      ffmpegPath,
  
      path.join(
        process.cwd(),
        "node_modules",
        "ffmpeg-static",
        "ffmpeg"
      ),
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.length > 0
    );
  
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
  
        console.log(
          "[Extract Reference Frame] Using FFmpeg:",
          candidate
        );
  
        return candidate;
      } catch {
        // thử candidate tiếp theo
      }
    }
  
    throw new Error(
      "FFMPEG_BINARY_NOT_FOUND"
    );
  }
  
  async function runFfmpeg(
    args: string[]
  ): Promise<void> {
    const binaryPath =
      await resolveFfmpegBinary();
  
    await new Promise<void>(
      (resolve, reject) => {
        const child = spawn(
          binaryPath,
          args,
          {
            stdio: [
              "ignore",
              "ignore",
              "pipe",
            ],
          }
        );
  
        let stderr = "";
  
        child.stderr.on(
          "data",
          (chunk: Buffer) => {
            stderr += chunk.toString();
          }
        );
  
        child.on(
          "error",
          (error: Error) => {
            reject(error);
          }
        );
  
        child.on(
          "close",
          (code: number | null) => {
            if (code === 0) {
              resolve();
              return;
            }
  
            console.error(
              "[Extract Reference Frame] FFmpeg error:",
              stderr
            );
  
            reject(
              new Error(
                `FFMPEG_FAILED_CODE_${code}`
              )
            );
          }
        );
      }
    );
  }

// ============================================================
// DOWNLOAD REMOTE VIDEO
// ============================================================

async function downloadVideo(
  videoUrl: string,
  destination: string
) {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(
      `VIDEO_DOWNLOAD_FAILED_${response.status}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  await fs.writeFile(
    destination,
    Buffer.from(arrayBuffer)
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(req: Request) {
  const tempFiles: string[] = [];

  try {
    const contentType =
      req.headers.get("content-type") || "";

    let timestampInput: unknown;
    let uploadedFile: File | null = null;
    let remoteVideoUrl: string | null = null;

    // --------------------------------------------------------
    // 1. MULTIPART:
    // video = File
    // timestamp = recommended_timestamp
    // --------------------------------------------------------

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await req.formData();

      const videoValue =
        formData.get("video");

      const timestampValue =
        formData.get("timestamp");

      const videoUrlValue =
        formData.get("video_url");

      if (videoValue instanceof File) {
        uploadedFile = videoValue;
      }

      if (
        typeof videoUrlValue === "string" &&
        videoUrlValue.trim()
      ) {
        remoteVideoUrl =
          videoUrlValue.trim();
      }

      timestampInput =
        timestampValue;
    } else {
      // ------------------------------------------------------
      // 2. JSON:
      // {
      //   video_url,
      //   timestamp
      // }
      // ------------------------------------------------------

      const body =
        await req.json();

      timestampInput =
        body?.timestamp ||
        body?.recommended_timestamp;

      remoteVideoUrl =
        typeof body?.video_url === "string"
          ? body.video_url.trim()
          : typeof body?.videoUrl === "string"
            ? body.videoUrl.trim()
            : null;
    }

    const timestamp =
      normalizeTimestamp(
        timestampInput
      );

    if (
      !uploadedFile &&
      !remoteVideoUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Thiếu video mẫu để trích frame.",
          code: "VIDEO_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const jobId =
      randomUUID();

    const tempDir =
      os.tmpdir();

    const inputPath =
      path.join(
        tempDir,
        `reelbo-reference-input-${jobId}.mp4`
      );

    const outputPath =
      path.join(
        tempDir,
        `reelbo-reference-frame-${jobId}.jpg`
      );

    tempFiles.push(
      inputPath,
      outputPath
    );

    // --------------------------------------------------------
    // 3. CHUẨN BỊ VIDEO INPUT
    // --------------------------------------------------------

    if (uploadedFile) {
      const bytes =
        await uploadedFile.arrayBuffer();

      await fs.writeFile(
        inputPath,
        Buffer.from(bytes)
      );
    } else if (remoteVideoUrl) {
      await downloadVideo(
        remoteVideoUrl,
        inputPath
      );
    }

    console.log(
      "[Extract Reference Frame] timestamp:",
      timestamp
    );

    // --------------------------------------------------------
    // 4. TRÍCH 1 FRAME
    // --------------------------------------------------------

    await runFfmpeg([
      "-y",

      // seek tới timestamp Gemini chọn
      "-ss",
      timestamp,

      "-i",
      inputPath,

      // đúng 1 frame
      "-frames:v",
      "1",

      // giữ chất lượng JPEG tốt
      "-q:v",
      "2",

      outputPath,
    ]);

    // --------------------------------------------------------
    // 5. ĐỌC ẢNH → DATA URL
    // --------------------------------------------------------

    const frameBuffer =
      await fs.readFile(
        outputPath
      );

    if (!frameBuffer.length) {
      throw new Error(
        "REFERENCE_FRAME_EMPTY"
      );
    }

    const frameBase64 =
      frameBuffer.toString("base64");

    const frameDataUrl =
      `data:image/jpeg;base64,${frameBase64}`;

    console.log(
      "[Extract Reference Frame] success",
      {
        timestamp,
        bytes:
          frameBuffer.length,
      }
    );

    return NextResponse.json({
      success: true,

      timestamp,

      // Sau này page.tsx sẽ lấy field này
      // gửi sang generate-video làm product_image
      product_reference_image:
        frameDataUrl,

      mime_type:
        "image/jpeg",

      size_bytes:
        frameBuffer.length,
    });
  } catch (error: any) {
    console.error(
      "[Extract Reference Frame] Error:",
      error
    );

    const message =
      error?.message ||
      "UNKNOWN_ERROR";

    let status = 500;

    if (
      message ===
        "TIMESTAMP_REQUIRED" ||
      message ===
        "INVALID_TIMESTAMP"
    ) {
      status = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Không thể trích frame sản phẩm từ video mẫu.",
        code: message,
      },
      {
        status,
      }
    );
  } finally {
    // --------------------------------------------------------
    // 6. DỌN FILE TEMP
    // --------------------------------------------------------

    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch {
        // file chưa tồn tại / đã xóa → bỏ qua
      }
    }
  }
}