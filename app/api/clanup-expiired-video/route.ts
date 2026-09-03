import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ==========================================================
// SUPABASE SERVICE CLIENT
// ==========================================================

function getServiceSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Thiếu Supabase URL hoặc SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// ==========================================================
// AUTHORIZE CRON
// ==========================================================

function isAuthorized(req: Request) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[Cleanup] Thiếu CRON_SECRET."
    );

    return false;
  }

  const authorization =
    req.headers.get(
      "authorization"
    );

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

// ==========================================================
// CLEANUP
// ==========================================================

async function cleanupExpiredVideos() {
  const supabase =
    getServiceSupabase();

  const now =
    new Date().toISOString();

  // ========================================================
  // FIND EXPIRED JOBS
  // ========================================================

  const {
    data: expiredJobs,
    error: fetchError,
  } =
    await supabase
      .from("video_jobs")
      .select(
        "id, storage_path, video_url, expires_at"
      )
      .lt(
        "expires_at",
        now
      )
      .limit(100);

  if (fetchError) {
    throw new Error(
      `Không đọc được video hết hạn: ${fetchError.message}`
    );
  }

  if (
    !expiredJobs ||
    expiredJobs.length === 0
  ) {
    return {
      checked: 0,
      storageDeleted: 0,
      recordsDeleted: 0,
    };
  }

  console.log(
    `[Cleanup] Found ${expiredJobs.length} expired videos`
  );

  // ========================================================
  // STORAGE PATHS
  // ========================================================

  const storagePaths =
    expiredJobs
      .map(
        (job) =>
          job.storage_path
      )
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.trim().length >
            0
      );

  // ========================================================
  // DELETE STORAGE FILES
  // ========================================================

  if (
    storagePaths.length >
    0
  ) {
    const {
      error:
        storageError,
    } =
      await supabase.storage
        .from(
          "reelbo-videos"
        )
        .remove(
          storagePaths
        );

    if (storageError) {
      throw new Error(
        `Không xóa được video khỏi Storage: ${storageError.message}`
      );
    }

    console.log(
      `[Cleanup] Deleted ${storagePaths.length} storage files`
    );
  }

  // ========================================================
  // DELETE DATABASE RECORDS
  // ========================================================

  const jobIds =
    expiredJobs.map(
      (job) => job.id
    );

  const {
    error:
      deleteError,
  } =
    await supabase
      .from(
        "video_jobs"
      )
      .delete()
      .in(
        "id",
        jobIds
      );

  if (deleteError) {
    throw new Error(
      `Không xóa được video_jobs: ${deleteError.message}`
    );
  }

  console.log(
    `[Cleanup] Deleted ${jobIds.length} video_jobs`
  );

  return {
    checked:
      expiredJobs.length,

    storageDeleted:
      storagePaths.length,

    recordsDeleted:
      jobIds.length,
  };
}

// ==========================================================
// GET — VERCEL CRON
// ==========================================================

export async function GET(
  req: Request
) {
  try {
    if (
      !isAuthorized(req)
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const result =
      await cleanupExpiredVideos();

    return NextResponse.json({
      success: true,
      ...result,
      cleanedAt:
        new Date().toISOString(),
    });
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      "[Cleanup] Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}