import { NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// LỚP 2: TỪ KHÓA NHIẾP ẢNH ĐIỆN ẢNH NGẦM (CINEMATIC INJECTION)
const CINEMATIC_STUDIO_MODIFIERS = 
  "shot on 35mm lens, f/1.8 aperture, natural studio lighting, soft shadows, photorealistic, cinematic 4k, hyper-detailed skin texture, realistic reflections, shot on iPhone 15 Pro, commercial quality";

// LỚP 3: BỘ LỌC GÓC MÁY AN TOÀN (NO-LEGS RULE)
const NO_LEGS_SAFEGUARD = 
  "avoid full-body walking motion, avoid legs and feet, avoid deformed limbs, extra fingers, cartoonish, 3d render, plastic look, blurry, distorted face, low quality, jitter";

export async function POST(req: Request) {
  try {
    const {
      visual_prompt,
      voiceover,
      voiceType,
      scene_number,
      imageUrl,
      kocImageUrl,
      hasCharacter,
      user_email,
      cost = 20,
    } = await req.json();

    // 1. TRỪ CREDITS THỰC TẾ TRÊN SUPABASE (PRODUCTION)
    if (supabase && user_email) {
      const cleanEmail = String(user_email).toLowerCase().trim();
      const { data: profile, error: fetchErr } = await supabase
        .from("profiles")
        .select("id, credits")
        .eq("email", cleanEmail)
        .single();

      if (fetchErr || !profile) return NextResponse.json({ error: "Không tìm thấy tài khoản!" }, { status: 404 });
      if ((profile.credits || 0) < cost) return NextResponse.json({ error: "Không đủ Credits!" }, { status: 400 });

      await supabase
        .from("profiles")
        .update({ credits: profile.credits - cost })
        .eq("id", profile.id);
    }

    const token = process.env.REPLICATE_API_TOKEN?.trim();
    if (!token) return NextResponse.json({ error: "Chưa cấu hình REPLICATE_API_TOKEN" }, { status: 500 });
    const replicate = new Replicate({ auth: token });

    let processedKocImage = kocImageUrl;
    let processedProductImage = imageUrl;

    // LỚP 1: TIỀN XỬ LÝ KHỬ NHIỄU & NÂNG NÉT DA MẶT (REAL-ESRGAN/GFPGAN)
    if (kocImageUrl && kocImageUrl.startsWith("data:image")) {
      try {
        console.log(`[Pre-processing] Tự động nâng nét da mặt KOC bằng GFPGAN...`);
        const enhancedOutput: any = await replicate.run(
          "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
          {
            input: {
              image: kocImageUrl,
              scale: 2,
              face_enhance: true,
            },
          }
        );
        if (enhancedOutput) {
          processedKocImage = typeof enhancedOutput === "string" ? enhancedOutput : enhancedOutput?.url || kocImageUrl;
        }
      } catch (err) {
        console.warn("[Pre-processing] Bỏ qua upscale:", err);
      }
    }

    let videoUrl = "";
    const promptLower = String(visual_prompt).toLowerCase();

    const isKocScene = hasCharacter && processedKocImage && (
      promptLower.includes("nhân vật") || 
      promptLower.includes("koc") || 
      promptLower.includes("người") || 
      scene_number === 1
    );

    if (isKocScene) {
      // 🟢 A-ROLL: LIVEPORTRAIT (CHỈ QUAY TỪ NGỰC/HÔNG TRỞ LÊN, BIỂU CẢM TỰ NHIÊN)
      console.log(`[Engine AI] Render KOC Avatar Cảnh ${scene_number}`);
      const output: any = await replicate.run(
        "okaris/live-portrait:8be2edeab144ba0865f9fa84168f621ee417a2003db947802f900519f7c43300",
        {
          input: {
            source_image: processedKocImage,
            flag_do_crop: true,
            scale: 2.3,
            flag_remap: true,
          }
        }
      );
      videoUrl = typeof output === "string" ? output : (Array.isArray(output) ? output[0] : output?.url);
    } else {
      // 🔵 B-ROLL: MINIMAX STUDIO (ÉP GÓC CLOSE-UP / MEDIUM SHOT - KHÔNG VẼ CHÂN)
      console.log(`[Engine AI] Render Sản phẩm Minimax Cảnh ${scene_number}`);
      const safeEnhancedPrompt = `Medium shot from waist up, close-up details, focus on hands and product, smooth slow camera movement, ${String(visual_prompt).trim()}, ${CINEMATIC_STUDIO_MODIFIERS}, ${NO_LEGS_SAFEGUARD}`;

      const videoInput: any = {
        prompt: safeEnhancedPrompt,
        prompt_optimizer: true,
      };
      if (processedProductImage) videoInput.first_frame_image = processedProductImage;

      const output: any = await replicate.run("minimax/video-01", { input: videoInput });
      if (typeof output === "string") videoUrl = output;
      else if (Array.isArray(output) && output.length > 0) videoUrl = typeof output[0] === "string" ? output[0] : output[0]?.url;
      else if (output?.url) videoUrl = typeof output.url === "function" ? output.url().href : String(output.url);
    }

    if (!videoUrl) throw new Error("AI không trả về được link video.");

    return NextResponse.json({
      success: true,
      scene_number,
      video_url: videoUrl,
      credits_deducted: cost,
    });
  } catch (error: any) {
    console.error("Lỗi Generate Video API:", error);
    return NextResponse.json({ error: "Không thể sinh video: " + error.message }, { status: 500 });
  }
}
