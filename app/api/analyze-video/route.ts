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

    const contentType =
      req.headers.get("content-type") || "";

    let mimeType = "video/mp4";
    let originalFileName = "sample-video.mp4";

    // ======================================================
    // 1. NHẬN VIDEO TỪ FILE UPLOAD HOẶC URL
    // ======================================================

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await req.formData();

      const uploaded =
        formData.get("file");

      if (!(uploaded instanceof File)) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy video tải lên.",
          },
          { status: 400 }
        );
      }

      if (
        !uploaded.type.startsWith(
          "video/"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "File gửi lên không phải video.",
          },
          { status: 400 }
        );
      }

      mimeType =
        uploaded.type || "video/mp4";

      originalFileName =
        uploaded.name ||
        "uploaded-video.mp4";

      const arrayBuffer =
        await uploaded.arrayBuffer();

      const buffer =
        Buffer.from(arrayBuffer);

      const extension =
        path.extname(
          originalFileName
        ) ||
        (mimeType.includes(
          "quicktime"
        )
          ? ".mov"
          : ".mp4");

      tempFilePath = path.join(
        os.tmpdir(),
        `reelbo-upload-${Date.now()}${extension}`
      );

      await fs.writeFile(
        tempFilePath,
        buffer
      );
    } else {
      const body = await req.json();

      const videoUrl =
        body?.videoUrl;

      if (!videoUrl) {
        return NextResponse.json(
          {
            error:
              "Thiếu videoUrl.",
          },
          { status: 400 }
        );
      }

      const videoRes =
        await fetch(videoUrl, {
          cache: "no-store",
        });

      if (!videoRes.ok) {
        return NextResponse.json(
          {
            error:
              `Không tải được video mẫu: ${videoRes.status}`,
          },
          { status: 502 }
        );
      }

      mimeType =
        videoRes.headers
          .get("content-type")
          ?.split(";")[0] ||
        "video/mp4";

      const arrayBuffer =
        await videoRes.arrayBuffer();

      const buffer =
        Buffer.from(arrayBuffer);

      tempFilePath = path.join(
        os.tmpdir(),
        `reelbo-url-${Date.now()}.mp4`
      );

      await fs.writeFile(
        tempFilePath,
        buffer
      );
    }

    // ======================================================
    // 2. GEMINI CLIENT
    // ======================================================

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    console.log(
      "[Reelbo Analyzer] Upload video..."
    );

    // ======================================================
    // 3. UPLOAD VIDEO LÊN GEMINI FILES
    // ======================================================

    const uploadedFile =
      await ai.files.upload({
        file: tempFilePath,

        config: {
          mimeType,
          displayName:
            originalFileName,
        },
      });

    if (
      !uploadedFile.name ||
      !uploadedFile.uri
    ) {
      throw new Error(
        "Gemini upload video thất bại."
      );
    }

    // ======================================================
    // 4. CHỜ GEMINI PROCESS VIDEO
    // ======================================================

    let processedFile =
      uploadedFile;

    for (let i = 0; i < 40; i++) {
      if (
        processedFile.state !==
        "PROCESSING"
      ) {
        break;
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      );

      processedFile =
        await ai.files.get({
          name:
            uploadedFile.name,
        });
    }

    if (
      processedFile.state ===
      "FAILED"
    ) {
      throw new Error(
        "Gemini không xử lý được video mẫu."
      );
    }

    if (
      processedFile.state ===
      "PROCESSING"
    ) {
      throw new Error(
        "Gemini xử lý video quá lâu."
      );
    }

    // ======================================================
    // 5. MULTIMODAL ANALYSIS PROMPT
    // ======================================================

    const analysisPrompt = `
Bạn là REELBO MULTIMODAL VIDEO ANALYZER.

Bạn đang xem một VIDEO MẪU THẬT.

Mục tiêu của bạn là bóc tách video thành dữ liệu kỹ thuật
để một AI Director khác có thể tạo video MỚI.

Bạn KHÔNG viết kịch bản mới.
Bạn KHÔNG sáng tạo bối cảnh mới.
Bạn chỉ PHÂN TÍCH những gì thực sự xuất hiện.

==================================================
1. PRODUCT IDENTITY
==================================================

Phân tích sản phẩm thật kỹ:

- loại sản phẩm
- màu chính
- màu phụ
- chất liệu
- hình dạng
- logo/chữ
- texture
- độ bóng / phản chiếu
- chi tiết nhận diện
- kích thước tương đối
- cách sản phẩm tương tác với tay/người

Không nhìn rõ thì ghi "unknown".

==================================================
2. CHARACTER
==================================================

Phân tích nhân vật nhìn thấy thật:

- kiểu tóc
- trang phục
- phụ kiện
- tư thế
- phần cơ thể xuất hiện trong frame

Không suy đoán danh tính.

==================================================
3. AUDIO UNDERSTANDING
==================================================

Phân tích cả âm thanh của video.

Bóc tách:

- transcript
- tốc độ nói
- nhịp nghỉ
- cảm xúc giọng nói
- năng lượng
- cách nhấn từ
- âm thanh môi trường
- nhạc nền
- khoảng thời gian có lời / không lời

Nếu không nghe rõ thì ghi "unknown".

==================================================
4. MOTION DYNAMICS
==================================================

Phân tích chuyển động theo mức mô tả kỹ thuật.

Không cần tọa độ pixel chính xác.

Bóc tách:

- tốc độ chuyển động nhân vật
- chuyển động tay
- hướng di chuyển
- camera pan
- camera tilt
- camera push-in
- camera pull-out
- camera orbit
- handheld/static
- mức phức tạp chuyển động
- có walking/running hay không
- sản phẩm có xoay/lắc/đưa gần camera hay không

==================================================
5. CAMERA
==================================================

Phân tích:

- shot type
- close-up / medium / wide
- camera angle
- eye-level / low-angle / high-angle
- camera distance
- camera height
- camera movement
- mức rung
- framing

Nếu tiêu cự không thể biết chính xác,
hãy ước lượng theo LOOK:

- wide-like
- 35mm-like
- 50mm-like
- telephoto-like

Không tuyên bố chính xác nếu không chắc.

==================================================
6. LIGHTING
==================================================

Phân tích:

- nguồn sáng chính
- hướng key light
- độ mềm/cứng của ánh sáng
- ánh sáng môi trường
- nhiệt độ màu
- backlight
- window light
- studio light
- reflection trên sản phẩm
- vùng highlight/shadow

==================================================
7. PACING
==================================================

Phân tích:

- nhịp dựng
- tốc độ cắt cảnh
- độ dài scene
- hook nhanh hay chậm
- scene demo dài/ngắn
- CTA
- khoảng nghỉ

==================================================
8. ORIGINAL VISUAL
==================================================

Liệt kê các yếu tố video mới nên tránh sao chép:

- locations
- camera styles
- camera movements
- lighting styles
- main actions
- compositions

==================================================
9. REFERENCE FRAME
==================================================

Chọn timestamp tốt nhất để lấy sản phẩm làm reference.

Ưu tiên frame:

- sản phẩm rõ
- ít motion blur
- không bị tay che nhiều
- đúng màu
- đúng hình dạng
- đủ sáng

==================================================
10. SCENE BREAKDOWN
==================================================

Chia video theo thay đổi rõ ràng về:

- location
- action
- shot
- camera
- lời thoại
- sản phẩm
- ánh sáng

Không chia quá vụn.

==================================================
OUTPUT JSON
==================================================

Chỉ trả JSON hợp lệ.

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
      {
        "start_time": "",
        "end_time": "",
        "text": ""
      }
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
    // 6. MODEL FALLBACK
    // ======================================================

    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ];

    let responseText = "";
    let usedModel = "";

    for (
      const modelName of
      candidateModels
    ) {
      try {
        console.log(
          `[Reelbo Analyzer] thử ${modelName}`
        );

        const response =
          await ai.models.generateContent(
            {
              model:
                modelName,

              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      fileData: {
                        fileUri:
                          processedFile.uri!,

                        mimeType:
                          processedFile.mimeType ||
                          mimeType,
                      },
                    },

                    {
                      text:
                        analysisPrompt,
                    },
                  ],
                },
              ],

              config: {
                responseMimeType:
                  "application/json",
              },
            }
          );

        if (
          response.text?.trim()
        ) {
          responseText =
            response.text.trim();

          usedModel =
            modelName;

          break;
        }
      } catch (
        modelError
      ) {
        console.warn(
          `[Reelbo Analyzer] ${modelName} lỗi:`,
          modelError
        );
      }
    }

    if (!responseText) {
      throw new Error(
        "Các model Gemini hiện không phản hồi."
      );
    }

    // ======================================================
    // 7. PARSE JSON
    // ======================================================

    let analysis: any;

    try {
      analysis =
        JSON.parse(
          responseText
            .replace(
              /```json/gi,
              ""
            )
            .replace(
              /```/g,
              ""
            )
            .trim()
        );
    } catch {
      const jsonMatch =
        responseText.match(
          /\{[\s\S]*\}/
        );

      if (!jsonMatch) {
        throw new Error(
          "Gemini không trả JSON hợp lệ."
        );
      }

      analysis =
        JSON.parse(
          jsonMatch[0]
        );
    }

    // ======================================================
    // 8. BACKWARD COMPATIBILITY
    // ======================================================

    // Page cũ của mày từng đọc transcript trực tiếp ở root,
    // nên giữ lại field này để không phá pipeline.

    analysis.transcript =
      analysis?.audio_analysis
        ?.transcript ||
      analysis?.transcript ||
      "";

    // ======================================================
    // 9. RETURN
    // ======================================================

    return NextResponse.json({
      success: true,

      analysis,

      meta: {
        model:
          usedModel,

        source:
          contentType.includes(
            "multipart/form-data"
          )
            ? "uploaded_file"
            : "remote_video",

        multimodal_analysis:
          true,
      },
    });
  } catch (error: any) {
    console.error(
      "[Reelbo Analyzer] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể phân tích video mẫu: " +
          (error?.message ||
            "Unknown error"),
      },
      {
        status: 500,
      }
    );
  } finally {
    // ======================================================
    // 10. DELETE TEMP FILE
    // ======================================================

    if (tempFilePath) {
      try {
        await fs.unlink(
          tempFilePath
        );
      } catch {}
    }
  }
}