import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let tempFilePath = "";

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let mimeType = "video/mp4";
    let originalFileName = "sample-video.mp4";

    // ======================================================
    // 1. NHẬN VIDEO AN TOÀN (CHỐNG LỖI NO NUMBER AFTER MINUS SIGN)
    // ======================================================

    if (contentType.includes("multipart/form-data") || contentType.includes("boundary")) {
      const formData = await req.formData();
      const uploaded = formData.get("file");

      if (!(uploaded instanceof File)) {
        return NextResponse.json(
          { error: "Không tìm thấy video tải lên." },
          { status: 400 }
        );
      }

      if (!uploaded.type.startsWith("video/")) {
        return NextResponse.json(
          { error: "File gửi lên không phải video." },
          { status: 400 }
        );
      }

      mimeType = uploaded.type || "video/mp4";
      originalFileName = uploaded.name || "uploaded-video.mp4";

      const arrayBuffer = await uploaded.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const extension =
        path.extname(originalFileName) ||
        (mimeType.includes("quicktime") ? ".mov" : ".mp4");

      tempFilePath = path.join(
        os.tmpdir(),
        `reelbo-upload-${Date.now()}${extension}`
      );

      await fs.writeFile(tempFilePath, buffer);
    } else {
      let body: any = {};
      try {
        const text = await req.text();
        if (text.trim().startsWith("{")) {
          body = JSON.parse(text);
        } else {
          return NextResponse.json(
            { error: "Định dạng gửi lên không hợp lệ." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Không thể đọc dữ liệu JSON gửi lên." },
          { status: 400 }
        );
      }

      const videoUrl = body?.videoUrl;

      if (!videoUrl) {
        return NextResponse.json(
          { error: "Thiếu videoUrl." },
          { status: 400 }
        );
      }

      const videoRes = await fetch(videoUrl, { cache: "no-store" });

      if (!videoRes.ok) {
        return NextResponse.json(
          { error: `Không tải được video mẫu: ${videoRes.status}` },
          { status: 502 }
        );
      }

      mimeType =
        videoRes.headers.get("content-type")?.split(";")[0] || "video/mp4";

      const arrayBuffer = await videoRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      tempFilePath = path.join(
        os.tmpdir(),
        `reelbo-url-${Date.now()}.mp4`
      );

      await fs.writeFile(tempFilePath, buffer);
    }

    // ======================================================
    // 2. GEMINI CLIENT
    // ======================================================

    const ai = new GoogleGenAI({ apiKey });

    console.log("[Reelbo Analyzer] Upload video lên Gemini...");

    // ======================================================
    // 3. UPLOAD VIDEO LÊN GEMINI FILES
    // ======================================================

    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: {
        mimeType,
        displayName: originalFileName,
      },
    });

    if (!uploadedFile.name || !uploadedFile.uri) {
      throw new Error("Gemini upload video thất bại.");
    }

    // ======================================================
    // 4. CHỜ GEMINI PROCESS VIDEO
    // ======================================================

    let processedFile = uploadedFile;

    for (let i = 0; i < 40; i++) {
      if (processedFile.state !== "PROCESSING") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      processedFile = await ai.files.get({
        name: uploadedFile.name,
      });
    }

    if (processedFile.state === "FAILED") {
      throw new Error("Gemini không xử lý được video mẫu.");
    }

    if (processedFile.state === "PROCESSING") {
      throw new Error("Gemini xử lý video quá lâu.");
    }

    // ======================================================
    // 5. MULTIMODAL PROMPT CHI TIẾT ĐỦ 100% CẤU TRÚC GỐC
    // ======================================================

    const analysisPrompt = `
Bạn là REELBO MULTIMODAL VIDEO ANALYZER.
Bạn đang xem một VIDEO MẪU THẬT.
Mục tiêu của bạn là bóc tách video thành dữ liệu kỹ thuật để một AI Director khác có thể tạo video MỚI.
Bạn KHÔNG viết kịch bản mới. Bạn chỉ PHÂN TÍCH những gì thực sự xuất hiện.

==================================================
1. PRODUCT IDENTITY
==================================================
Phân tích sản phẩm thật kỹ:
- loại sản phẩm, màu chính, màu phụ, chất liệu, hình dạng, logo/chữ, texture, độ bóng / phản chiếu, chi tiết nhận diện, kích thước tương đối.
- product_anchor_prompt: Tạo 1 câu tiếng Anh mô tả kỹ thuật bất biến về trang phục/sản phẩm (chất vải, form dáng, chi tiết cạp, khóa kéo, nếp gấp, độ dài) để đưa vào Video AI.
Không nhìn rõ thì ghi "unknown".

==================================================
2. CHARACTER
==================================================
Phân tích nhân vật: kiểu tóc, trang phục, phụ kiện, tư thế, phần cơ thể xuất hiện. Không suy đoán danh tính.

==================================================
3. AUDIO UNDERSTANDING
==================================================
Bóc tách: transcript, tốc độ nói, nhịp nghỉ, cảm xúc, năng lượng, cách nhấn từ, âm thanh môi trường, nhạc nền, khoảng thời gian có lời / không lời.

==================================================
4. MOTION DYNAMICS
==================================================
Tốc độ chuyển động nhân vật, chuyển động tay, hướng di chuyển, camera pan/tilt/push-in/pull-out/orbit, handheld/static, walking/running hay không.

==================================================
5. CAMERA
==================================================
Shot type, camera angle, camera distance, camera height, lens look (wide-like, 35mm-like, 50mm-like), mức rung, framing.

==================================================
6. LIGHTING
==================================================
Nguồn sáng chính, hướng key light, độ mềm/cứng, nhiệt độ màu, backlight, window light, reflection trên sản phẩm, shadow style.

==================================================
7. PACING
==================================================
Nhịp dựng, tốc độ cắt cảnh, độ dài scene, hook nhanh/chậm, scene demo, CTA.

==================================================
8. ORIGINAL VISUAL
==================================================
Liệt kê các yếu tố cần tránh sao chép: locations, camera styles, lighting styles, main actions.

==================================================
9. REFERENCE FRAME
==================================================
Chọn timestamp tốt nhất để lấy sản phẩm làm reference: rõ, không mờ, không bị che, đúng màu.

==================================================
10. SCENE BREAKDOWN
==================================================
Chia video theo thay đổi rõ ràng.
RÀNG BUỘC TTS: Lời thoại (spoken_content) tuyệt đối không vượt quá (duration_seconds * 2.5) từ.

OUTPUT JSON FORMAT:
{
  "product": {
    "name_guess": "",
    "category": "",
    "main_color": "",
    "secondary_colors": [],
    "material": "",
    "shape": "",
    "logo_or_text": "",
    "texture": "",
    "surface_reflection": "",
    "distinctive_features": [],
    "product_visual_detail": "",
    "product_anchor_prompt": "",
    "confidence": 0
  },
  "character": {
    "gender_presentation": "",
    "hair": "",
    "outfit": "",
    "pose": "",
    "upper_body_description": "",
    "visible_accessories": [],
    "character_description": ""
  },
  "audio_analysis": {
    "transcript": "",
    "speech_rate": "",
    "pause_pattern": "",
    "emotion": "",
    "energy": "",
    "emphasis_style": "",
    "background_audio": "",
    "music_present": false,
    "speech_segments": [
      { "start_time": "", "end_time": "", "text": "" }
    ]
  },
  "hook": "",
  "sales_logic": "",
  "pacing": {
    "overall_speed": "",
    "cut_frequency": "",
    "hook_speed": "",
    "demo_speed": "",
    "cta_speed": "",
    "description": ""
  },
  "motion_analysis": {
    "subject_motion_speed": "",
    "hand_motion": "",
    "movement_direction": "",
    "camera_motion_speed": "",
    "camera_motion_type": [],
    "walking_present": false,
    "running_present": false,
    "motion_complexity": "",
    "product_motion": ""
  },
  "camera_analysis": {
    "dominant_shot_types": [],
    "camera_angles": [],
    "camera_distance": "",
    "camera_height": "",
    "lens_look": "",
    "handheld_or_static": "",
    "stability": ""
  },
  "lighting_analysis": {
    "key_light_source": "",
    "key_light_direction": "",
    "key_light_softness": "",
    "ambient_light": "",
    "color_temperature": "",
    "backlight": "",
    "product_reflection": "",
    "shadow_style": ""
  },
  "video_summary": "",
  "original_visual": {
    "locations": [],
    "camera_styles": [],
    "camera_movements": [],
    "lighting_styles": [],
    "main_actions": [],
    "composition_styles": []
  },
  "reference_frame": {
    "recommended_timestamp": "",
    "reason": "",
    "product_visibility": "low",
    "character_visibility": "low",
    "motion_blur": "low"
  },
  "scenes": [
    {
      "scene_number": 1,
      "start_time": "",
      "end_time": "",
      "duration_seconds": 0,
      "purpose": "",
      "action": "",
      "shot_type": "",
      "camera_angle": "",
      "camera_movement": "",
      "camera_motion_speed": "",
      "location": "",
      "lighting": "",
      "composition": "",
      "product_visible": true,
      "character_visible": true,
      "hand_motion": "",
      "body_motion": "",
      "spoken_content": ""
    }
  ]
}
`;

    // ======================================================
    // 6. GỌI GEMINI MODEL
    // ======================================================

    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ];

    let responseText = "";
    let usedModel = "";

    for (const modelName of candidateModels) {
      try {
        console.log(`[Reelbo Analyzer] Đang phân tích bằng ${modelName}...`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  fileData: {
                    fileUri: processedFile.uri!,
                    mimeType: processedFile.mimeType || mimeType,
                  },
                },
                {
                  text: analysisPrompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response.text?.trim()) {
            responseText = response.text.trim();
            usedModel = modelName;
            break;
          }
          } catch (modelError) {
            console.warn(
              `[Reelbo Analyzer] ${modelName} lỗi:`,
              modelError
            );
          }
          }
        if (!responseText) {
            console.error(
              "[Reelbo Analyzer] All Gemini analyzer models failed."
            );
          
            return NextResponse.json(
              {
                success: false,
                error:
                  "Gemini hiện chưa phân tích được video mẫu. Vui lòng thử lại sau.",
                code: "ANALYZER_UNAVAILABLE",
              },
              {
                status: 503,
              }
            );
          }

    // ======================================================
    // 7. PARSE JSON KẾT QUẢ
    // ======================================================

    let analysis: any;

    try {
      analysis = JSON.parse(
        responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Gemini không trả JSON hợp lệ.");
      }
      analysis = JSON.parse(jsonMatch[0]);
    }

    // Fallback nếu thiếu product_anchor_prompt
    if (analysis?.product && !analysis.product.product_anchor_prompt) {
      const p = analysis.product;
      analysis.product.product_anchor_prompt = `${p.main_color || ""} ${p.material || ""} ${p.category || "clothing"}, ${p.shape || ""}`.trim();
    }

    // Backward compatibility
    analysis.transcript =
      analysis?.audio_analysis?.transcript ||
      analysis?.transcript ||
      "";

    console.log("[Reelbo Analyzer] Phân tích hoàn tất thành công.");

    return NextResponse.json({
        success: true,
        data: analysis,
        analysis,
        product: analysis?.product,
        meta: {
          model: usedModel,
          source: contentType.includes("multipart/form-data")
            ? "uploaded_file"
            : "remote_video",
          multimodal_analysis: true,
        },
      });
  } catch (error: any) {
    console.error("[Reelbo Analyzer] Error:", error);

    return NextResponse.json(
      {
        error:
          "Không thể phân tích video mẫu: " +
          (error?.message || "Unknown error"),
      },
      { status: 500 }
    );
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }
  }
}
