import { NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

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

// ======================================================
// HELPERS
// ======================================================

function getOutputUrl(output: any): string {
  if (!output) return "";

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    if (output.length === 0) return "";
    return getOutputUrl(output[0]);
  }

  if (output?.url) {
    if (typeof output.url === "function") {
      const result = output.url();

      if (typeof result === "string") {
        return result;
      }

      if (result?.href) {
        return result.href;
      }

      return String(result || "");
    }

    return String(output.url);
  }

  return "";
}

function normalizeDuration(
  duration: unknown
): number {
  if (typeof duration === "number") {
    return Number.isFinite(duration)
      ? duration
      : 3;
  }

  if (typeof duration !== "string") {
    return 3;
  }

  const match =
    duration.match(
      /(\d+(?:\.\d+)?)/
    );

  if (!match) return 3;

  const value =
    Number(match[1]);

  return Number.isFinite(value)
    ? value
    : 3;
}

function detectProductType(
  productIdentity: ProductIdentity | null,
  sceneSpec: SceneSpec | null,
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
  if (productType === "footwear") {
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
  replicate: Replicate,
  image: string,
  faceEnhance: boolean
) {
  if (!image) return image;

  try {
    const output: any =
      await replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image,
            scale: 2,
            face_enhance:
              faceEnhance,
          },
        }
      );

    const url =
      getOutputUrl(output);

    return url || image;
  } catch (error) {
    console.warn(
      "[Reelbo Enhancer] failed, using original image:",
      error
    );

    return image;
  }
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
  const productType =
    detectProductType(
      productIdentity,
      sceneSpec,
      visualPrompt
    );

  const cameraSafety =
    getCameraSafety(
      productType
    );

  const distinctiveFeatures =
    productIdentity
      ?.distinctive_features
      ?.join(", ") || "unknown";

  const secondaryColors =
    productIdentity
      ?.secondary_colors
      ?.join(", ") || "unknown";

  const forbidden =
    Array.isArray(
      sceneSpec?.forbidden
    )
      ? sceneSpec!.forbidden!.join(
          ", "
        )
      : "";

  const prompt = `
REAL COMMERCIAL SOCIAL MEDIA FOOTAGE.

==============================
SCENE
==============================

Purpose:
${sceneSpec?.purpose || "product sales scene"}

Location:
${sceneSpec?.location || "realistic clean interior"}

Shot:
${sceneSpec?.shot_type || "medium close-up"}

Camera angle:
${sceneSpec?.camera_angle || "eye-level"}

Camera movement:
${
  cinematicSpec?.camera_motion ||
  sceneSpec?.camera_movement ||
  "subtle slow camera movement"
}

Action:
${sceneSpec?.action || "simple natural interaction with the product"}

Composition:
${sceneSpec?.composition || "clean commercial framing"}

==============================
CINEMATIC SPEC
==============================

Lens look:
${cinematicSpec?.lens_look || "50mm-like"}

Aperture feel:
${cinematicSpec?.aperture_feel || "f/2.8-like"}

Depth of field:
${cinematicSpec?.depth_of_field || "moderate"}

Camera distance:
${cinematicSpec?.camera_distance || "1.2m"}

Camera height:
${cinematicSpec?.camera_height || "chest level"}

Motion strength:
${cinematicSpec?.motion_strength || "low"}

Stabilization:
${cinematicSpec?.stabilization || "natural stable handheld"}

Lighting:
${
  cinematicSpec?.lighting_style ||
  sceneSpec?.lighting ||
  "soft natural realistic lighting"
}

Key light direction:
${cinematicSpec?.key_light_direction || "front-side"}

Shadow style:
${cinematicSpec?.shadow_style || "soft natural shadows"}

Color temperature:
${cinematicSpec?.color_temperature || "neutral-warm"}

==============================
PRODUCT IDENTITY LOCK
==============================

Product:
${
  productIdentity?.name ||
  sceneSpec?.product ||
  "same reference product"
}

Category:
${productIdentity?.category || "unknown"}

Main color:
${productIdentity?.main_color || "preserve reference color"}

Secondary colors:
${secondaryColors}

Material:
${productIdentity?.material || "preserve visible material"}

Shape:
${productIdentity?.shape || "preserve exact visible shape"}

Logo / text:
${productIdentity?.logo_or_text || "preserve visible logo/text exactly if present"}

Texture:
${productIdentity?.texture || "preserve visible texture"}

Distinctive features:
${distinctiveFeatures}

Product preservation priority:
${cinematicSpec?.product_preservation_priority || "critical"}

CRITICAL:
Keep the product visually consistent with the reference.
Do not redesign it.
Do not change its main color.
Do not change its shape.
Do not invent new logos.
Do not invent a new version.

==============================
CHARACTER CONSISTENCY
==============================

Character preservation priority:
${cinematicSpec?.character_preservation_priority || "high"}

If a character is visible:
keep identity, facial proportions, hair, skin tone and overall appearance consistent.

Do not randomly replace the person.

==============================
PHYSICAL PLAUSIBILITY
==============================

Priority:
${cinematicSpec?.physical_plausibility || "high"}

Use:
realistic gravity,
believable object weight,
natural inertia,
realistic hand-object contact,
physically plausible product movement.

Avoid:
floating product,
teleportation,
object penetration,
unrealistic stretching,
sudden size changes.

${cameraSafety}

==============================
REALISM
==============================

${cinematicSpec?.realism_profile || "real commercial social media footage"}

Natural skin texture.
Realistic hands.
Natural product materials.
Realistic reflections.
Natural shadows.
Natural exposure.
Moderate depth of field.
Subtle camera motion.
Real smartphone or mirrorless-camera feeling.

Avoid:
plastic skin,
CGI,
cartoon,
anime,
game render,
wax face,
fake HDR,
over-sharpening,
deformed hands,
extra fingers,
extra limbs,
warped product,
changing product design,
changing product color,
jitter,
heavy camera shake.

Scene-specific forbidden:
${forbidden || "none"}

==============================
DIRECTOR DESCRIPTION
==============================

${visualPrompt}

FINAL RULE:
One clear primary action only.
Prioritize product identity, realism and stability over dramatic movement.
`;

  return prompt
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

// ======================================================
// CREDITS
// ======================================================

async function deductCredits(
  userEmail: string,
  cost: number
) {
  if (
    !supabase ||
    !userEmail ||
    cost <= 0
  ) {
    return;
  }

  const email =
    userEmail
      .toLowerCase()
      .trim();

  const {
    data: profile,
    error,
  } =
    await supabase
      .from("profiles")
      .select("id, credits")
      .eq("email", email)
      .single();

  if (error || !profile) {
    throw new Error(
      "Không tìm thấy tài khoản."
    );
  }

  const current =
    Number(
      profile.credits || 0
    );

  if (current < cost) {
    throw new Error(
      "Không đủ Credits."
    );
  }

  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        credits:
          current - cost,
      })
      .eq("id", profile.id);

  if (updateError) {
    throw new Error(
      "Không thể cập nhật Credits."
    );
  }
}

// ======================================================
// POST
// ======================================================

export async function POST(
  req: Request
) {
  try {
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
      kocImageUrl = null,

      hasCharacter = false,

      user_email = "",

      cost = 20,
    } = body;
    const mockMode =
    process.env.VIDEO_MOCK_MODE === "true";
  
  if (mockMode) {
    console.log(
      `\n========== REELBO MOCK SCENE ${scene_number} ==========`
    );
  
    console.log(
      "[MOCK] scene_spec =",
      !!scene_spec
    );
  
    console.log(
      "[MOCK] cinematic_spec =",
      !!cinematic_spec
    );
  
    console.log(
      "[MOCK] product_identity =",
      !!product_identity
    );
  
    console.log(
      "[MOCK] planned duration =",
      duration
    );
  
    console.log(
      "[MOCK] product reference =",
      !!imageUrl
    );
  
    console.log(
      "[MOCK] KOC reference =",
      !!kocImageUrl
    );
  
    return NextResponse.json({
      success: true,
  
      mock: true,
  
      scene_number,
  
      video_url:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  
      planned_duration:
        duration,
  
      credits_deducted: 0,
  
      engine:
        "mock",
  
      pipeline: {
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
          status: 400,
        }
      );
    }

    const token =
      process.env
        .REPLICATE_API_TOKEN
        ?.trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Thiếu REPLICATE_API_TOKEN.",
        },
        {
          status: 500,
        }
      );
    }

    const replicate =
      new Replicate({
        auth: token,
      });

    const plannedDuration =
      normalizeDuration(
        duration
      );

    // ==================================================
    // 1. CREDIT
    // ==================================================

    await deductCredits(
      String(user_email),
      Number(cost || 0)
    );

    // ==================================================
    // 2. PREPROCESS REFERENCES
    // ==================================================

    let processedProductImage:
      string | null =
      imageUrl
        ? String(imageUrl)
        : null;

    let processedKocImage:
      string | null =
      kocImageUrl
        ? String(kocImageUrl)
        : null;

    if (
      processedProductImage
    ) {
      console.log(
        `[Scene ${scene_number}] Enhancing product image...`
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
        `[Scene ${scene_number}] Enhancing KOC image...`
      );

      processedKocImage =
        await enhanceImage(
          replicate,
          processedKocImage,
          true
        );
    }

    // ==================================================
    // 3. COMPILE FINAL PROMPT
    // ==================================================
// ==================================================
// 3. FIRST-FRAME COMPOSER
// ==================================================

let composedFirstFrame:
  string | null = null;

try {
  console.log(
    `[Scene ${scene_number}] Building first frame...`
  );

  const origin =
    new URL(req.url).origin;

  const composeRes =
    await fetch(
      `${origin}/api/compose-frame`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          scene_number,

          scene_spec,

          cinematic_spec,

          product_identity,

          product_image:
            processedProductImage,

          koc_image:
            processedKocImage,
        }),
      }
    );

  const composeData =
    await composeRes.json();

  if (
    composeRes.ok &&
    composeData?.first_frame_url
  ) {
    composedFirstFrame =
      composeData.first_frame_url;

    console.log(
      `[Scene ${scene_number}] First frame ready.`
    );
  } else {
    console.warn(
      `[Scene ${scene_number}] Composer fallback:`,
      composeData
    );
  }
} catch (error) {
  console.warn(
    `[Scene ${scene_number}] Compose-frame failed, fallback to reference image:`,
    error
  );
}
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
      `\n========== REELBO VIDEO SCENE ${scene_number} ==========`
    );

    console.log(
      "[planned duration]",
      plannedDuration
    );

    console.log(
      "[scene_spec]",
      !!scene_spec
    );

    console.log(
      "[cinematic_spec]",
      !!cinematic_spec
    );

    console.log(
      "[product_identity]",
      !!product_identity
    );

    console.log(
      "[composed first frame]",
      !!composedFirstFrame
    );

    console.log(
      "[koc reference prepared]",
      !!processedKocImage
    );

    // ==================================================
    // 4. MINIMAX INPUT
    // ==================================================

    const videoInput:
      Record<string, any> = {
        prompt:
          finalPrompt,

        prompt_optimizer:
          true,
      };

    // Hiện tại video-01 dùng first frame image.
    // Product reference được ưu tiên ở bước này.
    const finalFirstFrame =
  composedFirstFrame ||
  processedProductImage;

if (finalFirstFrame) {
  videoInput.first_frame_image =
    finalFirstFrame;
}
    // processedKocImage được chuẩn bị để bước First-Frame Composer dùng.
    // Không truyền sai schema vào video-01 ở đây.

    // ==================================================
    // 5. GENERATE VIDEO
    // ==================================================

    console.log(
      `[Scene ${scene_number}] Calling minimax/video-01...`
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

    if (!videoUrl) {
      throw new Error(
        "AI không trả về link video."
      );
    }

    // MiniMax video-01 sinh source clip ~6s.
    // plannedDuration sẽ được Merge Engine dùng để trim sau.

    return NextResponse.json({
      success: true,

      scene_number,

      video_url:
        videoUrl,

      planned_duration:
        `${plannedDuration}s`,

      source_clip_duration:
        "6s",

      credits_deducted:
        Number(cost || 0),

      engine:
        "minimax/video-01",

      pipeline: {
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
      },

      voiceover,
      voiceType,
    });
  } catch (error: any) {
    console.error(
      "[Generate Video] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể sinh video: " +
          (error?.message ||
            "Unknown error"),
      },
      {
        status: 500,
      }
    );
  }
}