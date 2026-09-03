import { NextResponse } from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";

import ffmpegPath from "ffmpeg-static";

import {
  promises as fs,
} from "fs";

import path from "path";
import os from "os";

import {
  spawn,
} from "child_process";

export const runtime =
  "nodejs";

// ==========================================================
// TYPES
// ==========================================================

type MergeScene = {
  videoUrl?: string;
  duration?: string | number;
  voiceover?: string;
};

type MergeRequestBody = {
  videoUrls?: string[];
  scenes?: MergeScene[];
  targetDuration?:
    | string
    | number;
  voiceType?: string;
};

type SubtitleApiResult = {
  success?: boolean;
  srt?: string;
  caption_count?: number;
  total_duration?: number;
  error?: string;
};

type UploadedVideoResult = {
  publicUrl: string;
  storagePath: string;
};

// ==========================================================
// AUDIO SETTINGS
// ==========================================================

const MAX_TTS_SPEED =
  1.6;

const AUDIO_SAMPLE_RATE =
  48000;

// ==========================================================
// SUPABASE SERVICE CLIENT
// ==========================================================

function getServiceSupabase() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Thiếu Supabase URL hoặc SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}

// ==========================================================
// AUTHENTICATE USER
// ==========================================================

async function getAuthenticatedUser(
  req: Request
): Promise<{
  id: string;
  email?: string;
}> {
  const authorization =
    req.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const accessToken =
    authorization
      .slice(
        "Bearer ".length
      )
      .trim();

  if (!accessToken) {
    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const supabase =
    getServiceSupabase();

  const {
    data,
    error,
  } =
    await supabase.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data.user
  ) {
    console.warn(
      "[Merge Auth] Invalid token:",
      error?.message
    );

    throw new Error(
      "UNAUTHORIZED"
    );
  }

  return {
    id:
      data.user.id,

    email:
      data.user.email,
  };
}

// ==========================================================
// HELPERS
// ==========================================================

function parseDuration(
  value: unknown,
  fallback = 6
): number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
  ) {
    return value;
  }

  if (
    typeof value !==
    "string"
  ) {
    return fallback;
  }

  const match =
    value.match(
      /(\d+(?:\.\d+)?)/
    );

  if (!match) {
    return fallback;
  }

  const parsed =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function safeFileName(
  value: string
) {
  return value.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
}

// ==========================================================
// WAV DURATION
// ==========================================================

function getWavDurationSeconds(
  wavBuffer: Buffer
): number {
  if (
    wavBuffer.length <
    44
  ) {
    throw new Error(
      "File TTS WAV không hợp lệ."
    );
  }

  const riff =
    wavBuffer
      .subarray(
        0,
        4
      )
      .toString();

  const wave =
    wavBuffer
      .subarray(
        8,
        12
      )
      .toString();

  if (
    riff !== "RIFF" ||
    wave !== "WAVE"
  ) {
    throw new Error(
      "Audio TTS không phải WAV hợp lệ."
    );
  }

  const byteRate =
    wavBuffer.readUInt32LE(
      28
    );

  const dataSize =
    wavBuffer.readUInt32LE(
      40
    );

  if (
    byteRate <= 0 ||
    dataSize <= 0
  ) {
    throw new Error(
      "Không đọc được duration WAV."
    );
  }

  return (
    dataSize /
    byteRate
  );
}

// ==========================================================
// RUN FFMPEG
// ==========================================================

function runFFmpeg(
  args: string[]
): Promise<void> {
  const executablePath =
    ffmpegPath;

  if (
    !executablePath
  ) {
    return Promise.reject(
      new Error(
        "Không tìm thấy FFmpeg binary."
      )
    );
  }

  return new Promise<void>(
    (
      resolve,
      reject
    ) => {
      console.log(
        "[Merge Engine] FFmpeg:",
        args.join(" ")
      );

      const child =
        spawn(
          executablePath,
          args
        );

      let stderr = "";

      child.stderr.on(
        "data",
        (
          chunk: Buffer
        ) => {
          stderr +=
            chunk.toString();

          if (
            stderr.length >
            12000
          ) {
            stderr =
              stderr.slice(
                -12000
              );
          }
        }
      );

      child.on(
        "error",
        (
          error: Error
        ) => {
          reject(
            error
          );
        }
      );

      child.on(
        "close",
        (
          code:
            number | null
        ) => {
          if (
            code === 0
          ) {
            resolve();
            return;
          }

          reject(
            new Error(
              `FFmpeg exit code ${code}: ${stderr.slice(
                -4000
              )}`
            )
          );
        }
      );
    }
  );
}

// ==========================================================
// DOWNLOAD VIDEO
// ==========================================================

async function downloadVideo(
  url: string,
  destination: string
) {
  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Không tải được scene video: HTTP ${response.status}`
    );
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  await fs.writeFile(
    destination,
    buffer
  );
}

// ==========================================================
// REQUEST TTS
// ==========================================================

async function createSceneTts({
  origin,
  text,
  voiceType,
  destination,
}: {
  origin: string;
  text: string;
  voiceType: string;
  destination: string;
}): Promise<{
  duration: number;
}> {
  const response =
    await fetch(
      `${origin}/api/tts`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            {
              text,
              voiceType,
            }
          ),

        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    let message =
      "TTS thất bại.";

    try {
      const data =
        await response.json();

      message =
        data?.error ||
        message;
    } catch {}

    throw new Error(
      message
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType.includes(
      "audio/"
    )
  ) {
    throw new Error(
      "TTS không trả file audio."
    );
  }

  const wavBuffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  await fs.writeFile(
    destination,
    wavBuffer
  );

  const duration =
    getWavDurationSeconds(
      wavBuffer
    );

  return {
    duration,
  };
}

// ==========================================================
// REQUEST SUBTITLES
// ==========================================================

async function createSubtitles({
  origin,
  scenes,
}: {
  origin: string;
  scenes: MergeScene[];
}): Promise<{
  srt: string;
  captionCount: number;
}> {
  const response =
    await fetch(
      `${origin}/api/subtitles`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            {
              scenes:
                scenes.map(
                  (
                    scene
                  ) => ({
                    duration:
                      scene.duration,

                    voiceover:
                      scene.voiceover ||
                      "",
                  })
                ),
            }
          ),

        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    let message =
      "Subtitle Engine thất bại.";

    try {
      const data =
        await response.json();

      message =
        data?.error ||
        message;
    } catch {}

    throw new Error(
      message
    );
  }

  const data =
    (
      await response.json()
    ) as SubtitleApiResult;

  if (
    !data.success ||
    typeof data.srt !==
      "string"
  ) {
    throw new Error(
      data.error ||
        "Subtitle Engine không trả SRT hợp lệ."
    );
  }

  return {
    srt:
      data.srt,

    captionCount:
      Number(
        data.caption_count ||
        0
      ),
  };
}

// ==========================================================
// NORMALIZE + TRIM VIDEO
// ==========================================================

async function prepareSceneVideo({
  inputPath,
  outputPath,
  duration,
}: {
  inputPath: string;
  outputPath: string;
  duration: number;
}) {
  await runFFmpeg([
    "-y",

    "-i",
    inputPath,

    "-t",
    String(
      duration
    ),

    "-vf",
    [
      "scale=720:1280:force_original_aspect_ratio=decrease",
      "pad=720:1280:(ow-iw)/2:(oh-ih)/2",
      "setsar=1",
      "fps=30",
    ].join(","),

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "20",

    "-pix_fmt",
    "yuv420p",

    "-movflags",
    "+faststart",

    "-an",

    outputPath,
  ]);
}

// ==========================================================
// ADD SILENT AUDIO
// ==========================================================

async function addSilentAudio({
  videoPath,
  outputPath,
  duration,
}: {
  videoPath: string;
  outputPath: string;
  duration: number;
}) {
  await runFFmpeg([
    "-y",

    "-i",
    videoPath,

    "-f",
    "lavfi",

    "-t",
    String(
      duration
    ),

    "-i",
    `anullsrc=channel_layout=mono:sample_rate=${AUDIO_SAMPLE_RATE}`,

    "-map",
    "0:v:0",

    "-map",
    "1:a:0",

    "-c:v",
    "copy",

    "-c:a",
    "aac",

    "-b:a",
    "128k",

    "-ar",
    String(
      AUDIO_SAMPLE_RATE
    ),

    "-ac",
    "1",

    "-t",
    String(
      duration
    ),

    "-shortest",

    "-movflags",
    "+faststart",

    outputPath,
  ]);
}

// ==========================================================
// BUILD ATEMPO FILTER
// ==========================================================

function buildAtempoFilter(
  speed: number
): string {
  if (
    !Number.isFinite(
      speed
    ) ||
    speed <= 1
  ) {
    return "atempo=1.0";
  }

  const filters:
    string[] = [];

  let remaining =
    speed;

  while (
    remaining > 2
  ) {
    filters.push(
      "atempo=2.0"
    );

    remaining /=
      2;
  }

  filters.push(
    `atempo=${remaining.toFixed(
      4
    )}`
  );

  return filters.join(
    ","
  );
}

// ==========================================================
// MUX VOICEOVER INTO SCENE
// ==========================================================

async function muxVoiceover({
  videoPath,
  audioPath,
  outputPath,
  sceneDuration,
  audioDuration,
}: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  sceneDuration: number;
  audioDuration: number;
}) {
  let speed = 1;

  if (
    audioDuration >
    sceneDuration
  ) {
    speed =
      audioDuration /
      sceneDuration;
  }

  console.log(
    `[Audio Engine] scene=${sceneDuration}s | voice=${audioDuration.toFixed(
      2
    )}s | speed=${speed.toFixed(
      2
    )}x`
  );

  if (
    speed >
    MAX_TTS_SPEED
  ) {
    throw new Error(
      `Lời thoại dài quá so với phân cảnh. Audio ${audioDuration.toFixed(
        1
      )}s nhưng scene chỉ ${sceneDuration}s. Cần AI Director rút ngắn voiceover.`
    );
  }

  const atempo =
    buildAtempoFilter(
      speed
    );

  const audioFilter =
    [
      atempo,

      `aresample=${AUDIO_SAMPLE_RATE}`,

      `apad=pad_dur=${sceneDuration}`,

      `atrim=0:${sceneDuration}`,

      "asetpts=N/SR/TB",
    ].join(",");

  await runFFmpeg([
    "-y",

    "-i",
    videoPath,

    "-i",
    audioPath,

    "-filter_complex",
    `[1:a]${audioFilter}[voice]`,

    "-map",
    "0:v:0",

    "-map",
    "[voice]",

    "-c:v",
    "copy",

    "-c:a",
    "aac",

    "-b:a",
    "128k",

    "-ar",
    String(
      AUDIO_SAMPLE_RATE
    ),

    "-ac",
    "1",

    "-t",
    String(
      sceneDuration
    ),

    "-movflags",
    "+faststart",

    outputPath,
  ]);
}

// ==========================================================
// CONCAT SCENES
// ==========================================================

async function concatScenes({
  scenePaths,
  concatFile,
  outputPath,
}: {
  scenePaths: string[];
  concatFile: string;
  outputPath: string;
}) {
  const concatContent =
    scenePaths
      .map(
        (
          scenePath
        ) =>
          `file '${scenePath.replace(
            /'/g,
            "'\\''"
          )}'`
      )
      .join(
        "\n"
      );

  await fs.writeFile(
    concatFile,
    concatContent,
    "utf8"
  );

  await runFFmpeg([
    "-y",

    "-f",
    "concat",

    "-safe",
    "0",

    "-i",
    concatFile,

    "-c",
    "copy",

    "-movflags",
    "+faststart",

    outputPath,
  ]);
}

// ==========================================================
// ESCAPE SUBTITLE PATH
// ==========================================================

function escapeSubtitlePath(
  filePath: string
): string {
  return filePath
    .replace(
      /\\/g,
      "/"
    )
    .replace(
      /:/g,
      "\\:"
    )
    .replace(
      /'/g,
      "\\'"
    );
}

// ==========================================================
// BURN SUBTITLES
// ==========================================================

async function burnSubtitles({
  inputPath,
  subtitlePath,
  outputPath,
}: {
  inputPath: string;
  subtitlePath: string;
  outputPath: string;
}) {
  const escapedSubtitlePath =
    escapeSubtitlePath(
      subtitlePath
    );

  const forceStyle = [
    "Alignment=2",
    "Fontsize=22",
    "MarginV=95",
    "PrimaryColour=&H00FFFFFF",
    "OutlineColour=&H00000000",
    "BorderStyle=1",
    "Outline=2",
    "Shadow=0",
  ].join(",");

  const subtitleFilter =
    `subtitles='${escapedSubtitlePath}':force_style='${forceStyle}'`;

  await runFFmpeg([
    "-y",

    "-i",
    inputPath,

    "-vf",
    subtitleFilter,

    "-map",
    "0:v:0",

    "-map",
    "0:a:0?",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "20",

    "-pix_fmt",
    "yuv420p",

    "-c:a",
    "copy",

    "-movflags",
    "+faststart",

    outputPath,
  ]);
}

// ==========================================================
// UPLOAD FINAL VIDEO
// ==========================================================

async function uploadFinalVideo(
  filePath: string
): Promise<UploadedVideoResult> {
  const supabase =
    getServiceSupabase();

  const buffer =
    await fs.readFile(
      filePath
    );

  const fileName =
    safeFileName(
      `final_${Date.now()}_${Math.random()
        .toString(36)
        .slice(
          2,
          9
        )}.mp4`
    );

  const storagePath =
    `final/${fileName}`;

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        "reelbo-videos"
      )
      .upload(
        storagePath,
        buffer,
        {
          contentType:
            "video/mp4",

          upsert:
            false,

          cacheControl:
            "3600",
        }
      );

  if (
    uploadError
  ) {
    throw new Error(
      `Upload final video thất bại: ${uploadError.message}`
    );
  }

  const {
    data,
  } =
    supabase.storage
      .from(
        "reelbo-videos"
      )
      .getPublicUrl(
        storagePath
      );

  if (
    !data?.publicUrl
  ) {
    throw new Error(
      "Không lấy được URL video sau khi upload."
    );
  }

  return {
    publicUrl:
      data.publicUrl,

    storagePath,
  };
}

// ==========================================================
// SAVE VIDEO HISTORY
// ==========================================================

async function saveVideoHistory({
  userId,
  videoUrl,
  storagePath,
  durationSeconds,
}: {
  userId: string;
  videoUrl: string;
  storagePath: string;
  durationSeconds: number;
}): Promise<{
  saved: boolean;
  id: string | null;
}> {
  try {
    const supabase =
      getServiceSupabase();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "video_jobs"
        )
        .insert({
          user_id:
            userId,

          video_url:
            videoUrl,

          storage_path:
            storagePath,

          duration_seconds:
            durationSeconds,

          status:
            "completed",
        })
        .select(
          "id"
        )
        .single();

    if (error) {
      console.error(
        "[Video History] Insert failed:",
        error
      );

      return {
        saved:
          false,

        id:
          null,
      };
    }

    console.log(
      "[Video History] Saved:",
      data?.id
    );

    return {
      saved: true,

      id:
        data?.id ||
        null,
    };
  } catch (
    error
  ) {
    console.error(
      "[Video History] Unexpected error:",
      error
    );

    return {
      saved:
        false,

      id:
        null,
    };
  }
}

// ==========================================================
// POST
// ==========================================================

export async function POST(
  req: Request
) {
  let workDir:
    string | null =
    null;

  try {
    // ======================================================
    // AUTH
    // ======================================================

    let authenticatedUser: {
      id: string;
      email?: string;
    };

    try {
      authenticatedUser =
        await getAuthenticatedUser(
          req
        );
    } catch (
      authError
    ) {
      console.warn(
        "[Merge Auth] Unauthorized:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "[Merge Auth] User:",
      authenticatedUser.id
    );

    // ======================================================
    // REQUEST BODY
    // ======================================================

    const body:
      MergeRequestBody =
      await req.json();

    const origin =
      new URL(
        req.url
      ).origin;

    const voiceType =
      String(
        body.voiceType ||
        "nu_bac"
      );

    // ======================================================
    // BUILD SCENE LIST
    // ======================================================

    let scenes:
      MergeScene[] =
      [];

    if (
      Array.isArray(
        body.scenes
      ) &&
      body.scenes.length >
        0
    ) {
      scenes =
        body.scenes;
    } else if (
      Array.isArray(
        body.videoUrls
      ) &&
      body.videoUrls.length >
        0
    ) {
      scenes =
        body.videoUrls.map(
          (
            videoUrl
          ) => ({
            videoUrl,

            duration:
              "6s",

            voiceover:
              "",
          })
        );
    }

    if (
      scenes.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy danh sách video cần gộp!",
        },
        {
          status: 400,
        }
      );
    }

    const invalidScene =
      scenes.find(
        (
          scene
        ) =>
          !scene.videoUrl
      );

    if (
      invalidScene
    ) {
      return NextResponse.json(
        {
          error:
            "Có phân cảnh không có videoUrl.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // PLANNED DURATION
    // ======================================================

    const plannedDuration =
      scenes.reduce(
        (
          sum,
          scene
        ) =>
          sum +
          parseDuration(
            scene.duration,
            6
          ),
        0
      );

    // ======================================================
    // MOCK MODE
    // ======================================================

    const mockMode =
      process.env
        .VIDEO_MOCK_MODE ===
      "true";

    if (
      mockMode
    ) {
      console.log(
        `[Merge Engine MOCK] ${scenes.length} scenes`
      );

      console.log(
        "[Merge Engine MOCK] user =",
        authenticatedUser.id
      );

      console.log(
        "[Merge Engine MOCK] durations =",
        scenes.map(
          (
            scene
          ) =>
            scene.duration
        )
      );

      return NextResponse.json({
        success:
          true,

        mock:
          true,

        mergedVideoUrl:
          scenes[0]
            .videoUrl,

        downloadUrl:
          scenes[0]
            .videoUrl,

        scenes:
          scenes.length,

        plannedDuration,

        audio:
          false,

        subtitles:
          false,

        historySaved:
          false,

        historyId:
          null,
      });
    }

    // ======================================================
    // TEMP DIRECTORY
    // ======================================================

    workDir =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "reelbo_merge_"
        )
      );

    console.log(
      `[Merge Engine] Bắt đầu ${scenes.length} scenes`
    );

    console.log(
      "[Merge Engine] workDir:",
      workDir
    );

    // ======================================================
    // DOWNLOAD + VIDEO + TTS
    // ======================================================

    const completedScenePaths:
      string[] =
      [];

    for (
      let i = 0;
      i <
      scenes.length;
      i++
    ) {
      const scene =
        scenes[i];

      const sceneDuration =
        parseDuration(
          scene.duration,
          6
        );

      const voiceover =
        String(
          scene.voiceover ||
          ""
        ).trim();

      const rawVideoPath =
        path.join(
          workDir,
          `raw_${i}.mp4`
        );

      const preparedVideoPath =
        path.join(
          workDir,
          `prepared_video_${i}.mp4`
        );

      const ttsPath =
        path.join(
          workDir,
          `voice_${i}.wav`
        );

      const completedScenePath =
        path.join(
          workDir,
          `scene_${String(
            i
          ).padStart(
            3,
            "0"
          )}.mp4`
        );

      console.log(
        `\n[Merge Engine] Scene ${
          i + 1
        }/${scenes.length}`
      );

      console.log(
        `[Merge Engine] duration=${sceneDuration}s`
      );

      console.log(
        `[Merge Engine] voiceover=${Boolean(
          voiceover
        )}`
      );

      // ====================================================
      // DOWNLOAD
      // ====================================================

      await downloadVideo(
        scene.videoUrl!,
        rawVideoPath
      );

      // ====================================================
      // NORMALIZE
      // ====================================================

      await prepareSceneVideo({
        inputPath:
          rawVideoPath,

        outputPath:
          preparedVideoPath,

        duration:
          sceneDuration,
      });

      // ====================================================
      // VOICEOVER
      // ====================================================

      if (
        voiceover
      ) {
        const ttsResult =
          await createSceneTts({
            origin,

            text:
              voiceover,

            voiceType,

            destination:
              ttsPath,
          });

        console.log(
          `[TTS Engine] Scene ${
            i + 1
          } audio=${ttsResult.duration.toFixed(
            2
          )}s`
        );

        await muxVoiceover({
          videoPath:
            preparedVideoPath,

          audioPath:
            ttsPath,

          outputPath:
            completedScenePath,

          sceneDuration,

          audioDuration:
            ttsResult.duration,
        });
      } else {
        await addSilentAudio({
          videoPath:
            preparedVideoPath,

          outputPath:
            completedScenePath,

          duration:
            sceneDuration,
        });
      }

      completedScenePaths.push(
        completedScenePath
      );
    }

    // ======================================================
    // CONCAT
    // ======================================================

    const concatFile =
      path.join(
        workDir,
        "concat.txt"
      );

    const mergedWithoutSubtitlesPath =
      path.join(
        workDir,
        "merged_without_subtitles.mp4"
      );

    await concatScenes({
      scenePaths:
        completedScenePaths,

      concatFile,

      outputPath:
        mergedWithoutSubtitlesPath,
    });

    // ======================================================
    // SUBTITLES
    // ======================================================

    const finalPath =
      path.join(
        workDir,
        "final.mp4"
      );

    let subtitlesBurned =
      false;

    let subtitleCount =
      0;

    const hasVoiceover =
      scenes.some(
        (
          scene
        ) =>
          Boolean(
            scene.voiceover?.trim()
          )
      );

    if (
      hasVoiceover
    ) {
      try {
        const subtitleResult =
          await createSubtitles({
            origin,
            scenes,
          });

        subtitleCount =
          subtitleResult.captionCount;

        if (
          subtitleResult.srt.trim() &&
          subtitleCount > 0
        ) {
          const subtitlePath =
            path.join(
              workDir,
              "captions.srt"
            );

          await fs.writeFile(
            subtitlePath,
            subtitleResult.srt,
            "utf8"
          );

          console.log(
            `[Subtitle Engine] Burn ${subtitleCount} captions`
          );

          await burnSubtitles({
            inputPath:
              mergedWithoutSubtitlesPath,

            subtitlePath,

            outputPath:
              finalPath,
          });

          subtitlesBurned =
            true;
        } else {
          await fs.copyFile(
            mergedWithoutSubtitlesPath,
            finalPath
          );
        }
      } catch (
        subtitleError
      ) {
        console.warn(
          "[Subtitle Engine] Không burn được subtitle. Giữ video không subtitle:",
          subtitleError
        );

        await fs.copyFile(
          mergedWithoutSubtitlesPath,
          finalPath
        );
      }
    } else {
      await fs.copyFile(
        mergedWithoutSubtitlesPath,
        finalPath
      );
    }

    // ======================================================
    // FILE CHECK
    // ======================================================

    const finalStats =
      await fs.stat(
        finalPath
      );

    if (
      finalStats.size <=
      0
    ) {
      throw new Error(
        "FFmpeg tạo final.mp4 rỗng."
      );
    }

    console.log(
      `[Merge Engine] final.mp4 size=${finalStats.size} bytes`
    );

    // ======================================================
    // UPLOAD FINAL
    // ======================================================

    const uploadedVideo =
      await uploadFinalVideo(
        finalPath
      );

    console.log(
      "[Merge Engine] Upload thành công:",
      uploadedVideo.publicUrl
    );

    console.log(
      "[Merge Engine] Storage path:",
      uploadedVideo.storagePath
    );

    // ======================================================
    // SAVE HISTORY
    // ======================================================

    const historyResult =
      await saveVideoHistory({
        userId:
          authenticatedUser.id,

        videoUrl:
          uploadedVideo.publicUrl,

        storagePath:
          uploadedVideo.storagePath,

        durationSeconds:
          plannedDuration,
      });

    if (
      historyResult.saved
    ) {
      console.log(
        "[Video History] Video sẽ hết hạn sau 72 giờ theo expires_at của database."
      );
    } else {
      console.warn(
        "[Video History] Video đã render/upload thành công nhưng History chưa lưu được."
      );
    }

    // ======================================================
    // RETURN
    // ======================================================

    return NextResponse.json({
      success:
        true,

      mergedVideoUrl:
        uploadedVideo.publicUrl,

      downloadUrl:
        uploadedVideo.publicUrl,

      storagePath:
        uploadedVideo.storagePath,

      scenes:
        scenes.length,

      plannedDuration,

      historySaved:
        historyResult.saved,

      historyId:
        historyResult.id,

      historyExpiresHours:
        72,

      editor: {
        dynamic_trim:
          true,

        normalized_resolution:
          "720x1280",

        fps:
          30,

        codec:
          "H.264",

        audio:
          true,

        audio_codec:
          "AAC",

        audio_sample_rate:
          AUDIO_SAMPLE_RATE,

        voice_type:
          voiceType,

        tts_speed_limit:
          MAX_TTS_SPEED,

        subtitles:
          true,

        subtitles_burned:
          subtitlesBurned,

        subtitle_count:
          subtitleCount,

        subtitle_format:
          "SRT",

        subtitle_position:
          "lower-middle",
      },
    });
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      "[Merge Engine] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể gộp video: " +
          message,
      },
      {
        status: 500,
      }
    );
  } finally {
    // ======================================================
    // CLEAN TEMP FILES
    // ======================================================

    if (
      workDir
    ) {
      try {
        await fs.rm(
          workDir,
          {
            recursive:
              true,

            force:
              true,
          }
        );
      } catch (
        cleanupError
      ) {
        console.warn(
          "[Merge Engine] Không xóa được temp folder:",
          cleanupError
        );
      }
    }
  }
}