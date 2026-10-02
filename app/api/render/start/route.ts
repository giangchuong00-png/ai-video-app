import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  calculateCredits,
  type VideoMode,
} from "@/lib/pricing";

export const runtime = "nodejs";

// ======================================================
// SUPABASE
// ======================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      )
    : null;

// ======================================================
// TYPES
// ======================================================

type AuthenticatedUser = {
  id: string;
  email: string;
};

type StartRenderRpcRow = {
  success?: boolean;
  render_job_id?: string | null;
  remaining_credits?: number | null;
  error_code?: string | null;
};

// ======================================================
// AUTH
// ======================================================

async function getAuthenticatedUser(
  req: Request
): Promise<AuthenticatedUser> {
  if (!supabase) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED"
    );
  }

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
      "[Render Start Auth] Invalid token:",
      error?.message
    );

    throw new Error(
      "UNAUTHORIZED"
    );
  }

  const email =
    data.user.email
      ?.toLowerCase()
      .trim();

  if (!email) {
    throw new Error(
      "USER_EMAIL_NOT_FOUND"
    );
  }

  return {
    id:
      data.user.id,

    email,
  };
}

// ======================================================
// NORMALIZERS
// ======================================================

function normalizeVideoMode(
  value: unknown
): VideoMode {
  return value ===
    "hd_pro"
    ? "hd_pro"
    : "fast";
}

function normalizeTargetDuration(
  value: unknown
): 15 | 30 | 60 {
  const numberValue =
    Number(value);

  if (
    numberValue === 15 ||
    numberValue === 30 ||
    numberValue === 60
  ) {
    return numberValue;
  }

  throw new Error(
    "INVALID_TARGET_DURATION"
  );
}

function normalizeRenderRequestId(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      "INVALID_REQUEST_ID"
    );
  }

  const requestId =
    value.trim();

  if (
    !requestId ||
    requestId.length > 200
  ) {
    throw new Error(
      "INVALID_REQUEST_ID"
    );
  }

  return requestId;
}

function parseSceneDuration(
  value: unknown
): number {
  if (
    typeof value ===
    "number"
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      throw new Error(
        "INVALID_SCENE_DURATION"
      );
    }

    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const match =
      value.match(
        /(\d+(?:\.\d+)?)/
      );

    if (!match) {
      throw new Error(
        "INVALID_SCENE_DURATION"
      );
    }

    const parsed =
      Number(
        match[1]
      );

    if (
      !Number.isFinite(
        parsed
      )
    ) {
      throw new Error(
        "INVALID_SCENE_DURATION"
      );
    }

    return parsed;
  }

  throw new Error(
    "INVALID_SCENE_DURATION"
  );
}

// ======================================================
// SCENE PLAN VALIDATION
// ======================================================

function normalizeSceneDurations(
  value: unknown,
  targetDuration: number
): number[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new Error(
      "SCENE_DURATIONS_REQUIRED"
    );
  }

  if (
    value.length === 0 ||
    value.length > 30
  ) {
    throw new Error(
      "INVALID_SCENE_COUNT"
    );
  }

  const durations =
    value.map(
      parseSceneDuration
    );

  for (
    const duration of durations
  ) {
    if (
      duration < 1 ||
      duration > 6
    ) {
      throw new Error(
        "INVALID_SCENE_DURATION"
      );
    }
  }

  const total =
    durations.reduce(
      (
        sum,
        duration
      ) =>
        sum +
        duration,
      0
    );

  const difference =
    Math.abs(
      total -
        targetDuration
    );

  if (
    difference > 0.6
  ) {
    console.warn(
      "[Render Start] Duration mismatch:",
      {
        targetDuration,
        total,
        difference,
        durations,
      }
    );

    throw new Error(
      "SCENE_DURATION_TOTAL_MISMATCH"
    );
  }

  return durations;
}

// ======================================================
// CREDIT SHARE ALLOCATION
// ======================================================

function allocateSceneCreditShares(
  sceneDurations: number[],
  totalCredits: number
): number[] {
  if (
    sceneDurations.length ===
    0
  ) {
    throw new Error(
      "INVALID_SCENE_COUNT"
    );
  }

  if (
    !Number.isInteger(
      totalCredits
    ) ||
    totalCredits <= 0
  ) {
    throw new Error(
      "INVALID_SERVER_PRICE"
    );
  }

  const totalDuration =
    sceneDurations.reduce(
      (
        sum,
        duration
      ) =>
        sum +
        duration,
      0
    );

  if (
    !Number.isFinite(
      totalDuration
    ) ||
    totalDuration <= 0
  ) {
    throw new Error(
      "INVALID_SCENE_DURATION"
    );
  }

  const rawShares =
    sceneDurations.map(
      (
        duration,
        index
      ) => {
        const exact =
          (
            duration /
            totalDuration
          ) *
          totalCredits;

        const floorValue =
          Math.floor(
            exact
          );

        return {
          index,
          floorValue,
          remainder:
            exact -
            floorValue,
        };
      }
    );

  const shares =
    rawShares.map(
      (
        item
      ) =>
        item.floorValue
    );

  let remaining =
    totalCredits -
    shares.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    );

  const remainderOrder =
    [...rawShares].sort(
      (
        a,
        b
      ) =>
        b.remainder -
        a.remainder
    );

  let cursor =
    0;

  while (
    remaining > 0
  ) {
    const target =
      remainderOrder[
        cursor %
          remainderOrder.length
      ];

    shares[
      target.index
    ] += 1;

    remaining -= 1;
    cursor += 1;
  }

  const finalTotal =
    shares.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    );

  if (
    finalTotal !==
    totalCredits
  ) {
    throw new Error(
      "SCENE_SHARE_TOTAL_MISMATCH"
    );
  }

  return shares;
}

// ======================================================
// START RENDER JOB ATOMIC RPC
// ======================================================

async function startRenderJobAtomic({
  user,
  videoMode,
  targetDuration,
  totalCredits,
  sceneDurations,
  sceneCreditShares,
  requestId,
}: {
  user: AuthenticatedUser;
  videoMode: VideoMode;
  targetDuration:
    | 15
    | 30
    | 60;
  totalCredits: number;
  sceneDurations: number[];
  sceneCreditShares: number[];
  requestId: string;
}) {
  if (!supabase) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED"
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "start_reelbo_render_job",
      {
        p_user_id:
          user.id,

        p_email:
          user.email,

        p_video_mode:
          videoMode,

        p_duration_seconds:
          targetDuration,

        p_total_credits:
          totalCredits,

        p_scene_durations:
          sceneDurations,

        p_scene_credit_shares:
          sceneCreditShares,

        p_request_id:
          requestId,
      }
    );

  if (error) {
    console.error(
      "[Render Start RPC] Error:",
      error
    );

    throw new Error(
      "START_RENDER_RPC_FAILED"
    );
  }

  const row:
    StartRenderRpcRow | null =
    Array.isArray(data)
      ? data[0] || null
      : data || null;

  if (!row) {
    throw new Error(
      "START_RENDER_RESULT_EMPTY"
    );
  }

  if (
    row.success !==
    true
  ) {
    const errorCode =
      String(
        row.error_code ||
        ""
      );

    if (
      errorCode ===
      "INSUFFICIENT_CREDITS"
    ) {
      throw new Error(
        "INSUFFICIENT_CREDITS"
      );
    }

    if (
      errorCode ===
      "PROFILE_NOT_FOUND"
    ) {
      throw new Error(
        "PROFILE_NOT_FOUND"
      );
    }

    if (
      errorCode ===
      "INVALID_COST"
    ) {
      throw new Error(
        "INVALID_COST"
      );
    }

    if (
      errorCode ===
      "INVALID_USER"
    ) {
      throw new Error(
        "INVALID_USER"
      );
    }

    if (
      errorCode ===
      "INVALID_EMAIL"
    ) {
      throw new Error(
        "INVALID_EMAIL"
      );
    }

    if (
      errorCode ===
      "INVALID_REQUEST_ID"
    ) {
      throw new Error(
        "INVALID_REQUEST_ID"
      );
    }

    if (
      errorCode ===
      "INVALID_DURATION"
    ) {
      throw new Error(
        "INVALID_TARGET_DURATION"
      );
    }

    if (
      errorCode ===
      "INVALID_VIDEO_MODE"
    ) {
      throw new Error(
        "INVALID_VIDEO_MODE"
      );
    }

    if (
      errorCode ===
      "INVALID_SCENE_DURATIONS"
    ) {
      throw new Error(
        "SCENE_DURATIONS_REQUIRED"
      );
    }

    if (
      errorCode ===
      "INVALID_SCENE_COUNT"
    ) {
      throw new Error(
        "INVALID_SCENE_COUNT"
      );
    }

    if (
      errorCode ===
      "INVALID_SCENE_CREDIT_SHARES"
    ) {
      throw new Error(
        "INVALID_SCENE_CREDIT_SHARES"
      );
    }

    if (
      errorCode ===
      "SCENE_SHARE_COUNT_MISMATCH"
    ) {
      throw new Error(
        "SCENE_SHARE_COUNT_MISMATCH"
      );
    }

    if (
      errorCode ===
      "SCENE_SHARE_TOTAL_MISMATCH"
    ) {
      throw new Error(
        "SCENE_SHARE_TOTAL_MISMATCH"
      );
    }

    throw new Error(
      "START_RENDER_FAILED"
    );
  }

  const renderJobId =
    row.render_job_id
      ? String(
          row.render_job_id
        )
      : "";

  if (!renderJobId) {
    throw new Error(
      "RENDER_JOB_ID_MISSING"
    );
  }

  return {
    renderJobId,

    remainingCredits:
      typeof row
        .remaining_credits ===
      "number"
        ? row
            .remaining_credits
        : null,
  };
}

// ======================================================
// MOCK RENDER JOB — IDEMPOTENT
// ======================================================

async function startMockRenderJob({
  user,
  videoMode,
  targetDuration,
  sceneDurations,
  sceneCreditShares,
  requestId,
}: {
  user: AuthenticatedUser;
  videoMode: VideoMode;
  targetDuration:
    | 15
    | 30
    | 60;
  sceneDurations: number[];
  sceneCreditShares: number[];
  requestId: string;
}) {
  if (!supabase) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED"
    );
  }

  // Nếu cùng request mock đã tồn tại,
  // trả lại job cũ thay vì tạo job mới.
  const {
    data:
      existingJob,
    error:
      existingError,
  } =
    await supabase
      .from(
        "render_jobs"
      )
      .select(
        "id, expires_at"
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "request_id",
        requestId
      )
      .maybeSingle();

  if (
    existingError
  ) {
    console.error(
      "[Render Start Mock] Existing job query failed:",
      existingError
    );

    throw new Error(
      "RENDER_JOB_QUERY_FAILED"
    );
  }

  if (
    existingJob
  ) {
    return {
      renderJobId:
        existingJob.id,

      expiresAt:
        existingJob
          .expires_at,

      reused:
        true,
    };
  }

  const {
    data:
      renderJob,
    error:
      renderJobError,
  } =
    await supabase
      .from(
        "render_jobs"
      )
      .insert({
        user_id:
          user.id,

        pricing_action:
          "full_render",

        video_mode:
          videoMode,

        duration_seconds:
          targetDuration,

        // Mock không trừ Credits.
        total_credits:
          0,

        scene_count:
          sceneDurations.length,

        scene_durations:
          sceneDurations,

        scene_credit_shares:
          sceneCreditShares,

        request_id:
          requestId,

        status:
          "active",
      })
      .select(
        "id, expires_at"
      )
      .single();

  if (
    renderJobError ||
    !renderJob
  ) {
    console.error(
      "[Render Start Mock] Failed creating job:",
      renderJobError
    );

    // Có thể một request song song
    // vừa tạo cùng request_id.
    if (
      renderJobError
        ?.code ===
      "23505"
    ) {
      const {
        data:
          racedJob,
      } =
        await supabase
          .from(
            "render_jobs"
          )
          .select(
            "id, expires_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "request_id",
            requestId
          )
          .maybeSingle();

      if (
        racedJob
      ) {
        return {
          renderJobId:
            racedJob.id,

          expiresAt:
            racedJob
              .expires_at,

          reused:
            true,
        };
      }
    }

    throw new Error(
      "RENDER_JOB_CREATE_FAILED"
    );
  }

  return {
    renderJobId:
      renderJob.id,

    expiresAt:
      renderJob
        .expires_at,

    reused:
      false,
  };
}

// ======================================================
// POST
// ======================================================

export async function POST(
  req: Request
) {
  try {
    // ==================================================
    // 1. AUTH
    // ==================================================

    const user =
      await getAuthenticatedUser(
        req
      );

    // ==================================================
    // 2. BODY
    // ==================================================

    const body =
      await req.json();

    const requestId =
      normalizeRenderRequestId(
        body?.render_request_id
      );

    const targetDuration =
      normalizeTargetDuration(
        body?.duration_seconds
      );

    const videoMode =
      normalizeVideoMode(
        body?.video_mode
      );

    const sceneDurations =
      normalizeSceneDurations(
        body?.scene_durations,
        targetDuration
      );

    // ==================================================
    // 3. SERVER PRICING
    // ==================================================

    const pricing =
      calculateCredits({
        action:
          "full_render",

        durationSeconds:
          targetDuration,

        videoMode,
      });

    const totalCredits =
      pricing.credits;

    if (
      !Number.isInteger(
        totalCredits
      ) ||
      totalCredits <= 0
    ) {
      throw new Error(
        "INVALID_SERVER_PRICE"
      );
    }

    // ==================================================
    // 4. ALLOCATE PER-SCENE CREDIT SHARE
    // ==================================================

    const sceneCreditShares =
      allocateSceneCreditShares(
        sceneDurations,
        totalCredits
      );

    console.log(
      "[Render Start] Request:",
      {
        requestId,
        totalCredits,
        sceneDurations,
        sceneCreditShares,
      }
    );

    // ==================================================
    // 5. MOCK MODE
    // ==================================================

    const mockMode =
      process.env
        .VIDEO_MOCK_MODE ===
      "true";

    if (
      mockMode
    ) {
      const mockResult =
        await startMockRenderJob({
          user,
          videoMode,
          targetDuration,
          sceneDurations,
          sceneCreditShares,
          requestId,
        });

      return NextResponse.json({
        success:
          true,

        mock:
          true,

        reused:
          mockResult.reused,

        render_request_id:
          requestId,

        render_job_id:
          mockResult.renderJobId,

        scene_count:
          sceneDurations.length,

        scene_durations:
          sceneDurations,

        scene_credit_shares:
          sceneCreditShares,

        pricing: {
          credits:
            0,

          listed_credits:
            totalCredits,

          pricing_version:
            pricing.pricingVersion,

          action:
            "full_render",

          video_mode:
            videoMode,

          duration_seconds:
            targetDuration,
        },

        remaining_credits:
          null,

        expires_at:
          mockResult.expiresAt,
      });
    }

    // ==================================================
    // 6. REAL MODE — IDEMPOTENT ATOMIC RPC
    // ==================================================

    const result =
      await startRenderJobAtomic({
        user,
        videoMode,
        targetDuration,
        totalCredits,
        sceneDurations,
        sceneCreditShares,
        requestId,
      });

    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({
      success:
        true,

      mock:
        false,

      render_request_id:
        requestId,

      render_job_id:
        result.renderJobId,

      scene_count:
        sceneDurations.length,

      scene_durations:
        sceneDurations,

      scene_credit_shares:
        sceneCreditShares,

      pricing: {
        credits:
          totalCredits,

        listed_credits:
          totalCredits,

        pricing_version:
          pricing.pricingVersion,

        action:
          "full_render",

        video_mode:
          videoMode,

        duration_seconds:
          targetDuration,
      },

      remaining_credits:
        result.remainingCredits,
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "[Render Start] Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    let status =
      500;

    let publicMessage =
      "Không thể bắt đầu render.";

    if (
      message ===
      "UNAUTHORIZED"
    ) {
      status = 401;

      publicMessage =
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.";
    }

    if (
      message ===
      "USER_EMAIL_NOT_FOUND"
    ) {
      status = 401;

      publicMessage =
        "Tài khoản không có email hợp lệ.";
    }

    if (
      message ===
      "INVALID_REQUEST_ID"
    ) {
      status = 400;

      publicMessage =
        "Mã yêu cầu render không hợp lệ.";
    }

    if (
      message ===
      "INSUFFICIENT_CREDITS"
    ) {
      status = 402;

      publicMessage =
        "Không đủ Credits.";
    }

    if (
      message ===
      "PROFILE_NOT_FOUND"
    ) {
      status = 404;

      publicMessage =
        "Không tìm thấy tài khoản.";
    }

    if (
      message ===
      "INVALID_TARGET_DURATION"
    ) {
      status = 400;

      publicMessage =
        "Thời lượng video phải là 15s, 30s hoặc 60s.";
    }

    if (
      message ===
      "INVALID_VIDEO_MODE"
    ) {
      status = 400;

      publicMessage =
        "Chế độ video không hợp lệ.";
    }

    if (
      message ===
      "SCENE_DURATIONS_REQUIRED"
    ) {
      status = 400;

      publicMessage =
        "Thiếu kế hoạch thời lượng phân cảnh.";
    }

    if (
      message ===
      "INVALID_SCENE_COUNT"
    ) {
      status = 400;

      publicMessage =
        "Số lượng phân cảnh không hợp lệ.";
    }

    if (
      message ===
      "INVALID_SCENE_DURATION"
    ) {
      status = 400;

      publicMessage =
        "Thời lượng một hoặc nhiều phân cảnh không hợp lệ.";
    }

    if (
      message ===
      "SCENE_DURATION_TOTAL_MISMATCH"
    ) {
      status = 400;

      publicMessage =
        "Tổng thời lượng các phân cảnh không khớp với gói video.";
    }

    if (
      message ===
      "INVALID_SCENE_CREDIT_SHARES"
    ) {
      status = 500;

      publicMessage =
        "Kế hoạch Credits phân cảnh không hợp lệ.";
    }

    if (
      message ===
        "SCENE_SHARE_COUNT_MISMATCH" ||
      message ===
        "SCENE_SHARE_TOTAL_MISMATCH"
    ) {
      status = 500;

      publicMessage =
        "Phân bổ Credits cho phân cảnh không hợp lệ.";
    }

    return NextResponse.json(
      {
        error:
          publicMessage,

        code:
          message,
      },
      {
        status,
      }
    );
  }
}