import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

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

function dataUrlToInput(
  dataUrl: string
): {
  type: "image";
  data: string;
  mime_type: string;
} | null {
  const match = dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );

  if (!match) return null;

  return {
    type: "image",
    mime_type: match[1],
    data: match[2],
  };
}

async function remoteImageToInput(
  url: string
): Promise<{
  type: "image";
  data: string;
  mime_type: string;
} | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `Không tải được ảnh reference: ${res.status}`
      );
    }

    const mimeType =
      res.headers
        .get("content-type")
        ?.split(";")[0] ||
      "image/jpeg";

    const buffer =
      Buffer.from(
        await res.arrayBuffer()
      );

    return {
      type: "image",
      mime_type: mimeType,
      data: buffer.toString("base64"),
    };
  } catch (error) {
    console.warn(
      "[Compose Frame] Không đọc được remote image:",
      error
    );

    return null;
  }
}

async function imageToGeminiInput(
  value?: string | null
) {
  if (!value) return null;

  if (
    value.startsWith(
      "data:image/"
    )
  ) {
    return dataUrlToInput(
      value
    );
  }

  if (
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
  ) {
    return remoteImageToInput(
      value
    );
  }

  return null;
}

function buildComposerPrompt({
  sceneSpec,
  cinematicSpec,
  productIdentity,
  hasCharacter,
  hasProductImage,
}: {
  sceneSpec: SceneSpec | null;
  cinematicSpec: CinematicSpec | null;
  productIdentity: ProductIdentity | null;
  hasCharacter: boolean;
  hasProductImage: boolean;
}) {
  const features =
    productIdentity
      ?.distinctive_features
      ?.join(", ") ||
    "preserve all visible identifying details";

  const secondaryColors =
    productIdentity
      ?.secondary_colors
      ?.join(", ") ||
    "preserve reference colors";

  const forbidden =
    sceneSpec?.forbidden?.join(
      ", "
    ) || "";

  return `
Create ONE vertical 9:16 first-frame image for a realistic TikTok Shop commercial video.

This image will be used as the first frame of an Image-to-Video model.

The priority order is:

1. preserve the exact product identity
2. preserve the same character identity if character reference is supplied
3. follow the requested composition
4. realistic commercial footage
5. simple physically plausible pose
6. cinematic quality without looking artificial

==================================================
REFERENCE IMAGE RULES
==================================================

${
  hasCharacter
    ? `
REFERENCE IMAGE 1 represents the KOC / character.

Preserve:
- same facial identity
- same general facial proportions
- same hairstyle appearance
- same skin tone
- same overall person

Do not replace this person with another person.
`
    : `
No character reference is supplied.
Do not invent a prominent human character unless the scene requires one.
`
}

${
  hasProductImage
    ? `
A PRODUCT REFERENCE IMAGE is supplied.

The product shown in the generated frame must visually match the product reference.

Do not redesign it.
Do not change its main color.
Do not change its shape.
Do not invent a different version.
`
    : `
No dedicated product image is supplied.
Follow Product Identity text carefully.
`
}

==================================================
PRODUCT IDENTITY
==================================================

Name:
${productIdentity?.name || sceneSpec?.product || "unknown"}

Category:
${productIdentity?.category || "unknown"}

Main color:
${productIdentity?.main_color || "preserve reference color"}

Secondary colors:
${secondaryColors}

Material:
${productIdentity?.material || "preserve visible material"}

Shape:
${productIdentity?.shape || "preserve visible shape"}

Logo / text:
${productIdentity?.logo_or_text || "preserve visible logo or text if present"}

Texture:
${productIdentity?.texture || "preserve visible texture"}

Distinctive features:
${features}

==================================================
SCENE SPECIFICATION
==================================================

Purpose:
${sceneSpec?.purpose || "TikTok Shop product demonstration"}

Location:
${sceneSpec?.location || "realistic modern interior"}

Shot type:
${sceneSpec?.shot_type || "medium close-up"}

Camera angle:
${sceneSpec?.camera_angle || "eye-level"}

Subject:
${sceneSpec?.subject || "same subject"}

Action at the FIRST FRAME:
${sceneSpec?.action || "naturally holding or presenting the product"}

Composition:
${sceneSpec?.composition || "clean commercial composition"}

Product visibility:
${sceneSpec?.product_visibility || "high"}

Character visibility:
${sceneSpec?.character_visibility || "medium"}

==================================================
CINEMATIC SPEC
==================================================

Lens look:
${cinematicSpec?.lens_look || "50mm-like natural perspective"}

Depth of field:
${cinematicSpec?.depth_of_field || "moderate"}

Camera distance:
${cinematicSpec?.camera_distance || "medium-close distance"}

Camera height:
${cinematicSpec?.camera_height || "chest level"}

Lighting:
${cinematicSpec?.lighting_style || sceneSpec?.lighting || "soft natural light"}

Key light:
${cinematicSpec?.key_light_direction || "front-side"}

Shadow style:
${cinematicSpec?.shadow_style || "soft natural shadows"}

Color temperature:
${cinematicSpec?.color_temperature || "neutral-warm"}

Realism:
${cinematicSpec?.realism_profile || "real commercial social media footage"}

==================================================
PHYSICAL SAFETY
==================================================

Use:
- natural human proportions
- believable product weight
- natural hand grip
- realistic finger placement
- realistic gravity
- stable pose
- physically plausible interaction
- simple body posture

Avoid:
- floating product
- warped product
- extra fingers
- fused fingers
- extra limbs
- deformed hands
- twisted joints
- unrealistic body pose
- impossible product orientation

==================================================
REALISM
==================================================

The result should look like a real frame captured for a commercial TikTok video.

Prefer:
- natural skin texture
- realistic product material
- real reflections
- natural shadows
- realistic exposure
- subtle smartphone or mirrorless-camera look
- clean commercial lighting

Avoid:
- plastic skin
- CGI
- cartoon
- anime
- game-render appearance
- wax face
- fake HDR
- excessive sharpening
- unrealistic glossy surfaces

==================================================
SCENE-SPECIFIC FORBIDDEN
==================================================

${forbidden || "none"}

FINAL REQUIREMENT:

Generate exactly ONE realistic vertical 9:16 first frame.
Do not generate a collage.
Do not generate multiple camera views.
Do not add captions, subtitles, banners or watermarks.
`;
}

export async function POST(
  req: Request
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

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

    const body =
      await req.json();

    const {
      scene_spec = null,
      cinematic_spec = null,
      product_identity = null,
      product_image = null,
      koc_image = null,
      scene_number = 1,
    } = body;

    const mockMode =
      process.env.VIDEO_MOCK_MODE ===
      "true";

    // ==================================================
    // MOCK MODE
    // ==================================================

    if (mockMode) {
      console.log(
        `\n========== FIRST FRAME MOCK SCENE ${scene_number} ==========`
      );

      console.log(
        "[Compose Frame] scene_spec =",
        !!scene_spec
      );

      console.log(
        "[Compose Frame] cinematic_spec =",
        !!cinematic_spec
      );

      console.log(
        "[Compose Frame] product_identity =",
        !!product_identity
      );

      console.log(
        "[Compose Frame] product image =",
        !!product_image
      );

      console.log(
        "[Compose Frame] KOC image =",
        !!koc_image
      );

      return NextResponse.json({
        success: true,
        mock: true,
        scene_number,
        first_frame_url:
          product_image ||
          koc_image ||
          null,
        used_product_reference:
          !!product_image,
        used_character_reference:
          !!koc_image,
        engine: "mock",
      });
    }

    // ==================================================
    // IMAGE REFERENCES
    // ==================================================

    const kocInput =
      await imageToGeminiInput(
        koc_image
      );

    const productInput =
      await imageToGeminiInput(
        product_image
      );

    const prompt =
      buildComposerPrompt({
        sceneSpec:
          scene_spec,
        cinematicSpec:
          cinematic_spec,
        productIdentity:
          product_identity,
        hasCharacter:
          !!kocInput,
        hasProductImage:
          !!productInput,
      });

    const input: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    // KOC trước
    if (kocInput) {
      input.push(kocInput);
    }

    // Product sau
    if (productInput) {
      input.push(productInput);
    }

    console.log(
      `\n========== FIRST FRAME SCENE ${scene_number} ==========`
    );

    console.log(
      "[Compose Frame] KOC reference:",
      !!kocInput
    );

    console.log(
      "[Compose Frame] Product reference:",
      !!productInput
    );

    // ==================================================
    // GEMINI IMAGE
    // ==================================================

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    const interaction: any =
      await ai.interactions.create({
        model:
          "gemini-3.1-flash-image",

        input,

        response_format: {
          type: "image",
          aspect_ratio: "9:16",
          image_size: "1K",
        },
      });

    // ==================================================
    // GET IMAGE
    // ==================================================

    const outputImage =
      interaction?.output_image;

    if (
      !outputImage?.data
    ) {
      throw new Error(
        "Gemini Image không trả về ảnh."
      );
    }

    const mimeType =
      outputImage.mime_type ||
      "image/jpeg";

    const firstFrameDataUrl =
      `data:${mimeType};base64,${outputImage.data}`;

    return NextResponse.json({
      success: true,

      scene_number,

      first_frame_url:
        firstFrameDataUrl,

      used_product_reference:
        !!productInput,

      used_character_reference:
        !!kocInput,

      engine:
        "gemini-3.1-flash-image",

      aspect_ratio:
        "9:16",

      image_size:
        "1K",
    });
  } catch (error: any) {
    console.error(
      "[Compose Frame] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể tạo first frame: " +
          (error?.message ||
            "Unknown error"),
      },
      {
        status: 500,
      }
    );
  }
}