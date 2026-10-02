import { NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

type ProductIdentity = {
  name?: string;
  category?: string;
  main_color?: string;
  secondary_colors?: string[];
  material?: string;
  shape?: string;
  logo_or_text?: string;
  texture?: string;
  distinctive_features?: string[];
  product_anchor_prompt?: string;
};

type SceneSpec = {
  purpose?: string;
  location?: string;
  shot_type?: string;
  camera_angle?: string;
  camera_movement?: string;
  lighting?: string;
  subject?: string;
  product?: string;
  action?: string;
  composition?: string;
  motion_complexity?: string;
  product_visibility?: string;
  character_visibility?: string;
  continuity_instruction?: string;
  forbidden?: string[];
};

type CinematicSpec = {
  lens_look?: string;
  aperture_feel?: string;
  depth_of_field?: string;
  camera_distance?: string;
  camera_height?: string;
  camera_motion?: string;
  motion_strength?: string;
  stabilization?: string;
  lighting_style?: string;
  key_light_direction?: string;
  shadow_style?: string;
  color_temperature?: string;
  realism_profile?: string;
  physical_plausibility?: string;
  product_preservation_priority?: string;
  character_preservation_priority?: string;
};

type ChargeRpcRow = {
  success?: boolean;
  charged?: boolean;
  remaining_credits?: number | null;
  error_code?: string | null;
};

type RefundRpcRow = {
  success?: boolean;
  refunded?: boolean;
  remaining_credits?: number | null;
  error_code?: string | null;
};

type AuthenticatedUser = {
  id: string;
  email: string;
};

type GenerationAction =
  | "full_render"
  | "regenerate";

type RenderJobValidationResult = {
  videoMode: VideoMode;
  lockedDuration: number;
  sceneCreditShare: number;
};

type RefundContext = {
  userId: string;
  email: string;
  credits: number;
  idempotencyKey: string;
  renderJobId: string | null;
  sceneNumber: number | null;
  action: GenerationAction;
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
      "[Generate Auth] Invalid token:",
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
// HELPERS
// ======================================================

function getOutputUrl(
  output: any
): string {
  if (!output) {
    return "";
  }

  if (
    typeof output ===
    "string"
  ) {
    return output;
  }

  if (
    Array.isArray(
      output
    )
  ) {
    if (
      output.length ===
      0
    ) {
      return "";
    }

    return getOutputUrl(
      output[0]
    );
  }

  if (
    output?.url
  ) {
    if (
      typeof output.url ===
      "function"
    ) {
      const result =
        output.url();

      if (
        typeof result ===
        "string"
      ) {
        return result;
      }

      if (
        result?.href
      ) {
        return result.href;
      }

      return String(
        result || ""
      );
    }

    return String(
      output.url
    );
  }

  return "";
}

function normalizeDuration(
  duration: unknown
): number {
  if (
    typeof duration ===
    "number"
  ) {
    if (
      Number.isFinite(
        duration
      )
    ) {
      return Math.max(
        1,
        duration
      );
    }

    return 3;
  }

  if (
    typeof duration !==
    "string"
  ) {
    return 3;
  }

  const match =
    duration.match(
      /(\d+(?:\.\d+)?)/
    );

  if (!match) {
    return 3;
  }

  const value =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return 3;
  }

  return Math.max(
    1,
    value
  );
}

function normalizeVideoMode(
  value: unknown
): VideoMode {
  return value ===
    "hd_pro"
    ? "hd_pro"
    : "fast";
}

function normalizeAction(
  value: unknown
): GenerationAction {
  return value ===
    "regenerate"
    ? "regenerate"
    : "full_render";
}

function normalizeSceneNumber(
  value: unknown
) {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue
    )
  ) {
    throw new Error(
      "INVALID_SCENE_NUMBER"
    );
  }

  const integerValue =
    Math.floor(
      numberValue
    );

  if (
    integerValue <= 0
  ) {
    throw new Error(
      "INVALID_SCENE_NUMBER"
    );
  }

  return integerValue;
}

function durationsMatch(
  requested: number,
  locked: number
) {
  return (
    Math.abs(
      requested -
        locked
    ) <= 0.05
  );
}

function detectProductType(
  productIdentity:
    ProductIdentity | null,
  sceneSpec:
    SceneSpec | null,
  visualPrompt: string
) {
  const text = [
    productIdentity?.name,
    productIdentity?.category,
    sceneSpec?.product,
    visualPrompt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /giày|dép|sandal|shoe|shoes|slipper|footwear/.test(
      text
    )
  ) {
    return "footwear";
  }

  if (
    /áo|shirt|blouse|jacket|hoodie|sweater|top|fashion/.test(
      text
    )
  ) {
    return "upper_fashion";
  }

  if (
    /son|lipstick|serum|kem|cream|skincare|beauty|mỹ phẩm|perfume|nước hoa|phone|điện thoại|earphone|tai nghe/.test(
      text
    )
  ) {
    return "handheld";
  }

  return "general";
}

function getCameraSafety(
  productType: string
) {
  if (
    productType ===
    "footwear"
  ) {
    return `
CAMERA SAFETY:
Close-up footwear framing is allowed.
Ankles, feet and lower legs may appear when necessary to show the product.
Keep leg movement simple.
Avoid long full-body walking.
Avoid running.
Avoid complex stepping or foot choreography.
`;
  }

  if (
    productType ===
    "upper_fashion"
  ) {
    return `
CAMERA SAFETY:
Prefer waist-up, thigh-up and medium framing.
Use simple slow body turns.
Use fabric close-ups when useful.
Avoid complex full-body locomotion.
`;
  }

  if (
    productType ===
    "handheld"
  ) {
    return `
CAMERA SAFETY:
Prefer chest-up, waist-up, medium close-up, hands-with-product and macro product framing.
Avoid unnecessary legs.
Avoid full-body walking.
Avoid complex body motion.
`;
  }

  return `
CAMERA SAFETY:
Prefer controlled medium close-up, waist-up, hands-with-product or product close-up framing.
Keep body movement simple.
Avoid unnecessary complex locomotion.
`;
}

// ======================================================
// IMAGE ENHANCER
// ======================================================

async function enhanceImage(
  replicate: any,
  image: string,
  faceEnhance: boolean
) {
  // BYPASS: Bỏ qua upscale để tiết kiệm 100% chi phí và tránh Rate Limit 429
  return image;
}

// ======================================================
// PROMPT COMPILER
// ======================================================

function compileVideoPrompt({
  visualPrompt,
  sceneSpec,
  cinematicSpec,
  productIdentity,
}: {
  visualPrompt: string;
  sceneSpec: SceneSpec | null;
  cinematicSpec: CinematicSpec | null;
  productIdentity: ProductIdentity | null;
}) {
  const productType = detectProductType(
    productIdentity,
    sceneSpec,
    visualPrompt
  );

  const cameraSafety = getCameraSafety(productType);

  const distinctiveFeatures =
    productIdentity?.distinctive_features?.filter(Boolean).join(", ") || "standard commercial details";

  const secondaryColors =
    productIdentity?.secondary_colors?.filter(Boolean).join(", ") || "";

  const forbidden = Array.isArray(sceneSpec?.forbidden)
    ? sceneSpec!.forbidden!.join(", ")
    : "";

  const productName = productIdentity?.name || sceneSpec?.product || "the featured product";
  const mainColor = productIdentity?.main_color ? `exact ${productIdentity.main_color}` : "authentic color";
  const material = productIdentity?.material || "original texture and premium finish";
  const technicalAnchor = productIdentity?.product_anchor_prompt
    ? `EXACT PRODUCT SPECIFICATION: ${productIdentity.product_anchor_prompt}.`
    : "";

  return `
CINEMATIC COMMERCIAL 4K ADVERTISING FOOTAGE.

[SUBJECT & PRODUCT LOCK]
${technicalAnchor}
Hero product: ${productName}.
Color integrity: ${mainColor}${secondaryColors ? ` with ${secondaryColors}` : ""}.
Material & Texture: ${material}, ${productIdentity?.texture || "high fidelity tactile surface"}.
Distinctive marks: ${productIdentity?.logo_or_text ? `exact text/logo "${productIdentity.logo_or_text}"` : "preserve all visible branding labels and shapes"}.
Key features: ${distinctiveFeatures}.
CRITICAL: Do NOT alter product geometry, color scheme, or brand markings. Must strictly match reference.

[SCENE & CHARACTER DYNAMICS]
Action: ${sceneSpec?.action || "natural, confident interaction with the product"}.
Environment: ${sceneSpec?.location || "modern premium minimalist interior"}, ${sceneSpec?.lighting || "commercial studio illumination"}.
Character continuity: If person present, maintain identical facial anatomy, realistic skin pores, exact hair style, and natural eye contact. No uncanny valley.

[CINEMATOGRAPHY & OPTICS]
Shot profile: ${sceneSpec?.shot_type || "medium close-up"}, ${sceneSpec?.camera_angle || "eye-level"}.
Lens & Depth: 35mm master prime cinema lens, ${cinematicSpec?.aperture_feel || "f/2.0 smooth bokeh"}, natural commercial depth of field.
Camera movement: ${cinematicSpec?.camera_motion || sceneSpec?.camera_movement || "subtle slow fluid motion, perfectly stabilized"}.
Lighting style: ${cinematicSpec?.lighting_style || "high-end three-point commercial lighting, soft key light, gentle rim light, warm natural tones"}.

[PHYSICAL REALISM & SAFETY]
Strict physical rules: realistic gravity, firm hand grip, zero floating objects, zero hand morphing, realistic fabric and surface physics.
${cameraSafety}

[NEGATIVE INSTRUCTIONS]
FORBIDDEN: plastic skin, AI hallucination, deformed fingers, extra limbs, warped labels, shifting product colors, floating artifacts, jump cuts, erratic camera shakes, low-res textures, cartoon rendering${forbidden ? `, ${forbidden}` : ""}.

[DIRECTOR INSTRUCTION]
${visualPrompt}
`.replace(/\n{3,}/g, "\n\n").trim();
}

// ======================================================
// ATOMIC GENERATION CHARGE + LEDGER
// ======================================================

async function chargeGenerationAtomic({
  userId,
  email,
  credits,
  idempotencyKey,
  sceneNumber,
}: {
  userId: string;
  email: string;
  credits: number;
  idempotencyKey: string;
  sceneNumber: number;
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
      "charge_reelbo_generation",
      {
        p_user_id:
          userId,

        p_email:
          email,

        p_credits:
          credits,

        p_idempotency_key:
          idempotencyKey,

        p_scene_number:
          sceneNumber,

        p_action:
          "regenerate",

        p_note:
          "Manual scene regenerate",
      }
    );

  if (error) {
    console.error(
      "[Generate Charge] RPC error:",
      error
    );

    throw new Error(
      "CREDIT_RPC_FAILED"
    );
  }

  const row:
    ChargeRpcRow | null =
    Array.isArray(data)
      ? data[0] || null
      : data || null;

  if (!row) {
    throw new Error(
      "CREDIT_RESULT_EMPTY"
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
      "INVALID_CREDITS"
    ) {
      throw new Error(
        "INVALID_COST"
      );
    }

    throw new Error(
      "CREDIT_DEDUCTION_FAILED"
    );
  }

  return {
    charged:
      row.charged ===
      true,

    remainingCredits:
      typeof row.remaining_credits ===
      "number"
        ? row.remaining_credits
        : null,
  };
}

// ======================================================
// ATOMIC CREDIT REFUND
// ======================================================

async function refundCreditsAtomic({
  userId,
  email,
  credits,
  idempotencyKey,
  renderJobId,
  sceneNumber,
  action,
  note,
}: {
  userId: string;
  email: string;
  credits: number;
  idempotencyKey: string;
  renderJobId: string | null;
  sceneNumber: number | null;
  action: GenerationAction;
  note: string;
}) {
  if (!supabase) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED"
    );
  }

  if (
    !Number.isInteger(
      credits
    ) ||
    credits <= 0
  ) {
    throw new Error(
      "INVALID_REFUND_AMOUNT"
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "refund_reelbo_credits",
      {
        p_user_id:
          userId,

        p_email:
          email,

        p_credits:
          credits,

        p_idempotency_key:
          idempotencyKey,

        p_render_job_id:
          renderJobId,

        p_scene_number:
          sceneNumber,

        p_action:
          action,

        p_note:
          note,
      }
    );

  if (error) {
    console.error(
      "[Generate Refund] RPC error:",
      error
    );

    throw new Error(
      "REFUND_RPC_FAILED"
    );
  }

  const row:
    RefundRpcRow | null =
    Array.isArray(data)
      ? data[0] || null
      : data || null;

  if (!row) {
    throw new Error(
      "REFUND_RESULT_EMPTY"
    );
  }

  if (
    row.success !==
    true
  ) {
    console.error(
      "[Generate Refund] Refund rejected:",
      row.error_code
    );

    throw new Error(
      String(
        row.error_code ||
        "REFUND_FAILED"
      )
    );
  }

  return {
    newlyRefunded:
      row.refunded ===
      true,

    refundSatisfied:
      true,

    remainingCredits:
      typeof row.remaining_credits ===
      "number"
        ? row.remaining_credits
        : null,
  };
}

// ======================================================
// VALIDATE + RESERVE FULL RENDER SCENE
// ======================================================

async function reserveRenderJobScene({
  renderJobId,
  userId,
  sceneNumber,
  requestedDuration,
}: {
  renderJobId: string;
  userId: string;
  sceneNumber: number;
  requestedDuration: number;
}): Promise<RenderJobValidationResult> {
  if (!supabase) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED"
    );
  }

  const {
    data: renderJob,
    error:
      renderJobError,
  } =
    await supabase
      .from(
        "render_jobs"
      )
      .select(
        "id, user_id, scene_count, scene_durations, scene_credit_shares, status, expires_at, video_mode"
      )
      .eq(
        "id",
        renderJobId
      )
      .maybeSingle();

  if (
    renderJobError
  ) {
    console.error(
      "[Render Job] Query error:",
      renderJobError
    );

    throw new Error(
      "RENDER_JOB_QUERY_FAILED"
    );
  }

  if (!renderJob) {
    throw new Error(
      "RENDER_JOB_NOT_FOUND"
    );
  }

  if (
    renderJob.user_id !==
    userId
  ) {
    throw new Error(
      "RENDER_JOB_FORBIDDEN"
    );
  }

  if (
    renderJob.status !==
    "active"
  ) {
    throw new Error(
      "RENDER_JOB_NOT_ACTIVE"
    );
  }

  const expiresAt =
    new Date(
      renderJob.expires_at
    ).getTime();

  if (
    !Number.isFinite(
      expiresAt
    ) ||
    expiresAt <=
      Date.now()
  ) {
    throw new Error(
      "RENDER_JOB_EXPIRED"
    );
  }

  const sceneCount =
    Number(
      renderJob.scene_count
    );

  if (
    !Number.isInteger(
      sceneCount
    ) ||
    sceneCount <= 0
  ) {
    throw new Error(
      "RENDER_JOB_INVALID"
    );
  }

  if (
    sceneNumber >
    sceneCount
  ) {
    throw new Error(
      "SCENE_OUT_OF_RANGE"
    );
  }

  const rawDurations =
    renderJob.scene_durations;

  if (
    !Array.isArray(
      rawDurations
    ) ||
    rawDurations.length !==
      sceneCount
  ) {
    throw new Error(
      "RENDER_JOB_DURATION_PLAN_INVALID"
    );
  }

  const lockedDuration =
    Number(
      rawDurations[
        sceneNumber -
          1
      ]
    );

  if (
    !Number.isFinite(
      lockedDuration
    ) ||
    lockedDuration < 1 ||
    lockedDuration > 6
  ) {
    throw new Error(
      "RENDER_JOB_DURATION_PLAN_INVALID"
    );
  }

  if (
    !durationsMatch(
      requestedDuration,
      lockedDuration
    )
  ) {
    console.warn(
      "[Render Job] Scene duration tampering detected:",
      {
        renderJobId,
        sceneNumber,
        requestedDuration,
        lockedDuration,
      }
    );

    throw new Error(
      "SCENE_DURATION_MISMATCH"
    );
  }

  const rawCreditShares =
    renderJob.scene_credit_shares;

  if (
    !Array.isArray(
      rawCreditShares
    ) ||
    rawCreditShares.length !==
      sceneCount
  ) {
    throw new Error(
      "RENDER_JOB_CREDIT_PLAN_INVALID"
    );
  }

  const sceneCreditShare =
    Number(
      rawCreditShares[
        sceneNumber -
          1
      ]
    );

  if (
    !Number.isInteger(
      sceneCreditShare
    ) ||
    sceneCreditShare <= 0
  ) {
    throw new Error(
      "RENDER_JOB_CREDIT_PLAN_INVALID"
    );
  }

  const {
    error:
      reservationError,
  } =
    await supabase
      .from(
        "render_job_scenes"
      )
      .insert({
        render_job_id:
          renderJobId,

        scene_number:
          sceneNumber,

        status:
          "processing",
      });

  if (
    reservationError
  ) {
    console.error(
      "[Render Scene Reserve] Error:",
      reservationError
    );

    if (
      reservationError.code ===
      "23505"
    ) {
      throw new Error(
        "SCENE_ALREADY_USED"
      );
    }

    throw new Error(
      "SCENE_RESERVATION_FAILED"
    );
  }

  return {
    videoMode:
      normalizeVideoMode(
        renderJob.video_mode
      ),

    lockedDuration,

    sceneCreditShare,
  };
}

// ======================================================
// UPDATE SCENE STATUS
// ======================================================

async function markSceneCompleted({
  renderJobId,
  sceneNumber,
  videoUrl,
}: {
  renderJobId: string;
  sceneNumber: number;
  videoUrl: string;
}) {
  if (!supabase) {
    return;
  }

  const {
    error,
  } =
    await supabase
      .from(
        "render_job_scenes"
      )
      .update({
        status:
          "completed",

        video_url:
          videoUrl,

        completed_at:
          new Date().toISOString(),
      })
      .eq(
        "render_job_id",
        renderJobId
      )
      .eq(
        "scene_number",
        sceneNumber
      );

  if (error) {
    console.warn(
      "[Render Scene] Could not mark completed:",
      error
    );
  }
}

async function markSceneFailed({
  renderJobId,
  sceneNumber,
}: {
  renderJobId: string;
  sceneNumber: number;
}) {
  if (!supabase) {
    return;
  }

  const {
    error,
  } =
    await supabase
      .from(
        "render_job_scenes"
      )
      .update({
        status:
          "failed",
      })
      .eq(
        "render_job_id",
        renderJobId
      )
      .eq(
        "scene_number",
        sceneNumber
      );

  if (error) {
    console.warn(
      "[Render Scene] Could not mark failed:",
      error
    );
  }
}

// ======================================================
// POST
// ======================================================

export async function POST(
  req: Request
) {
  let reservedRenderJobId:
    string | null =
    null;

  let reservedSceneNumber:
    number | null =
    null;

  let refundContext:
    RefundContext | null =
    null;

  try {
    // ==================================================
    // 0. AUTH
    // ==================================================

    const authenticatedUser =
      await getAuthenticatedUser(
        req
      );

    // ==================================================
    // 1. BODY
    // ==================================================

    const body =
      await req.json();

    const {
      visual_prompt = "",
      scene_spec = null,
      cinematic_spec = null,
      product_identity = null,

      duration = "3s",

      voiceover = "",
      voiceType = "nu_bac",

      scene_number = 1,

      imageUrl = null,
      lastFrameUrl = null,
      kocImageUrl = null,

      hasCharacter = false,

      render_job_id = null,

      action = "full_render",

      video_mode = "fast",

      generation_request_id = null,
    } = body;
    const resolvedProductImage =
    imageUrl ||
    body.product_image ||
    body.productImageUrl ||
    body.productImage ||
    null;

  const resolvedKocImage =
    kocImageUrl ||
    body.koc_image ||
    body.kocImageUrl ||
    body.kocImage ||
    null;
    const generationAction =
      normalizeAction(
        action
      );

    const sceneNumber =
      normalizeSceneNumber(
        scene_number
      );

    const requestedDuration =
      normalizeDuration(
        duration
      );

    if (
      !String(
        visual_prompt
      ).trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Thiếu visual_prompt.",
        },
        {
          status:
            400,
        }
      );
    }

    // ==================================================
    // 2. MOCK MODE
    // ==================================================

    const mockMode =
      process.env
        .VIDEO_MOCK_MODE ===
      "true";

    // ==================================================
    // 3. PRICING / RENDER JOB
    // ==================================================

    let effectiveVideoMode:
      VideoMode =
      normalizeVideoMode(
        video_mode
      );

    let effectiveDuration =
      requestedDuration;

    let creditsDeducted =
      0;

    let remainingCredits:
      number | null =
      null;

    if (
      generationAction ===
      "full_render"
    ) {
      const safeRenderJobId =
        String(
          render_job_id ||
          ""
        ).trim();

      if (
        !safeRenderJobId
      ) {
        throw new Error(
          "RENDER_JOB_REQUIRED"
        );
      }

      const reservation =
        await reserveRenderJobScene({
          renderJobId:
            safeRenderJobId,

          userId:
            authenticatedUser.id,

          sceneNumber,

          requestedDuration,
        });

      reservedRenderJobId =
        safeRenderJobId;

      reservedSceneNumber =
        sceneNumber;

      effectiveVideoMode =
        reservation.videoMode;

      effectiveDuration =
        reservation.lockedDuration;

      if (
        !mockMode
      ) {
        refundContext = {
          userId:
            authenticatedUser.id,

          email:
            authenticatedUser.email,

          credits:
            reservation
              .sceneCreditShare,

          idempotencyKey:
            `refund:full_render:${safeRenderJobId}:scene:${sceneNumber}`,

          renderJobId:
            safeRenderJobId,

          sceneNumber,

          action:
            "full_render",
        };
      }
      
      creditsDeducted =
        0;
    } else {
      // ==================================================
      // REGENERATE
      // ==================================================

      const pricing =
        calculateCredits({
          action:
            "regenerate",

          durationSeconds:
            requestedDuration,

          videoMode:
            effectiveVideoMode,
        });

      const regenerateCost =
        pricing.credits;

      if (
        !mockMode
      ) {
        const operationId =
          String(
            generation_request_id ||
            ""
          ).trim() ||
          randomUUID();

        const chargeKey =
          `charge:regenerate:${operationId}`;

        const refundKey =
          `refund:regenerate:${operationId}`;

        const creditResult =
          await chargeGenerationAtomic({
            userId:
              authenticatedUser.id,

            email:
              authenticatedUser.email,

            credits:
              regenerateCost,

            idempotencyKey:
              chargeKey,

            sceneNumber,
          });

        remainingCredits =
          creditResult
            .remainingCredits;

        creditsDeducted =
          creditResult.charged
            ? regenerateCost
            : 0;

        refundContext = {
          userId:
            authenticatedUser.id,

          email:
            authenticatedUser.email,

          credits:
            regenerateCost,

          idempotencyKey:
            refundKey,

          renderJobId:
            null,

          sceneNumber,

          action:
            "regenerate",
        };
      }
    }

    // ==================================================
    // 4. MOCK RESPONSE
    // ==================================================

    if (
      mockMode
    ) {
      const mockUrl =
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

      if (
        generationAction ===
          "full_render" &&
        reservedRenderJobId &&
        reservedSceneNumber
      ) {
        await markSceneCompleted({
          renderJobId:
            reservedRenderJobId,

          sceneNumber:
            reservedSceneNumber,

          videoUrl:
            mockUrl,
        });
      }

      return NextResponse.json({
        success:
          true,

        mock:
          true,

        action:
          generationAction,

        scene_number:
          sceneNumber,

        video_url:
          mockUrl,

        planned_duration:
          `${effectiveDuration}s`,

        credits_deducted:
          0,

        credits_refunded:
          0,

        refunded:
          false,

        remaining_credits:
          null,

        render_job_id:
          generationAction ===
          "full_render"
            ? reservedRenderJobId
            : null,

        engine:
          "mock",

        pipeline: {
          authenticated_user:
            true,

          server_pricing:
            true,

          render_job_verified:
            generationAction ===
            "full_render",

          duration_locked:
            generationAction ===
            "full_render",

          scene_reserved:
            generationAction ===
            "full_render",

          refund_protection:
            true,

          scene_spec:
            !!scene_spec,

          cinematic_spec:
            !!cinematic_spec,

          product_identity:
            !!product_identity,

          product_reference:
            !!imageUrl,

          koc_reference:
            !!kocImageUrl,

          first_frame_composer:
            false,
        },

        voiceover,
        voiceType,
      });
    }

    // ==================================================
    // 5. REPLICATE
    // ==================================================

    const replicateToken =
      process.env
        .REPLICATE_API_TOKEN
        ?.trim();

    if (
      !replicateToken
    ) {
      throw new Error(
        "REPLICATE_TOKEN_MISSING"
      );
    }

    const replicate =
      new Replicate({
        auth:
          replicateToken,
      });

    // ==================================================
    // 6. PREPROCESS REFERENCES
    // ==================================================

    let processedProductImage:
      string | null =
      imageUrl
        ? String(
            imageUrl
          )
        : null;

    let processedKocImage:
      string | null =
      kocImageUrl
        ? String(
            kocImageUrl
          )
        : null;

    if (
      processedProductImage
    ) {
      console.log(
        `[Scene ${sceneNumber}] Enhancing product image...`
      );

      processedProductImage =
        await enhanceImage(
          replicate,
          processedProductImage,
          false
        );
    }

    if (
      processedKocImage &&
      hasCharacter
    ) {
      console.log(
        `[Scene ${sceneNumber}] Enhancing KOC image...`
      );

      processedKocImage =
        await enhanceImage(
          replicate,
          processedKocImage,
          true
        );
    }

    // ==================================================
    // 7. FIRST-FRAME COMPOSER
    // ==================================================

    let composedFirstFrame:
      string | null =
      null;

    try {
      console.log(
        `[Scene ${sceneNumber}] Building first frame...`
      );

      const origin =
        new URL(
          req.url
        ).origin;

      const composeRes =
        await fetch(
          `${origin}/api/compose-frame`,
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
                  scene_number:
                    sceneNumber,

                  scene_spec,

                  cinematic_spec,

                  product_identity,

                  product_image:
                  processedProductImage || resolvedProductImage,
                koc_image:
                  processedKocImage || resolvedKocImage,
                }
              ),
          }
        );

      const composeData =
        await composeRes.json();

      if (
        composeRes.ok &&
        composeData
          ?.first_frame_url
      ) {
        composedFirstFrame =
          composeData
            .first_frame_url;

        console.log(
          `[Scene ${sceneNumber}] First frame ready.`
        );
      } else {
        console.warn(
          `[Scene ${sceneNumber}] Composer fallback:`,
          composeData
        );
      }
    } catch (
      error
    ) {
      console.warn(
        `[Scene ${sceneNumber}] Compose-frame failed, fallback to reference image:`,
        error
      );
    }

    // ==================================================
    // 8. FINAL PROMPT
    // ==================================================

    const finalPrompt =
      compileVideoPrompt({
        visualPrompt:
          String(
            visual_prompt
          ).trim(),

        sceneSpec:
          scene_spec,

        cinematicSpec:
          cinematic_spec,

        productIdentity:
          product_identity,
      });

    console.log(
      `\n========== REELBO VIDEO SCENE ${sceneNumber} ==========`
    );

    console.log(
      "[action]",
      generationAction
    );

    console.log(
      "[video mode]",
      effectiveVideoMode
    );

    console.log(
      "[locked/planned duration]",
      effectiveDuration
    );

    console.log(
      "[authenticated user]",
      authenticatedUser.id
    );

    console.log(
      "[render job]",
      reservedRenderJobId
    );

    // ==================================================
    // 9. VIDEO INPUT
    // ==================================================

    const videoInput:
      Record<string, any> =
      {
        prompt:
          finalPrompt,

        prompt_optimizer:
          false,
      };

      const finalFirstFrame =
      lastFrameUrl ||
      composedFirstFrame ||
      processedProductImage;

    if (
      finalFirstFrame
    ) {
      videoInput.first_frame_image =
        finalFirstFrame;
    }

    // ==================================================
    // 10. GENERATE VIDEO
    // ==================================================

    console.log(
      `[Scene ${sceneNumber}] Calling minimax/video-01...`
    );

    const output: any =
      await replicate.run(
        "minimax/video-01",
        {
          input:
            videoInput,
        }
      );

    const videoUrl =
      getOutputUrl(
        output
      );

    if (
      !videoUrl
    ) {
      throw new Error(
        "VIDEO_URL_EMPTY"
      );
    }

    // Có video thành công:
    // không được refund chỉ vì user không thích.
    refundContext =
      null;

    // ==================================================
    // 11. MARK COMPLETE
    // ==================================================

    if (
      generationAction ===
        "full_render" &&
      reservedRenderJobId &&
      reservedSceneNumber
    ) {
      await markSceneCompleted({
        renderJobId:
          reservedRenderJobId,

        sceneNumber:
          reservedSceneNumber,

        videoUrl,
      });
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    const durationNumber = Number(effectiveDuration) || 6;
    const estimatedCostUSD = Number((durationNumber * 0.05).toFixed(2));

    return NextResponse.json({
      success:
        true,

      action:
        generationAction,

      scene_number:
        sceneNumber,

      video_url:
        videoUrl,
        last_frame_url: output?.last_frame || output?.last_frame_image || null,
        cost_usd: estimatedCostUSD,
      planned_duration:
        `${effectiveDuration}s`,

      source_clip_duration:
        "6s",

      credits_deducted:
        creditsDeducted,

      credits_refunded:
        0,

      refunded:
        false,

      remaining_credits:
        remainingCredits,

      render_job_id:
        generationAction ===
        "full_render"
          ? reservedRenderJobId
          : null,

      video_mode:
        effectiveVideoMode,

      engine:
        "minimax/video-01",

      pipeline: {
        authenticated_user:
          true,

        server_pricing:
          true,

        render_job_verified:
          generationAction ===
          "full_render",

        duration_locked:
          generationAction ===
          "full_render",

        scene_reserved:
          generationAction ===
          "full_render",

        refund_protection:
          true,

        scene_spec:
          !!scene_spec,

        cinematic_spec:
          !!cinematic_spec,

        product_identity:
          !!product_identity,

        product_reference:
          !!processedProductImage,

        koc_reference_prepared:
          !!processedKocImage,

        first_frame_composer:
          !!composedFirstFrame,

        atomic_credits:
          generationAction ===
          "regenerate",

        idempotent_charge:
          generationAction ===
          "regenerate",
      },

      voiceover,
      voiceType,
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "[Generate Video] Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    // ==================================================
    // MARK FULL RENDER SCENE FAILED
    // ==================================================

    if (
      reservedRenderJobId &&
      reservedSceneNumber
    ) {
      await markSceneFailed({
        renderJobId:
          reservedRenderJobId,

        sceneNumber:
          reservedSceneNumber,
      });
    }

    // ==================================================
    // FAIL-SAFE REFUND
    // ==================================================

    let refunded =
      false;

    let creditsRefunded =
      0;

    let refundRemainingCredits:
      number | null =
      null;

    let refundError:
      string | null =
      null;

    if (
      refundContext &&
      refundContext.credits > 0
    ) {
      try {
        console.log(
          "[Generate Refund] Starting automatic refund:",
          {
            action:
              refundContext.action,

            credits:
              refundContext.credits,

            renderJobId:
              refundContext.renderJobId,

            sceneNumber:
              refundContext.sceneNumber,

            reason:
              message,
          }
        );

        const refundResult =
          await refundCreditsAtomic({
            userId:
              refundContext.userId,

            email:
              refundContext.email,

            credits:
              refundContext.credits,

            idempotencyKey:
              refundContext
                .idempotencyKey,

            renderJobId:
              refundContext
                .renderJobId,

            sceneNumber:
              refundContext
                .sceneNumber,

            action:
              refundContext.action,

            note:
              `Automatic refund because generation failed without usable video. Error: ${message}`,
          });

        refunded =
          refundResult
            .refundSatisfied;

        creditsRefunded =
          refundContext.credits;

        refundRemainingCredits =
          refundResult
            .remainingCredits;

        console.log(
          "[Generate Refund] Refund satisfied:",
          {
            newlyRefunded:
              refundResult
                .newlyRefunded,

            credits:
              refundContext
                .credits,

            remainingCredits:
              refundResult
                .remainingCredits,
          }
        );
      } catch (
        refundFailure: unknown
      ) {
        refundError =
          refundFailure instanceof
          Error
            ? refundFailure.message
            : "UNKNOWN_REFUND_ERROR";

        console.error(
          "[Generate Refund] CRITICAL — refund failed:",
          refundFailure
        );
      }
    }

    // ==================================================
    // PUBLIC ERROR
    // ==================================================

    let status =
      500;

    let publicMessage =
      "Không thể sinh video.";

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
      "RENDER_JOB_REQUIRED"
    ) {
      status = 400;
      publicMessage =
        "Thiếu render job.";
    }

    if (
      message ===
      "RENDER_JOB_NOT_FOUND"
    ) {
      status = 404;
      publicMessage =
        "Không tìm thấy render job.";
    }

    if (
      message ===
      "RENDER_JOB_FORBIDDEN"
    ) {
      status = 403;
      publicMessage =
        "Render job không thuộc tài khoản này.";
    }

    if (
      message ===
        "RENDER_JOB_EXPIRED" ||
      message ===
        "RENDER_JOB_NOT_ACTIVE"
    ) {
      status = 409;
      publicMessage =
        "Render job đã hết hạn hoặc không còn hoạt động.";
    }

    if (
      message ===
      "SCENE_ALREADY_USED"
    ) {
      status = 409;
      publicMessage =
        "Phân cảnh này đã được sử dụng trong render job.";
    }

    if (
      message ===
      "SCENE_OUT_OF_RANGE"
    ) {
      status = 400;
      publicMessage =
        "Phân cảnh không thuộc render job này.";
    }

    if (
      message ===
      "SCENE_DURATION_MISMATCH"
    ) {
      status = 400;
      publicMessage =
        "Thời lượng phân cảnh không khớp với render job.";
    }

    if (
      message ===
        "RENDER_JOB_DURATION_PLAN_INVALID" ||
      message ===
        "RENDER_JOB_CREDIT_PLAN_INVALID" ||
      message ===
        "RENDER_JOB_INVALID"
    ) {
      status = 500;
      publicMessage =
        "Kế hoạch render không hợp lệ.";
    }

    if (
      message ===
      "INVALID_SCENE_NUMBER"
    ) {
      status = 400;
      publicMessage =
        "Số phân cảnh không hợp lệ.";
    }

    if (
      refunded &&
      creditsRefunded > 0
    ) {
      publicMessage =
        `Hệ thống AI gặp sự cố và không tạo được video. ${creditsRefunded} Credits đã được tự động hoàn lại.`;
    }

    if (
      refundError
    ) {
      publicMessage =
        "Hệ thống AI gặp sự cố và không tạo được video. Hệ thống chưa xác nhận được việc hoàn Credits, vui lòng kiểm tra lại giao dịch.";
    }

    return NextResponse.json(
      {
        error:
          publicMessage,

        code:
          message,

        refunded,

        credits_refunded:
          refunded
            ? creditsRefunded
            : 0,

        remaining_credits:
          refunded
            ? refundRemainingCredits
            : null,

        refund_error:
          refundError,
      },
      {
        status,
      }
    );
  }
}