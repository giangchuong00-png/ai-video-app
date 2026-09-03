"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createBrowserClient,
} from "@supabase/ssr";

type HistoryItem = {
  id: string;
  createdAt: string;
  videoUrl: string;
  durationSeconds:
    | number
    | null;
};

export default function Home() {
  // =========================================================
  // SUPABASE
  // =========================================================

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // =========================================================
  // AUTH
  // =========================================================

  const [user, setUser] =
    useState<any>(null);

  const [
    showAuthModal,
    setShowAuthModal,
  ] = useState(false);

  // =========================================================
  // CREATIVE MODE / INPUT
  // =========================================================

  const [
    creativeMode,
    setCreativeMode,
  ] = useState<
    "creative" | "clone"
  >("creative");

  const [
    inputType,
    setInputType,
  ] = useState<
    "file" | "link"
  >("file");

  const [
    textPrompt,
    setTextPrompt,
  ] = useState("");

  const [
    competitorUrl,
    setCompetitorUrl,
  ] = useState("");

  const [
    sampleMediaFile,
    setSampleMediaFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    referenceImageUrl,
    setReferenceImageUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    activeCategory,
    setActiveCategory,
  ] =
    useState<number | null>(
      null
    );

  // =========================================================
  // CHARACTER / KOC
  // =========================================================

  const [
    characterFiles,
    setCharacterFiles,
  ] =
    useState<File[]>([]);

  const [
    characterPreviews,
    setCharacterPreviews,
  ] =
    useState<string[]>([]);

  const [
    useConsistentCharacter,
    setUseConsistentCharacter,
  ] = useState(true);

  // =========================================================
  // PAYMENT / CREDITS
  // =========================================================

  const [
    credits,
    setCredits,
  ] = useState(0);

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    paymentTab,
    setPaymentTab,
  ] = useState<
    "one_time" | "subscription"
  >("one_time");

  const [
    selectedPlanAmount,
    setSelectedPlanAmount,
  ] =
    useState<number>(
      100000
    );

  // =========================================================
  // SCRIPT
  // =========================================================

  const [
    cooldown,
    setCooldown,
  ] = useState(0);

  const totalCooldownTime =
    15;

  const [
    videoLength,
    setVideoLength,
  ] =
    useState("15s");

  const [
    videoMode,
    setVideoMode,
  ] =
    useState("fast");

  const [
    voiceType,
    setVoiceType,
  ] =
    useState("nu_bac");

  const [
    chatLoading,
    setChatLoading,
  ] =
    useState(false);

  const [
    script,
    setScript,
  ] =
    useState<any>(null);

  const [
    recentScripts,
    setRecentScripts,
  ] =
    useState<any[]>([]);

  // =========================================================
  // VIDEO
  // =========================================================

  const [
    scriptVideoLoading,
    setScriptVideoLoading,
  ] = useState(false);

  const [
    scriptVideoUrls,
    setScriptVideoUrls,
  ] =
    useState<string[]>([]);

  const [
    singleSceneLoading,
    setSingleSceneLoading,
  ] =
    useState<number | null>(
      null
    );

  const [
    mergedVideoUrl,
    setMergedVideoUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    mergeVideoLoading,
    setMergeVideoLoading,
  ] = useState(false);

  const [
    renderProgress,
    setRenderProgress,
  ] = useState("");

  // =========================================================
  // HISTORY
  // =========================================================

  const [
    historyList,
    setHistoryList,
  ] =
    useState<
      HistoryItem[]
    >([]);

  // =========================================================
  // PRICING
  // =========================================================

  const topupPlans = [
    {
      amount: 20000,
      credits: 96,
      bonus:
        "+16 Cr Beta",
      original:
        "40.000đ",
      popular: false,
    },

    {
      amount: 50000,
      credits: 240,
      bonus:
        "+40 Cr Beta",
      original:
        "100.000đ",
      popular: false,
    },

    {
      amount: 100000,
      credits: 530,
      bonus:
        "+80 Cr Beta",
      original:
        "200.000đ",
      popular: true,
    },

    {
      amount: 200000,
      credits: 1080,
      bonus:
        "+180 Cr Beta",
      original:
        "400.000đ",
      popular: false,
    },
  ];

  const subscriptionPlans =
    [
      {
        amount:
          249000,

        name:
          "Starter",

        credits:
          1200,

        label:
          "249.000đ /tháng",

        popular:
          false,
      },

      {
        amount:
          499000,

        name:
          "Pro",

        credits:
          2600,

        label:
          "499.000đ /tháng",

        popular:
          true,
      },

      {
        amount:
          999000,

        name:
          "Business",

        credits:
          5500,

        label:
          "999.000đ /tháng",

        popular:
          false,
      },
    ];

  // =========================================================
  // CATEGORIES
  // =========================================================

  const categories = [
    {
      name:
        "✨ Tất cả",

      prompt:
        "Váy đầm nữ linen mùa hè năng động, tôn dáng",
    },

    {
      name:
        "👗 Thời trang",

      prompt:
        "Áo sơ mi nam form rộng phong cách Hàn Quốc",
    },

    {
      name:
        "🍲 Thực phẩm",

      prompt:
        "Lẩu thái chua cay chuẩn vị, topping hải sản ngập tràn",
    },

    {
      name:
        "📱 Công nghệ",

      prompt:
        "Tai nghe chống ồn không dây bass siêu trầm",
    },
  ];

  // =========================================================
  // HISTORY SUPABASE
  // =========================================================

  const fetchVideoHistory =
    async (
      userId: string
    ) => {
      try {
        const now =
          new Date().toISOString();

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "video_jobs"
            )
            .select(
              "id, video_url, duration_seconds, created_at, expires_at"
            )
            .eq(
              "user_id",
              userId
            )
            .eq(
              "status",
              "completed"
            )
            .gt(
              "expires_at",
              now
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(
              30
            );

        if (error) {
          console.error(
            "Lỗi lấy video history:",
            error
          );

          return;
        }

        const mapped:
          HistoryItem[] =
          (
            data || []
          ).map(
            (
              item: any
            ) => ({
              id:
                item.id,

              createdAt:
                new Date(
                  item.created_at
                ).toLocaleString(
                  "vi-VN",
                  {
                    day:
                      "2-digit",

                    month:
                      "2-digit",

                    hour:
                      "2-digit",

                    minute:
                      "2-digit",
                  }
                ),

              videoUrl:
                item.video_url,

              durationSeconds:
                typeof item.duration_seconds ===
                "number"
                  ? item.duration_seconds
                  : null,
            })
          );

        setHistoryList(
          mapped
        );
      } catch (
        err
      ) {
        console.error(
          "Lỗi load Supabase history:",
          err
        );
      }
    };

  // =========================================================
  // AUTH + FETCH CREDITS + HISTORY
  // =========================================================

  useEffect(() => {
    const fetchUserData =
      async (
        currentUser: any
      ) => {
        if (
          !currentUser?.email
        ) {
          return;
        }

        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(
                "credits"
              )
              .eq(
                "email",
                currentUser.email
              )
              .single();

          if (
            !error &&
            data &&
            typeof data.credits ===
              "number"
          ) {
            setCredits(
              data.credits
            );
          }

          if (
            currentUser?.id
          ) {
            await fetchVideoHistory(
              currentUser.id
            );
          }
        } catch (
          err
        ) {
          console.error(
            "Lỗi lấy profile credits/history:",
            err
          );
        }
      };

    const getUser =
      async () => {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        setUser(
          user
        );

        if (user) {
          await fetchUserData(
            user
          );
        } else {
          setHistoryList(
            []
          );
        }
      };

    getUser();

    const {
      data:
        authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          const currentUser =
            session?.user ??
            null;

          setUser(
            currentUser
          );

          if (
            currentUser
          ) {
            fetchUserData(
              currentUser
            );
          } else {
            setCredits(
              0
            );

            setHistoryList(
              []
            );
          }
        }
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // =========================================================
  // LOGIN / LOGOUT
  // =========================================================

  const handleLoginGoogle =
    async () => {
      await supabase.auth.signInWithOAuth(
        {
          provider:
            "google",

          options: {
            redirectTo:
              typeof window !==
              "undefined"
                ? window
                    .location
                    .origin
                : undefined,
          },
        }
      );
    };

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      setUser(null);
      setCredits(0);
      setHistoryList(
        []
      );
    };

  // =========================================================
  // PAYMENT
  // =========================================================

  const handlePaymentClick =
    () => {
      if (
        !user ||
        !user.email
      ) {
        setShowPaymentModal(
          false
        );

        setShowAuthModal(
          true
        );

        return;
      }

      const amount =
        selectedPlanAmount ||
        50000;

      const memo =
        "REELBO RB100";

      const qrUrl =
        `https://img.vietqr.io/image/MB-0914285399-compact2.png` +
        `?amount=${amount}` +
        `&addInfo=${encodeURIComponent(
          memo
        )}`;

      window.open(
        qrUrl,
        "_blank"
      );
    };

  // =========================================================
  // CREDIT CALCULATION
  // =========================================================

  const calculateRequiredCredits =
    () => {
      let baseCredits =
        60;

      if (
        videoLength ===
        "30s"
      ) {
        baseCredits =
          100;
      }

      if (
        videoLength ===
        "60s"
      ) {
        baseCredits =
          180;
      }

      return videoMode ===
        "hd_pro"
        ? baseCredits *
            2
        : baseCredits;
    };

  const currentRequiredCredits =
    calculateRequiredCredits();

  // =========================================================
  // CATEGORY
  // =========================================================

  const handleCategoryClick =
    (
      idx: number,
      promptText: string
    ) => {
      setActiveCategory(
        idx
      );

      setTextPrompt(
        promptText
      );
    };

  // =========================================================
  // KOC FILES
  // =========================================================

  const handleMultipleCharacterChange =
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      if (
        !e.target.files
      ) {
        return;
      }

      const filesArray =
        Array.from(
          e.target.files
        );

      if (
        filesArray.length +
          characterFiles.length >
        10
      ) {
        alert(
          "Bạn chỉ được tải tối đa 10 ảnh nhân vật!"
        );

        return;
      }

      const newFiles = [
        ...characterFiles,
        ...filesArray,
      ].slice(0, 10);

      setCharacterFiles(
        newFiles
      );

      characterPreviews.forEach(
        (url) => {
          try {
            URL.revokeObjectURL(
              url
            );
          } catch {}
        }
      );

      const newPreviews =
        newFiles.map(
          (
            file
          ) =>
            URL.createObjectURL(
              file
            )
        );

      setCharacterPreviews(
        newPreviews
      );
    };

  const removeCharacterImage =
    (
      indexToRemove: number
    ) => {
      const updatedFiles =
        characterFiles.filter(
          (
            _,
            idx
          ) =>
            idx !==
            indexToRemove
        );

      const updatedPreviews =
        characterPreviews.filter(
          (
            _,
            idx
          ) =>
            idx !==
            indexToRemove
        );

      try {
        URL.revokeObjectURL(
          characterPreviews[
            indexToRemove
          ]
        );
      } catch {}

      setCharacterFiles(
        updatedFiles
      );

      setCharacterPreviews(
        updatedPreviews
      );
    };

  // =========================================================
  // SAMPLE FILE
  // =========================================================

  const handleSampleMediaChange =
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }

      setSampleMediaFile(
        file
      );

      console.log(
        "[Reelbo] Sample file:",
        {
          name:
            file.name,

          type:
            file.type,

          size:
            file.size,
        }
      );
    };

  // =========================================================
  // COOLDOWN
  // =========================================================

  useEffect(() => {
    if (
      cooldown <= 0
    ) {
      return;
    }

    const timer =
      setTimeout(
        () =>
          setCooldown(
            (
              current
            ) =>
              Math.max(
                0,
                current -
                  1
              )
          ),
        1000
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [cooldown]);

  // =========================================================
  // DOWNLOAD
  // =========================================================

  const handleDownloadVideo =
    (
      url: string
    ) => {
      if (!url) {
        alert(
          "Chưa có link video để tải!"
        );

        return;
      }

      const a =
        document.createElement(
          "a"
        );

      a.href = url;

      a.download =
        `reelbo_video_${Date.now()}.mp4`;

      a.target =
        "_blank";

      a.rel =
        "noopener noreferrer";

      document.body.appendChild(
        a
      );

      a.click();

      document.body.removeChild(
        a
      );
    };

  // =========================================================
  // CREATE SCRIPT
  // =========================================================

  const handleChatSubmit =
    async () => {
      if (
        inputType ===
          "link" &&
        !competitorUrl.trim() &&
        !textPrompt.trim()
      ) {
        alert(
          "Bạn đã chọn chế độ Dán Link. Vui lòng dán link TikTok/Shopee!"
        );

        return;
      }

      if (
        inputType ===
          "file" &&
        !sampleMediaFile &&
        !textPrompt.trim()
      ) {
        alert(
          "Bạn đã chọn chế độ Tải File. Vui lòng chọn ảnh/video từ máy!"
        );

        return;
      }

      setChatLoading(
        true
      );

      setCooldown(
        totalCooldownTime
      );

      setScript(null);

      setScriptVideoUrls(
        []
      );

      setMergedVideoUrl(
        null
      );

      setReferenceImageUrl(
        null
      );

      setRenderProgress(
        ""
      );

      let crawledText =
        textPrompt;

      let videoAnalysis: any =
        null;

      let currentReferenceImage:
        string | null =
        null;

      // =====================================================
      // LINK TIKTOK
      // =====================================================

      if (
        inputType ===
          "link" &&
        competitorUrl.trim()
      ) {
        try {
          setRenderProgress(
            "Đang đọc link mẫu..."
          );

          const crawlRes =
            await fetch(
              "/api/crawl",
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
                      url:
                        competitorUrl.trim(),
                    }
                  ),
              }
            );

          const crawlData =
            await crawlRes.json();

          if (
            !crawlRes.ok
          ) {
            throw new Error(
              crawlData?.error ||
                "Không đọc được link video."
            );
          }

          if (
            crawlData?.data
          ) {
            if (
              crawlData
                .data
                .coverImage
            ) {
              currentReferenceImage =
                crawlData
                  .data
                  .coverImage;
            }

            if (
              crawlData
                .data
                .videoUrl
            ) {
              setRenderProgress(
                "Gemini đang xem video từ link..."
              );

              const analyzeRes =
                await fetch(
                  "/api/analyze-video",
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
                          videoUrl:
                            crawlData
                              .data
                              .videoUrl,
                        }
                      ),
                  }
                );

              const analyzeData =
                await analyzeRes.json();

              if (
                analyzeRes.ok &&
                analyzeData?.analysis
              ) {
                videoAnalysis =
                  analyzeData.analysis;
              } else {
                console.warn(
                  "Analyze link video failed:",
                  analyzeData
                );
              }
            }

            const productName =
              videoAnalysis
                ?.product
                ?.name_guess ||
              videoAnalysis
                ?.product_guess ||
              "Không rõ";

            const productDetail =
              videoAnalysis
                ?.product
                ?.product_visual_detail ||
              videoAnalysis
                ?.product_visual_detail ||
              "Không có";

            const characterDetail =
              videoAnalysis
                ?.character
                ?.character_description ||
              videoAnalysis
                ?.character_description ||
              "Không rõ";

            const originalLocations =
              videoAnalysis
                ?.original_visual
                ?.locations ||
              videoAnalysis?.scenes
                ?.map(
                  (
                    scene: any
                  ) =>
                    scene.location
                )
                ?.filter(
                  Boolean
                ) ||
              [];

            crawledText = `
THÔNG TIN TỪ LINK VIDEO MẪU:

Caption:
${crawlData.data.title || "Không có"}

Creator:
${crawlData.data.author || "Không rõ"}

SẢN PHẨM NHẬN DIỆN:
${productName}

MÔ TẢ NGOẠI HÌNH SẢN PHẨM:
${productDetail}

NHÂN VẬT GỐC:
${characterDetail}

LỜI THOẠI GỐC:
${videoAnalysis?.transcript || "Không lấy được transcript"}

HOOK GỐC:
${videoAnalysis?.hook || "Không xác định"}

SALES LOGIC:
${videoAnalysis?.sales_logic || "Không xác định"}

NHỊP VIDEO:
${JSON.stringify(videoAnalysis?.pacing || "Không xác định")}

BỐI CẢNH GỐC PHẢI TRÁNH:
${JSON.stringify(originalLocations)}

CAMERA GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.camera_styles ||
    []
)}

CHUYỂN ĐỘNG CAMERA GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.camera_movements ||
    []
)}

HÀNH ĐỘNG GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.main_actions ||
    []
)}

PHÂN CẢNH GỐC:
${JSON.stringify(
  videoAnalysis
    ?.scenes ||
    [],
  null,
  2
)}

THÔNG TIN USER NHẬP THÊM:
${textPrompt || "Không có"}
`;
          }
        } catch (
          err
        ) {
          console.error(
            "Lỗi crawl/analyze link:",
            err
          );

          if (
            !textPrompt.trim()
          ) {
            setChatLoading(
              false
            );

            alert(
              err instanceof
                Error
                ? err.message
                : "Không thể phân tích link mẫu."
            );

            return;
          }

          crawledText =
            textPrompt;
        }
      }

      // =====================================================
      // FILE UPLOAD
      // =====================================================

      else if (
        inputType ===
          "file" &&
        sampleMediaFile
      ) {
        if (
          sampleMediaFile.type.startsWith(
            "image/"
          )
        ) {
          try {
            setRenderProgress(
              "Đang đọc ảnh sản phẩm..."
            );

            currentReferenceImage =
              await new Promise<string>(
                (
                  resolve,
                  reject
                ) => {
                  const reader =
                    new FileReader();

                  reader.onload =
                    (
                      e
                    ) => {
                      const result =
                        e
                          .target
                          ?.result;

                      if (
                        typeof result ===
                        "string"
                      ) {
                        resolve(
                          result
                        );
                      } else {
                        reject(
                          new Error(
                            "Không đọc được ảnh."
                          )
                        );
                      }
                    };

                  reader.onerror =
                    () =>
                      reject(
                        new Error(
                          "FileReader lỗi."
                        )
                      );

                  reader.readAsDataURL(
                    sampleMediaFile
                  );
                }
              );

            crawledText = `
NGUỒN INPUT:
Ảnh sản phẩm do user tải trực tiếp.

TÊN FILE:
${sampleMediaFile.name}

MÔ TẢ USER:
${textPrompt || "Không có mô tả thêm."}

YÊU CẦU:
Dùng ảnh này làm reference visual cho sản phẩm.
`;
          } catch (
            err
          ) {
            console.error(
              "Không đọc được ảnh:",
              err
            );

            setChatLoading(
              false
            );

            alert(
              "Không thể đọc ảnh tải lên."
            );

            return;
          }
        } else if (
          sampleMediaFile.type.startsWith(
            "video/"
          )
        ) {
          try {
            setRenderProgress(
              "Gemini đang xem video mẫu..."
            );

            const formData =
              new FormData();

            formData.append(
              "file",
              sampleMediaFile
            );

            const analyzeRes =
              await fetch(
                "/api/analyze-video",
                {
                  method:
                    "POST",

                  body:
                    formData,
                }
              );

            const analyzeData =
              await analyzeRes.json();

            if (
              !analyzeRes.ok
            ) {
              throw new Error(
                analyzeData?.error ||
                  "Không phân tích được video upload."
              );
            }

            if (
              !analyzeData?.analysis
            ) {
              throw new Error(
                "Gemini không trả dữ liệu phân tích video."
              );
            }

            videoAnalysis =
              analyzeData.analysis;

            const productName =
              videoAnalysis
                ?.product
                ?.name_guess ||
              videoAnalysis
                ?.product_guess ||
              "Không rõ";

            const productDetail =
              videoAnalysis
                ?.product
                ?.product_visual_detail ||
              videoAnalysis
                ?.product_visual_detail ||
              "Không có";

            const characterDetail =
              videoAnalysis
                ?.character
                ?.character_description ||
              videoAnalysis
                ?.character_description ||
              "Không rõ";

            const originalLocations =
              videoAnalysis
                ?.original_visual
                ?.locations ||
              videoAnalysis?.scenes
                ?.map(
                  (
                    scene: any
                  ) =>
                    scene.location
                )
                ?.filter(
                  Boolean
                ) ||
              [];

            crawledText = `
PHÂN TÍCH VIDEO USER TẢI LÊN:

SẢN PHẨM:
${productName}

MÔ TẢ SẢN PHẨM:
${productDetail}

PRODUCT IDENTITY:
${JSON.stringify(
  videoAnalysis?.product ||
    {},
  null,
  2
)}

NHÂN VẬT:
${characterDetail}

CHARACTER IDENTITY:
${JSON.stringify(
  videoAnalysis?.character ||
    {},
  null,
  2
)}

LỜI THOẠI GỐC:
${videoAnalysis?.transcript || "Không có"}

HOOK GỐC:
${videoAnalysis?.hook || "Không xác định"}

SALES LOGIC:
${videoAnalysis?.sales_logic || "Không xác định"}

NHỊP VIDEO:
${JSON.stringify(videoAnalysis?.pacing || "Không xác định")}

TÓM TẮT VIDEO:
${videoAnalysis?.video_summary || "Không có"}

BỐI CẢNH GỐC PHẢI TRÁNH:
${JSON.stringify(
  originalLocations
)}

CAMERA GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.camera_styles ||
    []
)}

CHUYỂN ĐỘNG CAMERA GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.camera_movements ||
    []
)}

ÁNH SÁNG GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.lighting_styles ||
    []
)}

HÀNH ĐỘNG GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.main_actions ||
    []
)}

BỐ CỤC GỐC:
${JSON.stringify(
  videoAnalysis
    ?.original_visual
    ?.composition_styles ||
    []
)}

REFERENCE FRAME GEMINI GỢI Ý:
${JSON.stringify(
  videoAnalysis
    ?.reference_frame ||
    {},
  null,
  2
)}

PHÂN CẢNH VIDEO GỐC:
${JSON.stringify(
  videoAnalysis
    ?.scenes ||
    [],
  null,
  2
)}

MÔ TẢ USER NHẬP THÊM:
${textPrompt || "Không có"}
`;

            console.log(
              "[Reelbo] Video upload analysis:",
              videoAnalysis
            );
          } catch (
            err: any
          ) {
            console.error(
              "Lỗi analyze video upload:",
              err
            );

            setChatLoading(
              false
            );

            alert(
              err?.message ||
                "Không thể xem video tải lên."
            );

            return;
          }
        } else {
          setChatLoading(
            false
          );

          alert(
            "File không hợp lệ. Chỉ hỗ trợ ảnh hoặc video."
          );

          return;
        }
      }

      // =====================================================
      // SET REFERENCE IMAGE
      // =====================================================

      if (
        currentReferenceImage
      ) {
        setReferenceImageUrl(
          currentReferenceImage
        );
      }

      // =====================================================
      // SEND TO CHAT / DIRECTOR
      // =====================================================

      try {
        setRenderProgress(
          "AI đang xây dựng kịch bản mới..."
        );

        const payloadMessage =
          inputType ===
          "link"
            ? `
THÔNG TIN NGUỒN VIDEO/LINK:

${crawledText}

LINK THAM KHẢO:
${competitorUrl}

QUY TẮC:
Video mới phải sử dụng thông tin sản phẩm từ nguồn mẫu nhưng không sao chép nguyên visual/bối cảnh/góc quay của video gốc.
`
            : `
THÔNG TIN NGUỒN FILE USER:

${crawledText}

MÔ TẢ SẢN PHẨM USER NHẬP:
${textPrompt || "Không có"}

QUY TẮC:
Nếu đây là video mẫu, hãy dựa trên phân tích video thật ở trên.
Không được tự tưởng tượng một sản phẩm khác.
Video mới phải đổi visual so với video mẫu.
`;

        const res =
          await fetch(
            "/api/chat",
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
                    message:
                      payloadMessage,

                    duration:
                      videoLength,

                    product:
                      textPrompt.trim(),

                    referenceUrl:
                      inputType ===
                      "link"
                        ? competitorUrl.trim()
                        : "",

                    mode:
                      creativeMode ===
                      "creative"
                        ? "creative"
                        : "motion",

                    recentScripts,
                  }
                ),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Không thể tạo kịch bản."
          );
        }

        setScript(
          data.script
        );

        if (
          data.script
        ) {
          const firstVoiceover =
            data.script
              ?.scenes?.[0]
              ?.voiceover ||
            "";

          const scriptMemory =
            {
              hook:
                data.script
                  ?.hook ||
                firstVoiceover,

              sales_angle:
                data.script
                  ?.strategy
                  ?.sales_angle ||
                "",

              structure:
                data.script
                  ?.strategy
                  ?.structure ||
                "",

              content_type:
                data.script
                  ?.strategy
                  ?.content_type ||
                "",
            };

          setRecentScripts(
            (
              prev
            ) => [
              ...prev.slice(
                -7
              ),
              scriptMemory,
            ]
          );
        }

        setRenderProgress(
          ""
        );
      } catch (
        err: any
      ) {
        console.error(
          "Chat error:",
          err
        );

        alert(
          err.message ||
            "Lỗi kết nối AI."
        );
      } finally {
        setChatLoading(
          false
        );
      }
    };

  // =========================================================
  // GENERATE ALL VIDEO SCENES
  // =========================================================

  const handleGenerateAllVideos =
    async () => {
      if (
        !script ||
        !Array.isArray(
          script.scenes
        ) ||
        script.scenes
          .length === 0
      ) {
        alert(
          "Chưa có kịch bản để tạo video."
        );

        return;
      }

      if (
        !user ||
        !user.email
      ) {
        setShowAuthModal(
          true
        );

        return;
      }

      if (
        credits <
        currentRequiredCredits
      ) {
        setShowPaymentModal(
          true
        );

        return;
      }

      let currentKocImageBase64:
        string | null =
        null;

      if (
        useConsistentCharacter &&
        characterFiles.length >
          0
      ) {
        try {
          currentKocImageBase64 =
            await new Promise<string>(
              (
                resolve,
                reject
              ) => {
                const reader =
                  new FileReader();

                reader.onload =
                  (
                    e
                  ) => {
                    const result =
                      e
                        .target
                        ?.result;

                    if (
                      typeof result ===
                      "string"
                    ) {
                      resolve(
                        result
                      );
                    } else {
                      reject(
                        new Error(
                          "Không đọc được ảnh KOC."
                        )
                      );
                    }
                  };

                reader.onerror =
                  reject;

                reader.readAsDataURL(
                  characterFiles[0]
                );
              }
            );
        } catch (
          err
        ) {
          console.error(
            "Không đọc được ảnh KOC:",
            err
          );
        }
      }

      setScriptVideoLoading(
        true
      );

      setScriptVideoUrls(
        []
      );

      setMergedVideoUrl(
        null
      );

      setRenderProgress(
        "Bắt đầu xử lý..."
      );

      const newVideoUrls:
        string[] =
        [];

      try {
        for (
          let i = 0;
          i <
          script.scenes
            .length;
          i++
        ) {
          const scene =
            script.scenes[
              i
            ];

          setRenderProgress(
            `Đang render phân cảnh ${
              i + 1
            }/${
              script
                .scenes
                .length
            }...`
          );

          const res =
            await fetch(
              "/api/generate-video",
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
                      visual_prompt:
                        scene.visual_prompt,

                      scene_spec:
                        scene.scene_spec ||
                        null,

                      cinematic_spec:
                        scene.cinematic_spec ||
                        null,

                      product_identity:
                        script.product_identity ||
                        null,

                      duration:
                        scene.duration ||
                        "3s",

                      voiceover:
                        scene.voiceover ||
                        "",

                      voiceType,

                      scene_number:
                        scene.scene_number,

                      imageUrl:
                        referenceImageUrl,

                      kocImageUrl:
                        currentKocImageBase64,

                      hasCharacter:
                        characterFiles.length >
                        0,

                      user_email:
                        user.email,

                      cost:
                        Math.floor(
                          currentRequiredCredits /
                            script
                              .scenes
                              .length
                        ),
                    }
                  ),
              }
            );

          const data =
            await res.json();

          if (
            !res.ok ||
            !data?.video_url
          ) {
            throw new Error(
              data?.error ||
                `Không thể tạo video phân cảnh ${
                  i + 1
                }.`
            );
          }

          newVideoUrls.push(
            data.video_url
          );

          setScriptVideoUrls(
            [
              ...newVideoUrls,
            ]
          );
        }

        setCredits(
          (
            prev
          ) =>
            Math.max(
              0,
              prev -
                currentRequiredCredits
            )
        );

        setRenderProgress(
          `Đã tạo xong ${newVideoUrls.length}/${script.scenes.length} phân cảnh. Hãy kiểm tra từng phân cảnh trước khi gộp.`
        );
      } catch (
        err: any
      ) {
        console.error(
          "Generate video error:",
          err
        );

        alert(
          err?.message ||
            "Lỗi trong quá trình sinh video."
        );
      } finally {
        setScriptVideoLoading(
          false
        );
      }
    };

  // =========================================================
  // MANUAL MERGE VIDEO
  // =========================================================

  const handleMergeVideo =
    async () => {
      if (
        !script ||
        !Array.isArray(
          script.scenes
        ) ||
        script.scenes.length ===
          0
      ) {
        alert(
          "Không tìm thấy kịch bản để gộp."
        );

        return;
      }

      if (
        scriptVideoUrls.length !==
        script.scenes.length
      ) {
        alert(
          "Chưa tạo đủ tất cả phân cảnh. Vui lòng kiểm tra lại."
        );

        return;
      }

      if (!user) {
        setShowAuthModal(
          true
        );

        return;
      }

      setMergeVideoLoading(
        true
      );

      setRenderProgress(
        "Đang gộp các phân cảnh thành video hoàn chỉnh..."
      );

      try {
        // =====================================================
        // GET CURRENT SUPABASE SESSION
        // =====================================================

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError
        ) {
          throw new Error(
            "Không lấy được phiên đăng nhập."
          );
        }

        const accessToken =
          sessionData
            ?.session
            ?.access_token;

        if (
          !accessToken
        ) {
          setShowAuthModal(
            true
          );

          throw new Error(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          );
        }

        // =====================================================
        // BUILD SCENES
        // =====================================================

        const scenesForMerge =
          script.scenes.map(
            (
              scene: any,
              index: number
            ) => ({
              videoUrl:
                scriptVideoUrls[
                  index
                ],

              duration:
                scene.duration ||
                "3s",

              voiceover:
                scene.voiceover ||
                "",
            })
          );

        // =====================================================
        // MERGE
        // =====================================================

        const mergeRes =
          await fetch(
            "/api/merge-video",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${accessToken}`,
              },

              body:
                JSON.stringify(
                  {
                    videoUrls:
                      scriptVideoUrls,

                    scenes:
                      scenesForMerge,

                    targetDuration:
                      videoLength,

                    voiceType,
                  }
                ),
            }
          );

        const mergeData =
          await mergeRes.json();

        if (
          !mergeRes.ok ||
          !mergeData
            ?.mergedVideoUrl
        ) {
          throw new Error(
            mergeData?.error ||
              "Không thể gộp video."
          );
        }

        const finalUrl =
          mergeData
            .mergedVideoUrl;

        setMergedVideoUrl(
          finalUrl
        );

        // =====================================================
        // REFRESH HISTORY FROM SUPABASE
        // =====================================================

        if (
          mergeData
            ?.historySaved
        ) {
          await fetchVideoHistory(
            user.id
          );
        }

        setRenderProgress(
          mergeData
            ?.historySaved ===
          false
            ? "Gộp video thành công. History tạm thời chưa lưu được."
            : "Gộp video hoàn chỉnh thành công!"
        );
      } catch (
        err: unknown
      ) {
        const message =
          err instanceof Error
            ? err.message
            : "Lỗi khi gộp video.";

        console.error(
          "Merge video error:",
          err
        );

        alert(
          message
        );
      } finally {
        setMergeVideoLoading(
          false
        );
      }
    };

  // =========================================================
  // REGENERATE ONE SCENE
  // =========================================================

  const handleReGenerateSingleScene =
    async (
      sceneIndex: number
    ) => {
      const singleSceneCost =
        20;

      if (
        !user ||
        !user.email
      ) {
        setShowAuthModal(
          true
        );

        return;
      }

      if (
        !script?.scenes?.[
          sceneIndex
        ]
      ) {
        alert(
          "Không tìm thấy phân cảnh."
        );

        return;
      }

      if (
        credits <
        singleSceneCost
      ) {
        setShowPaymentModal(
          true
        );

        return;
      }

      setSingleSceneLoading(
        sceneIndex
      );

      let currentKocImageBase64:
        string | null =
        null;

      if (
        useConsistentCharacter &&
        characterFiles.length >
          0
      ) {
        try {
          currentKocImageBase64 =
            await new Promise<string>(
              (
                resolve,
                reject
              ) => {
                const reader =
                  new FileReader();

                reader.onload =
                  (
                    e
                  ) => {
                    const result =
                      e
                        .target
                        ?.result;

                    if (
                      typeof result ===
                      "string"
                    ) {
                      resolve(
                        result
                      );
                    } else {
                      reject(
                        new Error(
                          "Không đọc được ảnh KOC."
                        )
                      );
                    }
                  };

                reader.onerror =
                  reject;

                reader.readAsDataURL(
                  characterFiles[0]
                );
              }
            );
        } catch (
          err
        ) {
          console.error(
            "Không đọc được ảnh KOC khi tạo lại scene:",
            err
          );
        }
      }

      try {
        const scene =
          script.scenes[
            sceneIndex
          ];

        const res =
          await fetch(
            "/api/generate-video",
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
                    visual_prompt:
                      `${
                        scene.visual_prompt ||
                        ""
                      } ` +
                      `(Create a fresh visual variation. Keep the same product and character identity. ` +
                      `Use a different safe camera composition or a clearly different environment. ` +
                      `Avoid unnecessary full-body walking.)`,

                    scene_spec:
                      scene.scene_spec ||
                      null,

                    cinematic_spec:
                      scene.cinematic_spec ||
                      null,

                    product_identity:
                      script.product_identity ||
                      null,

                    duration:
                      scene.duration ||
                      "3s",

                    voiceover:
                      scene.voiceover ||
                      "",

                    voiceType,

                    scene_number:
                      scene.scene_number,

                    imageUrl:
                      referenceImageUrl,

                    kocImageUrl:
                      currentKocImageBase64,

                    hasCharacter:
                      characterFiles.length >
                      0,

                    user_email:
                      user.email,

                    cost:
                      singleSceneCost,
                  }
                ),
            }
          );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data?.video_url
        ) {
          throw new Error(
            data?.error ||
              "Lỗi tạo lại phân cảnh."
          );
        }

        const updatedUrls =
          [
            ...scriptVideoUrls,
          ];

        updatedUrls[
          sceneIndex
        ] =
          data.video_url;

        setScriptVideoUrls(
          updatedUrls
        );

        setMergedVideoUrl(
          null
        );

        setCredits(
          (
            prev
          ) =>
            Math.max(
              0,
              prev -
                singleSceneCost
            )
        );

        setRenderProgress(
          `Đã tạo lại phân cảnh ${
            sceneIndex +
            1
          }. Hãy kiểm tra lại trước khi gộp video.`
        );
      } catch (
        err: any
      ) {
        alert(
          err?.message ||
            "Lỗi khi tạo lại phân cảnh này."
        );
      } finally {
        setSingleSceneLoading(
          null
        );
      }
    };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-50">

        <div className="flex items-center space-x-2">

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-base sm:text-lg text-white">
            R
          </div>

          <div className="flex items-center gap-1.5">

            <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reelbo.ai
            </span>

          </div>

        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 text-xs">

          <div className="bg-slate-800 border border-yellow-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1">

            <span className="text-yellow-400 font-bold text-[11px] sm:text-xs">
              {credits} Credits
            </span>

            <button
              onClick={() =>
                setShowPaymentModal(
                  true
                )
              }
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full transition shadow"
            >
              + Nạp
            </button>

          </div>

          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full">

              <span className="text-[10px] sm:text-[11px] text-purple-300 font-medium max-w-[70px] sm:max-w-[120px] truncate">
                {user.email}
              </span>

              <button
                onClick={
                  handleLogout
                }
                className="text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded-full transition"
              >
                Thoát
              </button>

            </div>
          ) : (
            <button
              onClick={
                handleLoginGoogle
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
            >
              🔑 Đăng nhập Google
            </button>
          )}

        </div>

      </header>

      {/* BETA BAR */}

      <div className="bg-purple-900/20 border-b border-purple-500/20 text-center py-2 text-xs text-purple-300">

        🔥 Ưu đãi Beta Launch:
        Tặng đến +180 Credits khi
        nạp qua VietQR tự động kích
        hoạt 3s!

      </div>

      <main className="max-w-7xl mx-auto px-4 mt-4">

        {/* =================================================
            CATEGORY
        ================================================= */}

        <div className="flex items-center gap-2 overflow-x-auto pb-3 text-xs">

          <span className="text-slate-400 whitespace-nowrap font-medium">
            Gợi ý mẫu:
          </span>

          {categories.map(
            (
              cat,
              idx
            ) => (
              <button
                key={idx}
                onClick={() =>
                  handleCategoryClick(
                    idx,
                    cat.prompt
                  )
                }
                className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium border ${
                  activeCategory ===
                  idx
                    ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500 hover:bg-purple-600/20"
                }`}
              >
                {cat.name}
              </button>
            )
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">

          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="lg:col-span-5 space-y-4">

            {/* MODE */}

            <div className="grid grid-cols-2 gap-2.5">

              <button
                onClick={() =>
                  setCreativeMode(
                    "creative"
                  )
                }
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative ${
                  creativeMode ===
                  "creative"
                    ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-900/30 -translate-y-0.5"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >

                <div className="font-bold text-xs text-purple-300 flex items-center gap-1.5 mb-1">
                  🔮 AI Sáng Tạo Bối
                  Cảnh Mới
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Bóc sản phẩm & tự
                  động đổi bối cảnh
                  phòng/studio, góc
                  quay điện ảnh 35mm.
                </p>

              </button>

              <button
                onClick={() =>
                  setCreativeMode(
                    "clone"
                  )
                }
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative ${
                  creativeMode ===
                  "clone"
                    ? "bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 -translate-y-0.5"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >

                <div className="font-bold text-xs text-emerald-300 flex items-center gap-1.5 mb-1">
                  ⚡ AI Nhái Chuyển
                  Động
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Giữ chuyển động tham
                  khảo và dùng nhân vật
                  KOC cố định.
                </p>

              </button>

            </div>

            {/* CONTROL CARD */}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">

              {/* KOC */}

              <div className="p-3 rounded-lg border bg-slate-950 border-purple-500/30 space-y-2">

                <div className="flex justify-between items-center">

                  <label className="text-xs font-bold text-purple-300">
                    👤 1. Ảnh Nhân Vật
                    KOC Cố Định
                    (Bán thân/Chân dung):
                  </label>

                  <input
                    type="checkbox"
                    checked={
                      useConsistentCharacter
                    }
                    onChange={(e) =>
                      setUseConsistentCharacter(
                        e.target
                          .checked
                      )
                    }
                    className="accent-purple-600"
                  />

                </div>

                {useConsistentCharacter && (
                  <div className="space-y-2">

                    {characterPreviews.length >
                      0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">

                        {characterPreviews.map(
                          (
                            preview,
                            idx
                          ) => (
                            <div
                              key={
                                idx
                              }
                              className="relative group flex-shrink-0"
                            >

                              <img
                                src={
                                  preview
                                }
                                alt={`KOC ${
                                  idx +
                                  1
                                }`}
                                className="w-10 h-10 rounded-lg object-cover border border-purple-500"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeCharacterImage(
                                    idx
                                  )
                                }
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                              >
                                ✕
                              </button>

                            </div>
                          )
                        )}

                      </div>
                    )}

                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={
                        handleMultipleCharacterChange
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:bg-purple-600 file:border-0 file:rounded file:text-white file:text-[10px] file:py-0.5 file:px-2 cursor-pointer"
                    />

                  </div>
                )}

              </div>

              {/* SOURCE */}

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-[11px] font-bold text-slate-300">
                    🎬 2. Nguồn mẫu:
                  </span>

                  <div className="flex items-center gap-3 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">

                    <label className="flex items-center gap-1 cursor-pointer">

                      <input
                        type="radio"
                        name="inputType"
                        value="file"
                        checked={
                          inputType ===
                          "file"
                        }
                        onChange={() =>
                          setInputType(
                            "file"
                          )
                        }
                        className="accent-purple-500"
                      />

                      <span
                        className={
                          inputType ===
                          "file"
                            ? "text-white font-semibold"
                            : "text-slate-400"
                        }
                      >
                        📂 Tải File
                      </span>

                    </label>

                    <label className="flex items-center gap-1 cursor-pointer">

                      <input
                        type="radio"
                        name="inputType"
                        value="link"
                        checked={
                          inputType ===
                          "link"
                        }
                        onChange={() =>
                          setInputType(
                            "link"
                          )
                        }
                        className="accent-purple-500"
                      />

                      <span
                        className={
                          inputType ===
                          "link"
                            ? "text-white font-semibold"
                            : "text-slate-400"
                        }
                      >
                        🔗 Dán Link
                      </span>

                    </label>

                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                  <div
                    className={`p-2 rounded-lg border transition-all ${
                      inputType ===
                      "file"
                        ? "bg-slate-950 border-purple-500/50 shadow-inner"
                        : "opacity-40 pointer-events-none"
                    }`}
                  >

                    <label className="text-[10px] text-slate-300 font-semibold block mb-1">
                      🖼️ Ảnh/Video sản
                      phẩm:
                    </label>

                    <input
                      type="file"
                      disabled={
                        inputType !==
                        "file"
                      }
                      accept="video/*,image/*"
                      onChange={
                        handleSampleMediaChange
                      }
                      className="w-full text-[11px] text-slate-300 file:bg-purple-600 file:border-0 file:rounded file:text-white file:text-[10px] file:py-0.5 file:px-2 cursor-pointer"
                    />

                    {sampleMediaFile &&
                      inputType ===
                        "file" && (
                        <p className="text-[9px] text-emerald-400 mt-1 truncate">
                          ✓{" "}
                          {
                            sampleMediaFile.name
                          }
                        </p>
                      )}

                  </div>

                  <div
                    className={`p-2 rounded-lg border transition-all ${
                      inputType ===
                      "link"
                        ? "bg-slate-950 border-purple-500/50 shadow-inner"
                        : "opacity-40 pointer-events-none"
                    }`}
                  >

                    <label className="text-[10px] text-slate-300 font-semibold block mb-1">
                      🔗 Link TikTok/Shopee
                      đối thủ:
                    </label>

                    <input
                      type="text"
                      disabled={
                        inputType !==
                        "link"
                      }
                      value={
                        competitorUrl
                      }
                      onChange={(e) =>
                        setCompetitorUrl(
                          e.target
                            .value
                        )
                      }
                      placeholder="https://tiktok.com/@doithu/..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />

                  </div>

                </div>

              </div>

              {/* PRODUCT DESCRIPTION */}

              <div>

                <label className="text-xs text-slate-400 block mb-1">
                  Mô tả sản phẩm
                  (tùy chọn):
                </label>

                <textarea
                  value={
                    textPrompt
                  }
                  onChange={(e) =>
                    setTextPrompt(
                      e.target.value
                    )
                  }
                  placeholder="Nhập tên sản phẩm, ưu điểm nổi bật..."
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />

              </div>

              {/* OPTIONS */}

              <div className="grid grid-cols-2 gap-2">

                <div>

                  <label className="text-[10px] text-slate-400 block mb-1">
                    ⏱️ Thời lượng:
                  </label>

                  <select
                    value={
                      videoLength
                    }
                    onChange={(e) =>
                      setVideoLength(
                        e.target
                          .value
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
                  >

                    <option value="15s">
                      ⚡ 15s (60 Credits)
                    </option>

                    <option value="30s">
                      🔥 30s (100 Credits)
                    </option>

                    <option value="60s">
                      🎬 60s (180 Credits)
                    </option>

                  </select>

                </div>

                <div>

                  <label className="text-[10px] text-slate-400 block mb-1">
                    🎙️ Giọng đọc:
                  </label>

                  <select
                    value={
                      voiceType
                    }
                    onChange={(e) =>
                      setVoiceType(
                        e.target
                          .value
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
                  >

                    <option value="nu_bac">
                      🗣️ Nữ Miền Bắc
                    </option>

                    <option value="nam_nam">
                      🗣️ Nam Miền Nam
                    </option>

                    <option value="nu_nam">
                      🗣️ Nữ Miền Nam
                    </option>

                  </select>

                </div>

              </div>

              <button
                onClick={
                  handleChatSubmit
                }
                disabled={
                  chatLoading ||
                  cooldown > 0
                }
                className="w-full text-white font-semibold py-2.5 rounded-lg text-xs shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition cursor-pointer"
              >

                {chatLoading
                  ? renderProgress ||
                    "⏳ AI Đang Xử Lý Kịch Bản..."
                  : cooldown >
                    0
                  ? `⏳ Đang làm mới AI... (${cooldown}s)`
                  : script
                  ? "🔄 Tạo Lại Kịch Bản AI"
                  : "✨ Tạo Kịch Bản AI (Miễn phí)"}

              </button>

            </div>

            {/* SCRIPT */}

            {script && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">

                <h3 className="font-semibold text-xs text-purple-300">
                  📜 Kịch Bản Chi
                  Tiết (
                  {
                    script.scenes
                      ?.length
                  }{" "}
                  phân cảnh)
                </h3>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">

                  {script.scenes?.map(
                    (
                      scene: any,
                      idx: number
                    ) => (
                      <div
                        key={
                          idx
                        }
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80"
                      >

                        <p className="font-bold text-purple-400 mb-0.5">
                          Phân cảnh{" "}
                          {
                            scene.scene_number
                          }{" "}
                          (
                          {
                            scene.duration
                          }
                          )
                        </p>

                        <p className="text-slate-300 mb-0.5">
                          <strong>
                            Hình ảnh:
                          </strong>{" "}
                          {
                            scene.visual_prompt_vi
                          }
                        </p>

                        <p className="text-slate-400 italic">
                          <strong>
                            Lời thoại:
                          </strong>{" "}
                          "
                          {
                            scene.voiceover
                          }
                          "
                        </p>

                      </div>
                    )
                  )}

                </div>

                <button
                  onClick={
                    handleGenerateAllVideos
                  }
                  disabled={
                    scriptVideoLoading
                  }
                  className="w-full font-bold py-3 rounded-lg text-xs shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                >

                  {scriptVideoLoading
                    ? "🎬 Đang Render Video HD..."
                    : `🪄 Sinh Toàn Bộ Video (-${currentRequiredCredits} Credits)`}

                </button>

              </div>
            )}

          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <div className="lg:col-span-7 space-y-4">

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl min-h-[480px]">

              <div className="flex items-center justify-between">

                <h2 className="font-semibold text-purple-400 text-sm">
                  🎬 Kết Quả Video Studio
                </h2>

                {(scriptVideoLoading ||
                  mergeVideoLoading) && (
                  <span className="text-xs text-yellow-400 font-medium animate-pulse">

                    ⚡{" "}
                    {renderProgress ||
                      "Đang xử lý..."}

                  </span>
                )}

              </div>

              {mergedVideoUrl ? (
                <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-xl space-y-2">

                  <div className="flex justify-between items-center text-xs mb-1">

                    <span className="font-bold text-purple-300">
                      🏆 VIDEO TỔNG
                      HOÀN CHỈNH HD
                    </span>

                    <button
                      onClick={() =>
                        handleDownloadVideo(
                          mergedVideoUrl
                        )
                      }
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      📥 Tải video gộp
                      FREE
                    </button>

                  </div>

                  <video
                    src={
                      mergedVideoUrl
                    }
                    controls
                    autoPlay
                    className="w-full h-56 object-cover rounded-lg bg-black shadow"
                  />

                </div>
              ) : scriptVideoUrls.length >
                0 ? (
                <div className="bg-slate-950 border border-purple-500/30 p-4 rounded-xl space-y-3">

                  <div className="text-center space-y-1">

                    <p className="text-xs font-bold text-purple-300">
                      👀 Hãy kiểm tra từng phân cảnh trước khi gộp
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Nếu có cảnh chưa ưng,
                      hãy bấm “Tạo lại” ở
                      cảnh đó trước khi tạo
                      video hoàn chỉnh.
                    </p>

                  </div>

                  <button
                    onClick={
                      handleMergeVideo
                    }
                    disabled={
                      mergeVideoLoading ||
                      scriptVideoUrls.length !==
                        script?.scenes
                          ?.length
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs shadow-lg transition cursor-pointer"
                  >
                    {mergeVideoLoading
                      ? "⏳ Đang Gộp Video..."
                      : "🎬 Gộp Video Hoàn Chỉnh"}
                  </button>

                </div>
              ) : (
                <div className="border border-dashed border-slate-800/80 rounded-xl h-40 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">

                  <span className="text-2xl animate-bounce">
                    🎬
                  </span>

                  <p className="text-slate-400 font-medium">
                    Khung hiển thị video
                    thành phẩm gộp HD
                  </p>

                  <span className="text-[10px] text-slate-500">
                    Bấm tạo kịch bản và
                    sinh toàn bộ video ở
                    đây
                  </span>

                </div>
              )}

              {/* SCENES */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {scriptVideoUrls.length >
                0 ? (
                  scriptVideoUrls.map(
                    (
                      url,
                      idx
                    ) => (
                      <div
                        key={
                          `${url}-${idx}`
                        }
                        className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-2"
                      >

                        <div className="flex justify-between items-center text-[11px]">

                          <span className="font-semibold text-purple-300">
                            Phân cảnh{" "}
                            {idx +
                              1}
                          </span>

                          <div className="flex items-center gap-2">

                            <button
                              onClick={() =>
                                handleReGenerateSingleScene(
                                  idx
                                )
                              }
                              disabled={
                                singleSceneLoading ===
                                idx
                              }
                              className="text-yellow-400 hover:text-yellow-300 text-[10px] font-medium underline flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            >

                              {singleSceneLoading ===
                              idx
                                ? "⏳ Đang tạo lại..."
                                : "🔄 Tạo lại (-20 Credits)"}

                            </button>

                            <button
                              onClick={() =>
                                handleDownloadVideo(
                                  url
                                )
                              }
                              className="text-purple-400 hover:underline text-[10px]"
                            >
                              Tải về
                            </button>

                          </div>

                        </div>

                        <video
                          src={
                            url
                          }
                          controls
                          className="w-full h-32 object-cover rounded-lg bg-black"
                        />

                      </div>
                    )
                  )
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500 italic">

                    Các phân cảnh video
                    riêng lẻ sẽ tự động
                    hiển thị ở đây sau
                    khi bạn bấm "Sinh
                    Toàn Bộ Video".

                  </div>
                )}

              </div>

              {/* =================================================
                  HISTORY SUPABASE
              ================================================= */}

              {historyList.length >
                0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-2">

                  <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">

                    🕒 Video của bạn trong
                    72 giờ gần nhất (
                    {
                      historyList.length
                    }
                    ):

                  </h3>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2">

                    {historyList.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex-shrink-0 w-36 bg-slate-950 border border-slate-800 p-1.5 rounded-lg space-y-1"
                        >

                          <video
                            src={
                              item.videoUrl
                            }
                            controls
                            preload="metadata"
                            className="w-full h-20 object-cover rounded bg-black"
                          />

                          <div className="text-[9px] text-slate-400 truncate">

                            {
                              item.createdAt
                            }

                          </div>

                          <div className="flex items-center justify-between text-[9px]">

                            <span className="text-slate-500">

                              {item.durationSeconds
                                ? `${item.durationSeconds}s`
                                : ""}

                            </span>

                            <button
                              onClick={() =>
                                handleDownloadVideo(
                                  item.videoUrl
                                )
                              }
                              className="text-purple-400 font-bold hover:underline"
                            >
                              Tải
                            </button>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full text-center relative space-y-4">

            <button
              onClick={() =>
                setShowPaymentModal(
                  false
                )
              }
              className="absolute top-3 right-4 text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-purple-400">
              Nạp Credits Render
              Video AI HD
            </h3>

            <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">

              <button
                onClick={() => {
                  setPaymentTab(
                    "one_time"
                  );

                  setSelectedPlanAmount(
                    100000
                  );
                }}
                className={`py-2 rounded-lg ${
                  paymentTab ===
                  "one_time"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400"
                }`}
              >
                💳 Nạp Lẻ Credits
              </button>

              <button
                onClick={() => {
                  setPaymentTab(
                    "subscription"
                  );

                  setSelectedPlanAmount(
                    499000
                  );
                }}
                className={`py-2 rounded-lg ${
                  paymentTab ===
                  "subscription"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400"
                }`}
              >
                👑 Gói Đăng Ký Tháng
              </button>

            </div>

            {paymentTab ===
            "one_time" ? (
              <div className="grid grid-cols-2 gap-2.5 text-left">

                {topupPlans.map(
                  (
                    plan
                  ) => (
                    <div
                      key={
                        plan.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          plan.amount
                        )
                      }
                      className={`p-3 rounded-xl border cursor-pointer ${
                        selectedPlanAmount ===
                        plan.amount
                          ? "bg-purple-950/60 border-purple-500"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >

                      <p className="font-bold text-xs text-white">
                        {
                          plan.credits
                        }{" "}
                        Credits
                      </p>

                      <span className="font-bold text-emerald-400 text-xs block mt-1">

                        {plan.amount.toLocaleString(
                          "vi-VN"
                        )}
                        đ{" "}

                        <span className="text-[9px] text-amber-400 font-normal">
                          (
                          {
                            plan.bonus
                          }
                          )
                        </span>

                      </span>

                    </div>
                  )
                )}

              </div>
            ) : (
              <div className="space-y-2 text-left">

                {subscriptionPlans.map(
                  (
                    sub
                  ) => (
                    <div
                      key={
                        sub.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          sub.amount
                        )
                      }
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                        selectedPlanAmount ===
                        sub.amount
                          ? "bg-purple-950/60 border-purple-500"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >

                      <p className="font-bold text-xs text-white">

                        Gói{" "}
                        {
                          sub.name
                        }{" "}
                        (
                        {sub.credits.toLocaleString(
                          "vi-VN"
                        )}{" "}
                        Credits)

                      </p>

                      <span className="font-bold text-emerald-400 text-sm">
                        {
                          sub.label
                        }
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

            <button
              onClick={
                handlePaymentClick
              }
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg"
            >

              💳 Thanh Toán VietQR (
              {(selectedPlanAmount ||
                0
              ).toLocaleString(
                "vi-VN"
              )}{" "}
              VNĐ)

            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          AUTH MODAL
      ===================================================== */}

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative text-center">

            <button
              onClick={() =>
                setShowAuthModal(
                  false
                )
              }
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2">
              Đăng Nhập Tài Khoản
            </h3>

            <p className="text-xs text-slate-400 mb-6">
              Đăng nhập bằng Google để
              hệ thống kích hoạt Credits
              tự động khi chuyển khoản.
            </p>

            <button
              onClick={
                handleLoginGoogle
              }
              className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
            >
              Tiếp tục với tài khoản
              Google
            </button>

          </div>

        </div>
      )}

    </div>
  );
}