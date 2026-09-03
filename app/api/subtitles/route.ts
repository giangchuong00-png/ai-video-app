import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ==========================================================
// TYPES
// ==========================================================

type SubtitleScene = {
  duration?: string | number;
  voiceover?: string;
};

type SubtitleRequestBody = {
  scenes?: SubtitleScene[];
};

// ==========================================================
// DURATION
// ==========================================================

function parseDuration(
  value: unknown,
  fallback = 3
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  if (
    typeof value !== "string"
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

  const seconds =
    Number(match[1]);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return fallback;
  }

  return seconds;
}

// ==========================================================
// SRT TIME
// ==========================================================

function formatSrtTime(
  seconds: number
): string {
  const safeSeconds =
    Math.max(
      0,
      seconds
    );

  const totalMilliseconds =
    Math.round(
      safeSeconds * 1000
    );

  const hours =
    Math.floor(
      totalMilliseconds /
        3600000
    );

  const minutes =
    Math.floor(
      (
        totalMilliseconds %
        3600000
      ) /
        60000
    );

  const secs =
    Math.floor(
      (
        totalMilliseconds %
        60000
      ) /
        1000
    );

  const milliseconds =
    totalMilliseconds %
    1000;

  return [
    String(hours).padStart(
      2,
      "0"
    ),
    String(minutes).padStart(
      2,
      "0"
    ),
    String(secs).padStart(
      2,
      "0"
    ),
  ].join(":") +
    "," +
    String(
      milliseconds
    ).padStart(
      3,
      "0"
    );
}

// ==========================================================
// TEXT CLEANER
// ==========================================================

function cleanVoiceover(
  text: string
): string {
  return String(
    text || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// ==========================================================
// WORD SPLITTER
// ==========================================================
//
// Caption TikTok không nên hiện nguyên một câu dài.
//
// Mục tiêu:
// khoảng 3–7 từ / caption.
//

function splitIntoCaptionChunks(
  text: string,
  maxWords = 6
): string[] {
  const clean =
    cleanVoiceover(
      text
    );

  if (!clean) {
    return [];
  }

  const words =
    clean.split(
      /\s+/
    );

  if (
    words.length <=
    maxWords
  ) {
    return [clean];
  }

  const chunks:
    string[] = [];

  let current:
    string[] = [];

  for (
    const word of
    words
  ) {
    current.push(
      word
    );

    const joined =
      current.join(
        " "
      );

    const naturalBreak =
      /[,.!?;:]$/.test(
        word
      );

    if (
      current.length >=
        maxWords ||
      (
        naturalBreak &&
        current.length >=
          3
      )
    ) {
      chunks.push(
        joined
      );

      current = [];
    }
  }

  if (
    current.length > 0
  ) {
    chunks.push(
      current.join(
        " "
      )
    );
  }

  return chunks;
}

// ==========================================================
// CAPTION TIMELINE
// ==========================================================

function buildSceneCaptions({
  text,
  sceneStart,
  sceneDuration,
}: {
  text: string;
  sceneStart: number;
  sceneDuration: number;
}) {
  const chunks =
    splitIntoCaptionChunks(
      text
    );

  if (
    chunks.length === 0
  ) {
    return [];
  }

  const wordCounts =
    chunks.map(
      (chunk) =>
        chunk
          .split(/\s+/)
          .filter(Boolean)
          .length
    );

  const totalWords =
    wordCounts.reduce(
      (
        sum,
        count
      ) =>
        sum + count,
      0
    );

  let cursor =
    sceneStart;

  return chunks.map(
    (
      chunk,
      index
    ) => {
      const ratio =
        totalWords > 0
          ? wordCounts[
              index
            ] /
            totalWords
          : 1 /
            chunks.length;

      let duration =
        sceneDuration *
        ratio;

      // caption quá nhanh sẽ khó đọc
      duration =
        Math.max(
          0.65,
          duration
        );

      const sceneEnd =
        sceneStart +
        sceneDuration;

      let end =
        cursor +
        duration;

      if (
        index ===
        chunks.length - 1 ||
        end >
          sceneEnd
      ) {
        end =
          sceneEnd;
      }

      const item = {
        text:
          chunk,

        start:
          cursor,

        end,
      };

      cursor =
        end;

      return item;
    }
  );
}

// ==========================================================
// POST
// ==========================================================

export async function POST(
  req: Request
) {
  try {
    const body:
      SubtitleRequestBody =
      await req.json();

    const scenes =
      Array.isArray(
        body.scenes
      )
        ? body.scenes
        : [];

    if (
      scenes.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Không có scenes để tạo subtitle.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // BUILD GLOBAL TIMELINE
    // ======================================================

    let sceneCursor =
      0;

    const captions: {
      text: string;
      start: number;
      end: number;
      scene_number: number;
    }[] = [];

    scenes.forEach(
      (
        scene,
        sceneIndex
      ) => {
        const duration =
          parseDuration(
            scene.duration,
            3
          );

        const voiceover =
          cleanVoiceover(
            scene.voiceover ||
            ""
          );

        if (voiceover) {
          const sceneCaptions =
            buildSceneCaptions({
              text:
                voiceover,

              sceneStart:
                sceneCursor,

              sceneDuration:
                duration,
            });

          sceneCaptions.forEach(
            (
              caption
            ) => {
              captions.push({
                ...caption,

                scene_number:
                  sceneIndex +
                  1,
              });
            }
          );
        }

        sceneCursor +=
          duration;
      }
    );

    // ======================================================
    // BUILD SRT
    // ======================================================

    const srt =
      captions
        .map(
          (
            caption,
            index
          ) => {
            return [
              String(
                index + 1
              ),

              `${formatSrtTime(
                caption.start
              )} --> ${formatSrtTime(
                caption.end
              )}`,

              caption.text,

              "",
            ].join(
              "\n"
            );
          }
        )
        .join(
          "\n"
        );

    console.log(
      `[Subtitle Engine] scenes=${scenes.length} | captions=${captions.length} | duration=${sceneCursor.toFixed(
        1
      )}s`
    );

    return NextResponse.json({
      success: true,

      captions,

      srt,

      total_duration:
        sceneCursor,

      caption_count:
        captions.length,

      style: {
        format:
          "short-form",

        recommended_position:
          "lower-middle",

        recommended_max_words:
          6,
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
      "[Subtitle Engine] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tạo subtitle: " +
          message,
      },
      {
        status: 500,
      }
    );
  }
}