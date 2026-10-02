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

const [totalCostUSD, setTotalCostUSD] = useState<number>(0);
  const [sceneCosts, setSceneCosts] = useState<{ scene: number; cost: number }[]>([]);
  const [
    productReferenceImage,
    setProductReferenceImage,
  ] = useState<string | null>(null);
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
    useState<(string | null)[]>([]);

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
  const [
    failedSceneIndexes,
    setFailedSceneIndexes,
  ] =
    useState<number[]>([]);
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
  
  const [
    showHistory,
    setShowHistory,
  ] = useState(false);

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
  // DURATION / PRICING HELPERS
  // =========================================================

  const parseSceneDuration =
    (
      value: unknown
    ): number => {
      if (
        typeof value ===
        "number"
      ) {
        return Number.isFinite(
          value
        )
          ? value
          : 3;
      }

      if (
        typeof value !==
        "string"
      ) {
        return 3;
      }

      const match =
        value.match(
          /(\d+(?:\.\d+)?)/
        );

      if (!match) {
        return 3;
      }

      const parsed =
        Number(
          match[1]
        );

      return Number.isFinite(
        parsed
      )
        ? parsed
        : 3;
    };

  const getTargetDurationSeconds =
    (): 15 | 30 | 60 => {
      if (
        videoLength ===
        "30s"
      ) {
        return 30;
      }

      if (
        videoLength ===
        "60s"
      ) {
        return 60;
      }

      return 15;
    };

  const calculateRegenerateCredits =
    (
      durationValue: unknown
    ) => {
      const duration =
        parseSceneDuration(
          durationValue
        );

      let base =
        20;

      if (
        duration > 3 &&
        duration <= 5
      ) {
        base = 25;
      }

      if (
        duration > 5
      ) {
        base = 30;
      }

      return videoMode ===
        "hd_pro"
        ? base * 2
        : base;
    };

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
      setScriptVideoUrls([]);
      setMergedVideoUrl(null);
      setReferenceImageUrl(null);
      setRenderProgress("");

      let crawledText =
        textPrompt;

      let videoAnalysis: any =
        null;

      let currentReferenceImage:
        string | null =
        null;

      // =====================================================
      // LINK
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
            const extractedCover =
        crawlData.data.coverImage ||
        crawlData.data.origin_cover ||
        crawlData.data.cover ||
        crawlData.data.dynamic_cover;

      if (extractedCover) {
        currentReferenceImage = extractedCover;
        setReferenceImageUrl(extractedCover);
        console.log("[Reelbo] Đã nạp ảnh mẫu váy vào state:", extractedCover);
      }
            if (
              crawlData.data
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
      // FILE
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
                        e.target
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
              const recommendedTimestamp =
              analyzeData.analysis
                ?.reference_frame
                ?.recommended_timestamp;
            
            if (
              recommendedTimestamp &&
              sampleMediaFile
            ) {
              const referenceFormData =
                new FormData();
            
              referenceFormData.append(
                "video",
                sampleMediaFile
              );
            
              referenceFormData.append(
                "timestamp",
                String(
                  recommendedTimestamp
                )
              );
            
              const referenceRes =
                await fetch(
                  "/api/extract-reference-frame",
                  {
                    method: "POST",
                    body:
                      referenceFormData,
                  }
                );
            
              const referenceData =
                await referenceRes.json();
            
              if (
                referenceRes.ok &&
                referenceData
                  ?.product_reference_image
              ) {
                setProductReferenceImage(
                  referenceData.product_reference_image
                );
                videoAnalysis =
                  {
                    ...videoAnalysis,
                    product_reference_image:
                      referenceData
                        .product_reference_image,
                  };
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

      if (
        currentReferenceImage
      ) {
        setReferenceImageUrl(
          currentReferenceImage
        );
      }

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
      script.scenes.length === 0
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

    const {
      data:
        sessionData,
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError
    ) {
      alert(
        "Không lấy được phiên đăng nhập."
      );

      return;
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

      alert(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );

      return;
    }

    // =====================================================
    // 1. REQUEST ID
    // =====================================================

    const renderRequestId =
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
        ? crypto.randomUUID()
        : `render_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;

    // =====================================================
    // 2. SCENE DURATION PLAN
    // =====================================================

    const sceneDurations =
      script.scenes.map(
        (
          scene: any
        ) =>
          parseSceneDuration(
            scene.duration ||
              "3s"
          )
      );

    const targetDuration =
      getTargetDurationSeconds();

    // =====================================================
    // 3. KOC IMAGE
    // =====================================================

    let currentKocImageBase64:
      string | null =
      null;

    if (
      useConsistentCharacter &&
      characterFiles.length > 0
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
                    e.target
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

    // =====================================================
    // 4. INITIALIZE SCENE SLOTS
    // =====================================================

    const sceneResults:
      (string | null)[] =
      new Array(
        script.scenes.length
      ).fill(
        null
      );

    setScriptVideoLoading(
      true
    );

    setScriptVideoUrls(
      sceneResults
    );

    setFailedSceneIndexes(
      []
    );

    setMergedVideoUrl(
      null
    );

    setRenderProgress(
      "Đang khởi tạo gói render..."
    );

    try {
      // ===================================================
      // 5. START RENDER JOB
      // ===================================================

      const startRes =
        await fetch(
          "/api/render/start",
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
                  render_request_id:
                    renderRequestId,

                  duration_seconds:
                    targetDuration,

                  video_mode:
                    videoMode,

                  scene_durations:
                    sceneDurations,
                }
              ),
          }
        );

      const startData =
        await startRes.json();

      if (
        !startRes.ok ||
        !startData
          ?.render_job_id
      ) {
        throw new Error(
          startData?.error ||
            "Không thể khởi tạo render."
        );
      }

      const renderJobId =
        String(
          startData.render_job_id
        );

      if (
        typeof startData
          ?.remaining_credits ===
        "number"
      ) {
        setCredits(
          startData
            .remaining_credits
        );
      }

      // ===================================================
      // 6. GENERATE EACH SCENE
      // ===================================================
      let previousSceneLastFrame: string | null = null;

      
      for (
        let i = 0;
        i < Math.min(1, script.scenes.length);
        i++
      ) {
        const scene =
          script.scenes[i];

        setRenderProgress(
          `Đang render phân cảnh ${
            i + 1
          }/${
            script.scenes.length
          }...`
        );

        try {
          const res =
            await fetch(
              "/api/generate-video",
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
                      action:
                        "full_render",

                      render_job_id:
                        renderJobId,

                      video_mode:
                        videoMode,

                      visual_prompt:
                        scene.visual_prompt,

                      scene_spec:
                        scene.scene_spec ||
                        null,

                      cinematic_spec:
                        scene.cinematic_spec ||
                        null,

                        product_identity:
                        script.product ||
                        script.product_identity ||
                        null,

                      duration:
                        sceneDurations[
                          i
                        ],

                      voiceover:
                        scene.voiceover ||
                        "",

                      voiceType,

                      scene_number:
                        i + 1,

                        imageUrl:
                        productReferenceImage ||
                        referenceImageUrl ||
                        null,
                      
                      product_image:
                        productReferenceImage ||
                        referenceImageUrl ||
                        null,
                        lastFrameUrl: previousSceneLastFrame,
                        kocImageUrl: currentKocImageBase64,
                        hasCharacter: characterFiles.length > 0,
                      }),
                    }
                  );
  
                  const data: any = await res.json();

          // Đồng bộ Credits kể cả trường hợp scene bị refund.
          if (
            typeof data
              ?.remaining_credits ===
            "number"
          ) {
            setCredits(
              data
                .remaining_credits
            );
          }

          if (
            !res.ok ||
            !data?.video_url
          ) {
            throw new Error(
              data?.error ||
                `Không tạo được phân cảnh ${
                  i + 1
                }.`
            );
          }

          // ===============================================
          // SCENE SUCCESS
          // ===============================================

          sceneResults[i] =
            data.video_url;
            previousSceneLastFrame = data?.last_frame_url || data?.video_url || null;
            
            if (data?.cost_usd) {
              setTotalCostUSD((prev: number) => Number((prev + Number(data.cost_usd)).toFixed(2)));
              setSceneCosts((prev: any[]) => [...prev, { scene: i + 1, cost: Number(data.cost_usd) }]);
            }
          setScriptVideoUrls(
            [
              ...sceneResults,
            ]
          );

          setFailedSceneIndexes(
            (
              previous
            ) =>
              previous.filter(
                (
                  index
                ) =>
                  index !== i
              )
          );
        } catch (
          sceneError:
            unknown
        ) {
          // ===============================================
          // SCENE FAILED
          // ===============================================
          //
          // KHÔNG throw ra ngoài.
          // Giữ slot = null và chạy tiếp scene sau.
          //

          console.error(
            `[Reelbo] Scene ${
              i + 1
            } failed:`,
            sceneError
          );

          sceneResults[i] =
            null;

          setScriptVideoUrls(
            [
              ...sceneResults,
            ]
          );

          setFailedSceneIndexes(
            (
              previous
            ) =>
              previous.includes(
                i
              )
                ? previous
                : [
                    ...previous,
                    i,
                  ]
          );
        }
      }

      // ===================================================
      // 7. FINAL RESULT
      // ===================================================

      const failedCount =
        sceneResults.filter(
          (
            url
          ) =>
            !url
        ).length;

      const successCount =
        sceneResults.length -
        failedCount;

      if (
        failedCount === 0
      ) {
        setRenderProgress(
          `Đã tạo xong ${successCount}/${sceneResults.length} phân cảnh. Hãy kiểm tra từng phân cảnh trước khi gộp.`
        );
      } else {
        setRenderProgress(
          `Đã tạo ${successCount}/${sceneResults.length} phân cảnh. ${failedCount} phân cảnh bị lỗi và đã được xử lý hoàn Credits nếu đủ điều kiện.`
        );
      }
    } catch (
      err: unknown
    ) {
      // Chỉ những lỗi cấp render-job mới vào đây,
      // ví dụ không khởi tạo được job.
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi trong quá trình khởi tạo render.";

      console.error(
        "[Reelbo Full Render] Fatal error:",
        err
      );

      alert(
        message
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
      const completedVideoUrls =
      scriptVideoUrls.filter(
        (url): url is string =>
          typeof url === "string" &&
          url.length > 0
      );
    
    if (
      completedVideoUrls.length !==
      script.scenes.length
    ) {
      alert(
        "Vẫn còn phân cảnh chưa tạo thành công. Hãy tạo đủ tất cả phân cảnh trước khi gộp."
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
                      completedVideoUrls,

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
    if (
      !user ||
      !user.email
    ) {
      setShowAuthModal(
        true
      );

      return;
    }

    const scene =
      script?.scenes?.[
        sceneIndex
      ];

    if (!scene) {
      alert(
        "Không tìm thấy phân cảnh."
      );

      return;
    }

    // =====================================================
    // 1. PRICE CHECK
    // =====================================================

    const expectedRegenerateCredits =
      calculateRegenerateCredits(
        scene.duration ||
          "3s"
      );

    if (
      credits <
      expectedRegenerateCredits
    ) {
      setShowPaymentModal(
        true
      );

      return;
    }

    // =====================================================
    // 2. AUTH
    // =====================================================

    const {
      data:
        sessionData,
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError
    ) {
      alert(
        "Không lấy được phiên đăng nhập."
      );

      return;
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

      alert(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );

      return;
    }

    // =====================================================
    // 3. UNIQUE GENERATION REQUEST
    // =====================================================

    const generationRequestId =
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
        ? crypto.randomUUID()
        : `regen_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;

    setSingleSceneLoading(
      sceneIndex
    );

    // =====================================================
    // 4. KOC IMAGE
    // =====================================================

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
                    e.target
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
          "Không đọc được ảnh KOC khi tạo scene:",
          err
        );
      }
    }

    try {
      // ===================================================
      // 5. GENERATE
      // ===================================================

      const res =
        await fetch(
          "/api/generate-video",
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
                  action:
                    "regenerate",

                  generation_request_id:
                    generationRequestId,

                  video_mode:
                    videoMode,

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
                    scene.scene_number ||
                    sceneIndex +
                      1,

                  imageUrl:
                    referenceImageUrl,
                    product_image: productReferenceImage || referenceImageUrl || null,
                  kocImageUrl:
                    currentKocImageBase64,

                  hasCharacter:
                    characterFiles.length >
                    0,
                }
              ),
          }
        );

      const data =
        await res.json();

      // ===================================================
      // 6. SYNC CREDITS
      // ===================================================
      //
      // Thành công:
      // backend trả balance sau charge.
      //
      // Thất bại:
      // backend refund và trả balance sau refund.
      //

      if (
        typeof data
          ?.remaining_credits ===
        "number"
      ) {
        setCredits(
          data.remaining_credits
        );
      }

      if (
        !res.ok ||
        !data?.video_url
      ) {
        throw new Error(
          data?.error ||
            "Lỗi tạo phân cảnh."
        );
      }

      // ===================================================
      // 7. SUCCESS — REPLACE EXACT SLOT
      // ===================================================

      setScriptVideoUrls(
        (
          previous
        ) => {
          const updated =
            [
              ...previous,
            ];

          // Đảm bảo array đủ số slot.
          while (
            updated.length <
            script.scenes.length
          ) {
            updated.push(
              null
            );
          }

          updated[
            sceneIndex
          ] =
            data.video_url;

          return updated;
        }
      );

      // Scene này không còn failed.
      setFailedSceneIndexes(
        (
          previous
        ) =>
          previous.filter(
            (
              index
            ) =>
              index !==
              sceneIndex
          )
      );

      // Vì một scene vừa thay đổi,
      // video merged cũ không còn hợp lệ.
      setMergedVideoUrl(
        null
      );

      setRenderProgress(
        `Đã tạo ${
          scriptVideoUrls[
            sceneIndex
          ]
            ? "lại"
            : "thành công"
        } phân cảnh ${
          sceneIndex +
          1
        }. Hãy kiểm tra trước khi gộp video.`
      );
    } catch (
      err: unknown
    ) {
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi khi tạo phân cảnh.";

      console.error(
        `[Reelbo Regenerate] Scene ${
          sceneIndex +
          1
        } failed:`,
        err
      );

      // Nếu scene vốn đã null thì giữ nó trong danh sách failed.
      setFailedSceneIndexes(
        (
          previous
        ) =>
          previous.includes(
            sceneIndex
          )
            ? previous
            : [
                ...previous,
                sceneIndex,
              ]
      );

      alert(
        message
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

      {/* HEADER HOÀN CHỈNH ĐÃ CHUẨN HÓA CÚ PHÁP */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-base sm:text-lg text-white">
            R
          </div>
          <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reelbo.ai
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
          {/* NÚT LỊCH SỬ KÈM DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
            >
              <span>🕒</span>
              <span>Lịch sử</span>
              {historyList.length > 0 && (
                <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {historyList.length}
                </span>
              )}
            </button>

            {showHistory && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="font-bold text-xs text-slate-200">
                    🕒 Video gần nhất (72 giờ)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                {historyList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Chưa có video nào được lưu trong lịch sử.
                  </div>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-32 bg-slate-950 border border-slate-800 p-1.5 rounded-lg"
                      >
                        <video
                          src={item.videoUrl}
                          controls
                          preload="metadata"
                          className="w-full h-20 object-cover rounded bg-black"
                        />
                        <div className="text-[9px] text-slate-400 mt-1 truncate">
                          {item.createdAt}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadVideo(item.videoUrl)}
                          className="text-purple-400 hover:text-purple-300 text-[10px] font-bold mt-0.5 block"
                        >
                          Tải xuống
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ô CREDITS VÀ NẠP */}
          <div className="bg-slate-800 border border-yellow-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1">
            <span className="text-yellow-400 font-bold text-[11px] sm:text-xs">
              {credits} Credits
            </span>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            >
              + Nạp
            </button>
          </div>

          {/* Ô TÀI KHOẢN HOẶC LOGIN */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full">
              <span className="text-[10px] sm:text-[11px] text-purple-300 font-medium max-w-[70px] sm:max-w-[120px] truncate">
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[9px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded-full"
              >
                Thoát
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLoginGoogle}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full"
            >
              🔑 Đăng nhập Google
            </button>
          )}
        </div>
      </header>

      <div className="bg-purple-900/20 border-b border-purple-500/20 text-center py-2 text-xs text-purple-300">
        🔥 Ưu đãi Beta Launch: Tặng đến +180 Credits khi nạp qua VietQR tự động kích hoạt 3s!
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-4">

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
                className={`px-3 py-1 rounded-full whitespace-nowrap border ${
                  activeCategory ===
                  idx
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                {cat.name}
              </button>
            )
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">

          <div className="lg:col-span-5 space-y-4">

            <div className="grid grid-cols-1 gap-2.5">

              <button
                onClick={() =>
                  setCreativeMode(
                    "creative"
                  )
                }
                className={`p-3.5 rounded-xl border text-left ${
                  creativeMode ===
                  "creative"
                    ? "bg-purple-950/60 border-purple-500"
                    : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <div className="font-bold text-xs text-purple-300">
                  🔮 AI Sáng Tạo Bối Cảnh Mới
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Bóc sản phẩm & tự động đổi bối cảnh, góc quay mới.
                </p>
              </button>

              {false && (
  <button
    onClick={() =>
      setCreativeMode(
        "clone"
      )
    }
    className={`p-3.5 rounded-xl border text-left ${
      creativeMode ===
      "clone"
        ? "bg-emerald-950/60 border-emerald-500"
        : "bg-slate-900/80 border-slate-800"
    }`}
  >
    <div className="font-bold text-xs text-emerald-300">
      ⚡ AI Nhái Chuyển Động
    </div>

    <p className="text-[10px] text-slate-400 mt-1">
      Giữ chuyển động tham khảo và dùng nhân vật KOC cố định.
    </p>
  </button>
)}

            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5">

              <div className="p-3 rounded-lg border bg-slate-950 border-purple-500/30 space-y-2">

                <div className="flex justify-between items-center">

                  <label className="text-xs font-bold text-purple-300">
                    👤 1. Ảnh Nhân Vật KOC Cố Định
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
                              className="relative flex-shrink-0"
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
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[9px]"
                              >
                                ✕
                              </button>
                            </div>
                          )
                        )}

                      </div>
                    )}

<label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-dashed border-purple-500/70 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-xs font-semibold cursor-pointer transition shadow-md">
                      <span>📁 Chọn ảnh KOC (Tối đa 10 ảnh)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleCharacterChange}
                        className="hidden"
                      />
                    </label>

                  </div>
                )}

              </div>

              {/* Ô chọn ảnh sản phẩm cố định */}
<div className="mb-4 p-3 rounded-lg border border-dashed border-purple-500/40 bg-purple-950/20">
  <div className="flex items-center justify-between mb-2">
    <label className="text-xs font-semibold text-purple-200">
      👗 1.1. Ảnh Sản Phẩm Mẫu (Bắt buộc để giữ đúng váy)
    </label>
    {productReferenceImage && (
      <button
        type="button"
        onClick={() => setProductReferenceImage(null)}
        className="text-[11px] text-red-400 hover:underline"
      >
        Xóa ảnh
      </button>
    )}
  </div>

  {!productReferenceImage ? (
    <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded border border-gray-700 bg-gray-800/60 hover:bg-gray-800 cursor-pointer text-xs text-gray-300">
      <span>📷 Tải ảnh váy / sản phẩm nét (PNG, JPG)</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setProductReferenceImage(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        }}
      />
    </label>
  ) : (
    <div className="flex items-center gap-3">
      <img
        src={productReferenceImage}
        alt="Sản phẩm"
        className="w-12 h-12 object-cover rounded border border-purple-400"
      />
      <span className="text-xs text-green-400">✓ Đã nạp ảnh sản phẩm cố định</span>
    </div>
  )}
</div>

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-[11px] font-bold text-slate-300">
                    🎬 2. Nguồn mẫu:
                  </span>

                  <div className="flex items-center gap-3 text-xs">

                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={
                          inputType ===
                          "file"
                        }
                        onChange={() =>
                          setInputType(
                            "file"
                          )
                        }
                      />
                      📂 Tải File
                    </label>

                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={
                          inputType ===
                          "link"
                        }
                        onChange={() =>
                          setInputType(
                            "link"
                          )
                        }
                      />
                      🔗 Dán Link
                    </label>

                  </div>

                </div>

                {inputType === "file" ? (
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg border border-dashed border-purple-500 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 text-xs font-semibold cursor-pointer transition shadow-md">
                    <span>🎬 {sampleMediaFile ? sampleMediaFile.name : "Nhấp để tải lên Video / Ảnh sản phẩm mẫu"}</span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleSampleMediaChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <input
                    type="text"
                    value={competitorUrl}
                    onChange={(e) =>
                      setCompetitorUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://tiktok.com/..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg p-2.5 text-xs text-slate-200 outline-none transition"
                  />
                )}
              </div>

              <textarea
                value={
                  textPrompt
                }
                onChange={(e) =>
                  setTextPrompt(
                    e.target.value
                  )
                }
                placeholder="Mô tả sản phẩm..."
                className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs"
              />

              <div className="grid grid-cols-2 gap-2">

                <select
                  value={
                    videoLength
                  }
                  onChange={(e) =>
                    setVideoLength(
                      e.target.value
                    )
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs"
                >
                  <option value="15s">
                    15s
                  </option>

                  <option value="30s">
                    30s
                  </option>

                  <option value="60s">
                    60s
                  </option>
                </select>

                <select
                  value={
                    voiceType
                  }
                  onChange={(e) =>
                    setVoiceType(
                      e.target.value
                    )
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs"
                >
                  <option value="nu_bac">
                    Nữ Miền Bắc
                  </option>

                  <option value="nam_nam">
                    Nam Miền Nam
                  </option>

                  <option value="nu_nam">
                    Nữ Miền Nam
                  </option>
                </select>

              </div>

              <button
                onClick={
                  handleChatSubmit
                }
                disabled={
                  chatLoading ||
                  cooldown > 0
                }
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2.5 rounded-lg text-xs disabled:opacity-50"
              >
                {chatLoading
                  ? renderProgress ||
                    "AI Đang Xử Lý..."
                  : script
                  ? "🔄 Tạo Lại Kịch Bản AI"
                  : "✨ Tạo Kịch Bản AI"}
              </button>

            </div>

            {script && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">

                <h3 className="font-semibold text-xs text-purple-300">
                  📜 Kịch Bản Chi Tiết
                </h3>

                <div className="max-h-48 overflow-y-auto space-y-2 text-xs">

                  {script.scenes?.map(
                    (
                      scene: any,
                      idx: number
                    ) => (
                      <div
                        key={
                          idx
                        }
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800"
                      >
                        <p className="font-bold text-purple-400">
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

                        <p className="text-slate-300">
                          {
                            scene.visual_prompt_vi
                          }
                        </p>

                        <p className="text-slate-400 italic">
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
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg text-xs disabled:opacity-50"
                >
                  {scriptVideoLoading
                    ? "🎬 Đang Render..."
                    : `🪄 Sinh Toàn Bộ Video (-${currentRequiredCredits} Credits)`}
                </button>

              </div>
            )}

          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 min-h-[480px]">
              {/* HEADER STUDIO */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-purple-400 text-sm flex items-center gap-2">
                  🎬 Kết Quả Video Studio
                </h2>

                {/* Nút Gộp Video chỉ sáng khi TẤT CẢ các cảnh đã render thành công */}
                {script &&
                  scriptVideoUrls.length === script.scenes?.length &&
                  scriptVideoUrls.every((u) => Boolean(u)) &&
                  !mergedVideoUrl && (
                    <button
                      onClick={handleMergeVideo}
                      disabled={mergeVideoLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:opacity-90 transition disabled:opacity-50"
                    >
                      {mergeVideoLoading ? "⏳ Đang Gộp Video..." : "✨ Gộp Video Hoàn Chỉnh"}
                    </button>
                  )}
              </div>

              {/* 1. KHUNG PLAYER CHÍNH (Đúng chuẩn khung lớn ảnh 2) */}
              {mergedVideoUrl ? (
                <div className="bg-slate-950 border border-purple-500/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-300 text-xs">
                      🏆 VIDEO TỔNG HOÀN CHỈNH HD
                    </span>
                    <button
                      onClick={() => handleDownloadVideo(mergedVideoUrl)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-medium transition"
                    >
                      📥 Tải video
                    </button>
                  </div>
                  <video
                    src={mergedVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-64 object-cover rounded-lg bg-black"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 rounded-xl h-52 flex flex-col items-center justify-center p-6 text-center bg-slate-950/50">
                  {mergeVideoLoading ? (
                    <div className="flex flex-col items-center gap-2 text-purple-400">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-300">Đang ghép nối và hoàn thiện video cuối cùng...</p>
                    </div>
                  ) : scriptVideoLoading ? (
                    <div className="flex flex-col items-center gap-2 text-purple-400">
                      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-200">
                        {renderProgress || "Đang render các phân cảnh..."}
                      </p>
                      <span className="text-[11px] text-slate-500">Video thành phẩm sẽ sẵn sàng gộp sau khi hoàn tất các cảnh</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-2xl mb-1">🎬</div>
                      <p className="font-medium text-xs text-slate-300">Khung hiển thị video thành phẩm gộp HD</p>
                      <p className="text-[11px] text-slate-500">Bấm tạo kịch bản và sinh toàn bộ video ở đây</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. KHU VỰC CHI TIẾT TỪNG PHÂN CẢNH */}
              {scriptVideoUrls.length === 0 ? (
                /* Trạng thái rỗng ban đầu y hệt ảnh 2 */
                <div className="border border-slate-800/60 rounded-xl bg-slate-950/40 p-8 text-center">
                  <p className="text-xs text-slate-500">
                    Các phân cảnh video riêng lẻ sẽ tự động hiển thị ở đây sau khi bạn bấm "Sinh Toàn Bộ Video".
                  </p>
                </div>
              ) : (
                /* Grid hiển thị trạng thái từng cảnh rõ ràng, loại bỏ báo lỗi giả */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scriptVideoUrls.map((url, idx) => {
                    const scene = script?.scenes?.[idx];
                    const regenerateCredits = calculateRegenerateCredits(scene?.duration || "3s");
                    const isFailed = failedSceneIndexes.includes(idx);
                    const isRenderingThisScene =
                      singleSceneLoading === idx ||
                      (scriptVideoLoading && !url && !isFailed);

                    return (
                      <div
                        key={`${url ?? "scene"}-${idx}`}
                        className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-between"
                      >
                        {/* Header của từng thẻ cảnh */}
                        <div className="flex justify-between items-center text-[11px] mb-2">
                          <span
                            className={
                              url
                                ? "text-purple-300 font-semibold"
                                : isFailed
                                ? "text-red-400 font-semibold"
                                : "text-slate-400"
                            }
                          >
                            Phân cảnh {idx + 1}
                            {url && " • Sẵn sàng"}
                            {isRenderingThisScene && " • Đang tạo..."}
                            {isFailed && " • Lỗi"}
                          </span>

                          <button
                            onClick={() => handleReGenerateSingleScene(idx)}
                            disabled={singleSceneLoading === idx || scriptVideoLoading}
                            className="text-yellow-400 text-[10px] hover:underline disabled:opacity-50"
                          >
                            {singleSceneLoading === idx
                              ? "Đang tạo..."
                              : url
                              ? `🔄 Tạo lại (-${regenerateCredits} Cr)`
                              : `🎬 Tạo cảnh này (-${regenerateCredits} Cr)`}
                          </button>
                        </div>

                        {/* Nội dung cảnh: Đã có video / Đang chạy / Bị lỗi thật */}
                        {url ? (
                          <video
                            src={url}
                            controls
                            className="w-full h-32 object-cover rounded-lg bg-black"
                          />
                        ) : isRenderingThisScene ? (
                          <div className="w-full h-32 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 px-3 text-center">
                            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <div className="text-[11px] text-purple-300 font-medium">
                              Đang render cảnh {idx + 1}...
                            </div>
                            <div className="text-[10px] text-slate-500">AI đang xử lý hình ảnh và chuyển động</div>
                          </div>
                        ) : isFailed ? (
                          /* Chỉ hiện card cảnh báo đỏ khi thực sự lỗi và đã ghi nhận vào failedSceneIndexes */
                          <div className="w-full h-32 rounded-lg bg-red-950/20 border border-red-500/30 flex flex-col items-center justify-center gap-1.5 text-center px-3">
                            <div className="text-red-400 text-[11px] font-bold">⚠️ Phân cảnh chưa tạo được</div>
                            <div className="text-slate-400 text-[9px] leading-tight">
                              Credits của lần tạo trước đã được hoàn tự động vào tài khoản.
                            </div>
                            <button
                              onClick={() => handleReGenerateSingleScene(idx)}
                              disabled={singleSceneLoading === idx}
                              className="mt-1 bg-red-900/50 hover:bg-red-800/80 border border-red-700/50 text-white text-[9px] px-2 py-1 rounded"
                            >
                              Thử tạo lại cảnh này
                            </button>
                          </div>
                        ) : (
                          /* Trạng thái chờ trong hàng đợi */
                          <div className="w-full h-32 rounded-lg bg-slate-900/30 border border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-[11px]">
                            Đang chờ đến lượt...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* LỊCH SỬ VIDEO */}
              

              {showHistory && historyList.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-400">
                    🕒 Video của bạn trong 72 giờ gần nhất
                  </h3>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-36 bg-slate-950 border border-slate-800 p-1.5 rounded-lg"
                      >
                        <video
                          src={item.videoUrl}
                          controls
                          preload="metadata"
                          className="w-full h-20 object-cover rounded bg-black"
                        />
                        <div className="text-[9px] text-slate-400 mt-1">{item.createdAt}</div>
                        <button
                          onClick={() => handleDownloadVideo(item.videoUrl)}
                          className="text-purple-400 text-[9px] font-bold"
                        >
                          Tải
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>

      </main>

      {/* PAYMENT MODAL */}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full space-y-4 relative">

            <button
              onClick={() =>
                setShowPaymentModal(
                  false
                )
              }
              className="absolute top-3 right-4"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-purple-400">
              Nạp Credits
            </h3>

            <div className="grid grid-cols-2 gap-2">

              <button
                onClick={() =>
                  setPaymentTab(
                    "one_time"
                  )
                }
                className="bg-slate-800 p-2 rounded"
              >
                Nạp lẻ
              </button>

              <button
                onClick={() =>
                  setPaymentTab(
                    "subscription"
                  )
                }
                className="bg-slate-800 p-2 rounded"
              >
                Gói tháng
              </button>

            </div>

            {paymentTab ===
            "one_time" ? (
              <div className="grid grid-cols-2 gap-2">

                {topupPlans.map(
                  (
                    plan
                  ) => (
                    <button
                      key={
                        plan.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          plan.amount
                        )
                      }
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-left"
                    >
                      <div className="font-bold">
                        {
                          plan.credits
                        }{" "}
                        Credits
                      </div>

                      <div className="text-emerald-400">
                        {plan.amount.toLocaleString(
                          "vi-VN"
                        )}
                        đ
                      </div>
                    </button>
                  )
                )}

              </div>
            ) : (
              <div className="space-y-2">

                {subscriptionPlans.map(
                  (
                    plan
                  ) => (
                    <button
                      key={
                        plan.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          plan.amount
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between"
                    >
                      <span>
                        {
                          plan.name
                        }
                      </span>

                      <span className="text-emerald-400">
                        {
                          plan.label
                        }
                      </span>
                    </button>
                  )
                )}

              </div>
            )}

            <button
              onClick={
                handlePaymentClick
              }
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2.5 rounded-xl"
            >
              💳 Thanh Toán VietQR
            </button>

          </div>

        </div>
      )}

      {/* AUTH MODAL */}

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-2xl relative text-center">

            <button
              onClick={() =>
                setShowAuthModal(
                  false
                )
              }
              className="absolute top-4 right-4"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2">
              Đăng Nhập Tài Khoản
            </h3>

            <p className="text-xs text-slate-400 mb-6">
              Đăng nhập bằng Google để sử dụng Credits.
            </p>

            <button
              onClick={
                handleLoginGoogle
              }
              className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl text-xs"
            >
              Tiếp tục với Google
            </button>

          </div>

        </div>
      )}

{/* Bảng ngầm theo dõi chi phí USD Replicate */}
<div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#22c55e',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 99999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        pointerEvents: 'none'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
          💵 Tốn: ${totalCostUSD.toFixed(2)} USD
        </div>
        {sceneCosts.map((item) => (
          <div key={item.scene} style={{ color: '#94a3b8', marginTop: '2px' }}>
            Cảnh {item.scene}: ${item.cost.toFixed(2)}
          </div>
        ))}

      </div>
    </div>
  );
}