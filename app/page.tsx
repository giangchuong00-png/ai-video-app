"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);

  // State Modal Đăng Nhập
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [creativeMode, setCreativeMode] = useState<"creative" | "clone">("creative");
  const [inputType, setInputType] = useState<"file" | "link">("file");

  const [textPrompt, setTextPrompt] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [sampleMediaFile, setSampleMediaFile] = useState<File | null>(null);

  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const [characterFiles, setCharacterFiles] = useState<File[]>([]);
  const [characterPreviews, setCharacterPreviews] = useState<string[]>([]);
  const [useConsistentCharacter, setUseConsistentCharacter] = useState(true);

  const [credits, setCredits] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"one_time" | "subscription">("one_time");
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(100000);

  const [cooldown, setCooldown] = useState(0);
  const totalCooldownTime = 15;

  const [videoLength, setVideoLength] = useState("15s");
  const [videoMode, setVideoMode] = useState("fast");
  const [voiceType, setVoiceType] = useState("nu_bac");

  const [chatLoading, setChatLoading] = useState(false);
  const [script, setScript] = useState<any>(null);

  // Ghi nhớ các concept/kịch bản vừa tạo
  // để lần "Tạo Lại" tiếp theo AI không lặp hook/angle/structure cũ
  const [recentScripts, setRecentScripts] = useState<any[]>([]);

  const [scriptVideoLoading, setScriptVideoLoading] = useState(false);
  const [scriptVideoUrls, setScriptVideoUrls] = useState<string[]>([]);
  const [singleSceneLoading, setSingleSceneLoading] = useState<number | null>(null);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  // 1. BẢNG GIÁ NẠP LẺ BẢN BETA
  const topupPlans = [
    { amount: 20000, credits: 96, bonus: "+16 Cr Beta", original: "40.000đ", popular: false },
    { amount: 50000, credits: 240, bonus: "+40 Cr Beta", original: "100.000đ", popular: false },
    { amount: 100000, credits: 530, bonus: "+80 Cr Beta", original: "200.000đ", popular: true },
    { amount: 200000, credits: 1080, bonus: "+180 Cr Beta", original: "400.000đ", popular: false },
  ];

  // 2. BẢNG GIÁ ĐĂNG KÝ THÁNG
  const subscriptionPlans = [
    { amount: 249000, name: "Starter", credits: 1200, label: "249.000đ /tháng", popular: false },
    { amount: 499000, name: "Pro", credits: 2600, label: "499.000đ /tháng", popular: true },
    { amount: 999000, name: "Business", credits: 5500, label: "999.000đ /tháng", popular: false },
  ];

  // Lấy dữ liệu user và số credits từ Supabase
  useEffect(() => {
    const fetchUserData = async (currentUser: any) => {
      if (!currentUser?.email) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("email", currentUser.email)
          .single();

        if (error) {
          console.error("Lỗi lấy profile credits:", error);
          return;
        }

        if (data && typeof data.credits === "number") {
          setCredits(data.credits);
        }
      } catch (err) {
        console.error("Lỗi lấy số dư credits:", err);
      }
    };

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        fetchUserData(user);
      }
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          fetchUserData(currentUser);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLoginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? window.location.origin
            : undefined,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setUser(null);
    setCredits(0);
  };

  const handlePaymentClick = () => {
    // 1. Bắt buộc đăng nhập trước khi nạp
    if (!user || !user.email) {
      setShowPaymentModal(false);
      setShowAuthModal(true);
      return;
    }

    // 2. Tự động lấy email chuẩn của tài khoản và tạo mã VietQR MBBank
    const currentEmail = user.email.toLowerCase().trim();
    const amount = selectedPlanAmount || 50000;

    // Đang dùng RB100 để test hệ thống thanh toán
    const memo = `REELBO RB100`;

    const qrUrl =
      `https://img.vietqr.io/image/MB-0914285399-compact2.png` +
      `?amount=${amount}` +
      `&addInfo=${encodeURIComponent(memo)}`;

    window.open(qrUrl, "_blank");
  };

  const categories = [
    {
      name: "✨ Tất cả",
      prompt: "Váy đầm nữ linen mùa hè năng động, tôn dáng",
    },
    {
      name: "👗 Thời trang",
      prompt: "Áo sơ mi nam form rộng phong cách Hàn Quốc",
    },
    {
      name: "🍲 Thực phẩm",
      prompt: "Lẩu thái chua cay chuẩn vị, topping hải sản ngập tràn",
    },
    {
      name: "📱 Công nghệ",
      prompt: "Tai nghe chống ồn không dây bass siêu trầm",
    },
  ];

  const calculateRequiredCredits = () => {
    let baseCredits = 60;

    if (videoLength === "30s") {
      baseCredits = 100;
    }

    if (videoLength === "60s") {
      baseCredits = 180;
    }

    return videoMode === "hd_pro"
      ? baseCredits * 2
      : baseCredits;
  };

  const currentRequiredCredits = calculateRequiredCredits();

  const handleCategoryClick = (
    idx: number,
    promptText: string
  ) => {
    setActiveCategory(idx);
    setTextPrompt(promptText);
  };

  const handleMultipleCharacterChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      if (filesArray.length + characterFiles.length > 10) {
        alert("Bạn chỉ được tải tối đa 10 ảnh nhân vật!");
        return;
      }

      const newFiles = [
        ...characterFiles,
        ...filesArray,
      ].slice(0, 10);

      setCharacterFiles(newFiles);

      const newPreviews = newFiles.map((file) =>
        URL.createObjectURL(file)
      );

      setCharacterPreviews(newPreviews);
    }
  };

  const removeCharacterImage = (
    indexToRemove: number
  ) => {
    const updatedFiles = characterFiles.filter(
      (_, idx) => idx !== indexToRemove
    );

    const updatedPreviews = characterPreviews.filter(
      (_, idx) => idx !== indexToRemove
    );

    setCharacterFiles(updatedFiles);
    setCharacterPreviews(updatedPreviews);
  };

  const handleSampleMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setSampleMediaFile(file);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(
        () => setCooldown(cooldown - 1),
        1000
      );

      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleDownloadVideo = (url: string) => {
    if (!url) {
      alert("Chưa có link video để tải!");
      return;
    }

    const a = document.createElement("a");

    a.href = url;
    a.download = `reelbo_video_${Date.now()}.mp4`;
    a.target = "_blank";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // =====================================================
  // REELBO SCRIPT ENGINE V2
  // =====================================================

  const handleChatSubmit = async () => {
    if (
      inputType === "link" &&
      !competitorUrl.trim() &&
      !textPrompt.trim()
    ) {
      alert(
        "Bạn đã chọn chế độ Dán Link. Vui lòng dán link TikTok/Shopee!"
      );
      return;
    }

    if (
      inputType === "file" &&
      !sampleMediaFile &&
      !textPrompt.trim()
    ) {
      alert(
        "Bạn đã chọn chế độ Tải File. Vui lòng chọn ảnh/video từ máy!"
      );
      return;
    }

    setChatLoading(true);
    setCooldown(totalCooldownTime);

    setScript(null);
    setScriptVideoUrls([]);
    setMergedVideoUrl(null);

    let crawledText = textPrompt;

    // ===================================================
    // 1. CÀO METADATA LINK TIKTOK
    // ===================================================

    if (
      inputType === "link" &&
      competitorUrl.trim()
    ) {
      try {
        console.log(
          "Đang gọi API cào dữ liệu TikTok..."
        );

        const crawlRes = await fetch(
          "/api/crawl",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              url: competitorUrl,
            }),
          }
        );

        const crawlData =
          await crawlRes.json();

        if (
          crawlRes.ok &&
          crawlData.data
        ) {
          crawledText =
            `[Nội dung cào từ video TikTok]: ` +
            `${crawlData.data.title}. ` +
            `Yêu cầu thêm: ${textPrompt}`;

          console.log(
            "Cào thành công:",
            crawlData.data.title
          );
        }
      } catch (err) {
        console.error(
          "Lỗi cào link, dùng mô tả thủ công:",
          err
        );
      }
    }

    // ===================================================
    // 2. MODE AI
    // ===================================================

    let modeInstruction = "";

    if (creativeMode === "creative") {
      modeInstruction =
        "[YÊU CẦU: Dùng cho đồ cầm tay/Review. " +
        "Bóc sản phẩm từ mẫu, sáng tạo kịch bản, " +
        "góc quay và execution mới.]";
    } else {
      modeInstruction =
        "[YÊU CẦU: Dùng cho thời trang/nhảy. " +
        "Giữ trang phục và chuyển động tham khảo, " +
        "dùng nhân vật KOC cố định.]";
    }

    // ===================================================
    // 3. KHÔNG BỊA PRODUCT FACTS
    // ===================================================

    const strictRules = `
[LUẬT SẮT ĐÁ]:
1. BẮT BUỘC CHỈ DÙNG thông tin sản phẩm do người dùng nhập hoặc dữ liệu thu được từ nguồn mẫu.
2. KHÔNG TỰ BỊA chất liệu, tính năng, giá, ưu đãi, công dụng, chứng nhận hoặc đặc điểm chưa được cung cấp.
`;

    try {
      // =================================================
      // 4. MESSAGE GIỮ TƯƠNG THÍCH FLOW CŨ
      // =================================================

      const payloadMessage =
        inputType === "link"
          ? `
THÔNG TIN SẢN PHẨM KHÁCH CUNG CẤP:
${crawledText}

LINK THAM KHẢO:
${competitorUrl}

${modeInstruction}

${strictRules}
`
          : `
THÔNG TIN SẢN PHẨM KHÁCH CUNG CẤP:
${textPrompt}

XỬ LÝ TỆP MẪU UPLOAD.

${modeInstruction}

${strictRules}
`;

      // =================================================
      // 5. GỌI SCRIPT ENGINE V2
      // =================================================

      const res = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            // Giữ tương thích backend
            message: payloadMessage,

            // 15 / 30 / 60
            duration: videoLength,

            // Product riêng
            product:
              textPrompt.trim(),

            // Reference URL riêng
            referenceUrl:
              inputType === "link"
                ? competitorUrl.trim()
                : "",

            // Backend dùng creative | motion
            mode:
              creativeMode === "creative"
                ? "creative"
                : "motion",

            // Lịch sử concept gần nhất
            recentScripts,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Không thể tạo kịch bản."
        );
      }

      // =================================================
      // 6. HIỂN THỊ SCRIPT
      // =================================================

      setScript(data.script);

      // =================================================
      // 7. LƯU MEMORY CHỐNG LẶP
      // =================================================

      if (data.script) {
        const firstVoiceover =
          data.script?.scenes?.[0]
            ?.voiceover || "";

        const scriptMemory = {
          hook:
            data.script?.hook ||
            firstVoiceover,

          sales_angle:
            data.script?.strategy
              ?.sales_angle || "",

          structure:
            data.script?.strategy
              ?.structure || "",

          content_type:
            data.script?.strategy
              ?.content_type || "",
        };

        setRecentScripts((prev) => [
          ...prev.slice(-7),
          scriptMemory,
        ]);

        console.log(
          "Reelbo recent script memory:",
          scriptMemory
        );
      }
    } catch (err: any) {
      alert(
        err.message ||
          "Lỗi kết nối AI."
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateAllVideos = async () => {
    if (!script || !script.scenes) return;

    if (credits < currentRequiredCredits) {
      setShowPaymentModal(true);
      return;
    }

    setScriptVideoLoading(true);

    const newVideoUrls: string[] = [];

    const sampleMp4Url =
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    try {
      for (
        let i = 0;
        i < script.scenes.length;
        i++
      ) {
        const res = await fetch(
          "/api/generate-video",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              visual_prompt:
                script.scenes[i]
                  .visual_prompt,

              scene_number:
                script.scenes[i]
                  .scene_number,

              mode: videoMode,

              creativeMode:
                creativeMode,

              hasCharacter:
                characterFiles.length > 0,
            }),
          }
        );

        const data =
          await res.json();

        const urlToUse =
          res.ok && data.video_url
            ? data.video_url
            : sampleMp4Url;

        newVideoUrls.push(
          urlToUse
        );

        setScriptVideoUrls([
          ...newVideoUrls,
        ]);
      }

      setMergedVideoUrl(
        newVideoUrls[0] ||
          sampleMp4Url
      );

      setCredits((prev) =>
        Math.max(
          0,
          prev -
            currentRequiredCredits
        )
      );
    } catch (err: any) {
      alert(
        "Lỗi khi sinh video."
      );
    } finally {
      setScriptVideoLoading(false);
    }
  };

  const handleReGenerateSingleScene = async (
    sceneIndex: number
  ) => {
    const singleSceneCost =
      videoMode === "hd_pro"
        ? 40
        : 20;

    if (credits < singleSceneCost) {
      setShowPaymentModal(true);
      return;
    }

    setSingleSceneLoading(
      sceneIndex
    );

    try {
      const res = await fetch(
        "/api/generate-video",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            visual_prompt:
              script.scenes[
                sceneIndex
              ].visual_prompt +
              " (Góc quay biến thể mới)",

            scene_number:
              script.scenes[
                sceneIndex
              ].scene_number,

            mode: videoMode,

            creativeMode:
              creativeMode,

            hasCharacter:
              characterFiles.length >
              0,
          }),
        }
      );

      const data =
        await res.json();

      const updatedUrls = [
        ...scriptVideoUrls,
      ];

      updatedUrls[sceneIndex] =
        res.ok && data.video_url
          ? data.video_url
          : "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

      setScriptVideoUrls(
        updatedUrls
      );

      setCredits((prev) =>
        Math.max(
          0,
          prev - singleSceneCost
        )
      );
    } catch (err: any) {
      alert(
        "Lỗi khi tạo lại phân cảnh này."
      );
    } finally {
      setSingleSceneLoading(
        null
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      {/* HEADER */}
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
              onClick={() =>
                setShowAuthModal(
                  true
                )
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap transition"
            >
              🔑 Đăng nhập
            </button>
          )}
        </div>
      </header>

      <div className="bg-purple-900/20 border-b border-purple-500/20 text-center py-2 text-xs text-purple-300">
        🔥 Ưu đãi Beta Launch: Tặng đến +180 Credits cho các gói nạp Beta!
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 text-xs">
          <span className="text-slate-400 whitespace-nowrap font-medium">
            Gợi ý mẫu:
          </span>

          {categories.map(
            (cat, idx) => (
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
          <div className="lg:col-span-5 space-y-4">
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
                  🔮 AI Sáng Tạo Góc Quay Mới
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Phù hợp{" "}
                  <strong>
                    đồ cầm tay
                  </strong>{" "}
                  (Máy sấy, son...). AI giữ Nhân vật cố định + Bóc sản phẩm & tạo góc quay MỚI.
                </p>

                {creativeMode ===
                  "creative" && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                )}
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
                  ⚡ AI Nhái Chuyển Động
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Phù hợp{" "}
                  <strong>
                    Thời trang / Đồ mặc
                  </strong>
                  . AI giữ trang phục & điệu nhảy gốc + Đè mặt Nhân vật cố định vào.
                </p>

                {creativeMode ===
                  "clone" && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            </div>

            <div
              className={`bg-slate-900 border rounded-xl p-4 space-y-3.5 shadow-xl transition-all duration-300 ${
                creativeMode ===
                "creative"
                  ? "border-purple-500/40 shadow-purple-900/10"
                  : "border-emerald-500/40 shadow-emerald-900/10"
              }`}
            >
              <div
                className={`p-3 rounded-lg border space-y-2 transition-all ${
                  creativeMode ===
                  "creative"
                    ? "bg-slate-950 border-purple-500/30"
                    : "bg-slate-950 border-emerald-500/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <label
                    className={`text-xs font-bold flex items-center gap-1 ${
                      creativeMode ===
                      "creative"
                        ? "text-purple-300"
                        : "text-emerald-300"
                    }`}
                  >
                    👤 1. Bộ Ảnh Nhân Vật KOC Cố Định (5 - 10 ảnh):
                  </label>

                  <input
                    type="checkbox"
                    checked={
                      useConsistentCharacter
                    }
                    onChange={(e) =>
                      setUseConsistentCharacter(
                        e.target.checked
                      )
                    }
                    className={
                      creativeMode ===
                      "creative"
                        ? "accent-purple-600"
                        : "accent-emerald-600"
                    }
                  />
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  💡 Khuyên dùng: Tải từ 5 - 10 ảnh (Chân dung, góc nghiêng 45°, toàn thân) để AI giữ độ nhất quán tốt nhất!
                </p>

                {useConsistentCharacter && (
                  <div className="space-y-2">
                    {characterPreviews.length >
                      0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
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
                                className={`w-10 h-10 rounded-lg object-cover border ${
                                  creativeMode ===
                                  "creative"
                                    ? "border-purple-500"
                                    : "border-emerald-500"
                                }`}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeCharacterImage(
                                    idx
                                  )
                                }
                                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow opacity-80 group-hover:opacity-100"
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
                      className={`w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-white file:text-[10px] transition-all ${
                        creativeMode ===
                        "creative"
                          ? "file:bg-purple-600 hover:file:bg-purple-500"
                          : "file:bg-emerald-600 hover:file:bg-emerald-500"
                      }`}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    🎬 2. Nguồn mẫu (Bắt buộc chọn 1):
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
                        className={
                          creativeMode ===
                          "creative"
                            ? "accent-purple-500"
                            : "accent-emerald-500"
                        }
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
                        className={
                          creativeMode ===
                          "creative"
                            ? "accent-purple-500"
                            : "accent-emerald-500"
                        }
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
                        ? creativeMode ===
                          "creative"
                          ? "bg-slate-950 border-purple-500/50"
                          : "bg-slate-950 border-emerald-500/50"
                        : "bg-slate-950/40 border-slate-900 opacity-40 pointer-events-none"
                    }`}
                  >
                    <label className="text-[10px] text-slate-400 block mb-1">
                      🖼️ Video/Ảnh mẫu (Từ máy):
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
                      className={`w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-white file:text-[10px] transition-all ${
                        creativeMode ===
                        "creative"
                          ? "file:bg-purple-600"
                          : "file:bg-emerald-600"
                      }`}
                    />
                  </div>

                  <div
                    className={`p-2 rounded-lg border transition-all ${
                      inputType ===
                      "link"
                        ? creativeMode ===
                          "creative"
                          ? "bg-slate-950 border-purple-500/50"
                          : "bg-slate-950 border-emerald-500/50"
                        : "bg-slate-950/40 border-slate-900 opacity-40 pointer-events-none"
                    }`}
                  >
                    <label className="text-[10px] text-slate-400 block mb-1">
                      🔗 Link TikTok/Shopee đối thủ:
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
                          e.target.value
                        )
                      }
                      placeholder="https://tiktok.com/@doithu/..."
                      className={`w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition ${
                        creativeMode ===
                        "creative"
                          ? "focus:border-purple-500"
                          : "focus:border-emerald-500"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Mô tả sản phẩm{" "}
                  <span className="text-slate-500 font-normal">
                    (không bắt buộc)
                  </span>
                  :
                </label>

                <textarea
                  value={textPrompt}
                  onChange={(e) =>
                    setTextPrompt(
                      e.target.value
                    )
                  }
                  placeholder="Nhập tên sản phẩm, thương hiệu (nếu có)..."
                  className={`w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none text-slate-200 transition leading-relaxed ${
                    creativeMode ===
                    "creative"
                      ? "focus:border-purple-500"
                      : "focus:border-emerald-500"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  ⏱️ Thời lượng video & Chi phí Credits:
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "15s",
                      label:
                        "⚡ 15s (60 Credits)",
                    },
                    {
                      id: "30s",
                      label:
                        "🔥 30s (100 Credits)",
                    },
                    {
                      id: "60s",
                      label:
                        "🎬 60s (180 Credits)",
                    },
                  ].map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }
                        onClick={() =>
                          setVideoLength(
                            item.id
                          )
                        }
                        className={`py-1.5 px-1 text-[11px] font-medium rounded-lg border transition flex flex-col items-center justify-center ${
                          videoLength ===
                          item.id
                            ? creativeMode ===
                              "creative"
                              ? "bg-purple-600 border-purple-400 text-white"
                              : "bg-emerald-600 border-emerald-400 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <span>
                          {
                            item.label
                          }
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  🎙️ Giọng đọc AI KOC:
                </label>

                <select
                  value={
                    voiceType
                  }
                  onChange={(e) =>
                    setVoiceType(
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 shadow-inner"
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

              <div className="space-y-1.5">
                <button
                  onClick={
                    handleChatSubmit
                  }
                  disabled={
                    chatLoading ||
                    cooldown > 0
                  }
                  className={`w-full text-white font-semibold py-2.5 rounded-lg text-xs shadow-lg transition disabled:opacity-50 ${
                    creativeMode ===
                    "creative"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  }`}
                >
                  {chatLoading
                    ? "⏳ AI Đang Xử Lý Kịch Bản..."
                    : cooldown >
                      0
                    ? `⏳ Đang làm mới AI... (${cooldown}s)`
                    : script
                    ? "🔄 Tạo Lại Kịch Bản AI"
                    : "✨ Tạo Kịch Bản AI (Miễn phí)"}
                </button>

                {cooldown >
                  0 && (
                  <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        creativeMode ===
                        "creative"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500"
                      }`}
                      style={{
                        width: `${
                          (cooldown /
                            totalCooldownTime) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {script && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-xs text-purple-300">
                    📜 Kịch Bản Chi Tiết ({script.scenes?.length} phân cảnh)
                  </h3>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 text-xs">
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
                        <p className="font-bold text-purple-400 mb-1">
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

                        <p className="text-slate-300 mb-1">
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
                  className={`w-full font-bold py-3 rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-white ${
                    creativeMode ===
                    "creative"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  }`}
                >
                  {scriptVideoLoading
                    ? "🎬 Đang Render Video HD..."
                    : `🪄 Sinh Toàn Bộ Video (-${currentRequiredCredits} Credits)`}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl min-h-[500px]">
              <h2 className="font-semibold text-purple-400 text-sm flex items-center justify-between">
                <span>
                  🎬 Kết Quả Video Studio
                </span>

                {scriptVideoLoading && (
                  <span className="text-xs text-yellow-400 animate-pulse">
                    ⚡ Đang xử lý AI...
                  </span>
                )}
              </h2>

              {mergedVideoUrl ? (
                <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-purple-300">
                      🏆 VIDEO TỔNG HOÀN CHỈNH HD
                    </span>

                    <button
                      onClick={() =>
                        handleDownloadVideo(
                          mergedVideoUrl
                        )
                      }
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition shadow-md hover:shadow-purple-500/20 active:scale-95"
                    >
                      📥 Tải video gộp FREE
                    </button>
                  </div>

                  <video
                    src={
                      mergedVideoUrl
                    }
                    controls
                    autoPlay
                    className="w-full h-52 object-cover rounded-lg bg-black shadow"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-slate-800/80 rounded-xl h-40 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
                  <span className="text-2xl animate-bounce">
                    🎬
                  </span>

                  <p className="text-slate-400">
                    Khung hiển thị video thành phẩm gộp HD
                  </p>

                  <span className="text-[10px] text-slate-600">
                    Bấm "Tạo Kịch Bản AI" và "Sinh Toàn Bộ Video" ở cột bên trái
                  </span>
                </div>
              )}

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
                          idx
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
                              className="text-yellow-400 hover:text-yellow-300 text-[10px] font-medium underline flex items-center gap-1 transition"
                            >
                              {singleSceneLoading ===
                              idx
                                ? "⏳..."
                                : `🔄 Tạo lại (${
                                    videoMode ===
                                    "hd_pro"
                                      ? 40
                                      : 20
                                  } Credits)`}
                            </button>

                            <a
                              href={
                                url
                              }
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-400 hover:underline text-[10px]"
                            >
                              Tải về
                            </a>
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
                  <div className="col-span-full py-8 text-center text-xs text-slate-500 italic">
                    Các phân cảnh video riêng lẻ sẽ tự động hiển thị ở đây sau khi bạn bấm "Sinh Toàn Bộ Video".
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL THANH TOÁN VIETQR */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full text-center relative shadow-2xl space-y-4">
            <button
              onClick={() =>
                setShowPaymentModal(
                  false
                )
              }
              className="absolute top-3 right-4 text-slate-400 hover:text-white text-xl font-bold transition"
            >
              ✕
            </button>

            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-xl mx-auto">
              ⚡
            </div>

            <div>
              <h3 className="text-lg font-bold text-purple-400">
                Kích Hoạt Sinh Toàn Bộ Video AI HD
              </h3>

              <p className="text-xs text-slate-300 mt-0.5">
                Nạp Credits để Reelbo AI tiến hành render toàn bộ video sắc nét, không dính logo!
              </p>
            </div>

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
                className={`py-2 rounded-lg transition ${
                  paymentTab ===
                  "one_time"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
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
                className={`py-2 rounded-lg transition ${
                  paymentTab ===
                  "subscription"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                👑 Gói Đăng Ký Tháng (Tiết Kiệm)
              </button>
            </div>

            {paymentTab ===
            "one_time" ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-left">
                {topupPlans.map(
                  (plan) => (
                    <div
                      key={
                        plan.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          plan.amount
                        )
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                        selectedPlanAmount ===
                        plan.amount
                          ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-900/30"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full uppercase">
                          Bán Chạy
                        </span>
                      )}

                      <p className="font-bold text-xs text-white">
                        {plan.credits} Credits
                      </p>

                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Gốc:{" "}
                        <span className="line-through text-slate-500">
                          {plan.original}
                        </span>
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
                  (sub) => (
                    <div
                      key={
                        sub.amount
                      }
                      onClick={() =>
                        setSelectedPlanAmount(
                          sub.amount
                        )
                      }
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between relative ${
                        selectedPlanAmount ===
                        sub.amount
                          ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-900/30"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {sub.popular && (
                        <span className="absolute -top-2 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-[8px] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                          Khuyên Dùng
                        </span>
                      )}

                      <div>
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
                      </div>

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
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition shadow-lg shadow-purple-500/25 active:scale-95 mt-3"
            >
              💳 Thanh Toán VietQR (
              {(
                selectedPlanAmount ||
                0
              ).toLocaleString(
                "vi-VN"
              )}{" "}
              VNĐ)
            </button>

            <p className="text-[10px] text-slate-500">
              Tự động kích hoạt Credits ngay sau 3s - 5s chuyển khoản thành công.
            </p>
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG NHẬP */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative text-center">
            <button
              onClick={() =>
                setShowAuthModal(
                  false
                )
              }
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold transition"
            >
              ✕
            </button>

            <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <span className="text-2xl">
                ✨
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">
              Đăng Nhập Tài Khoản
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed mb-6 px-2">
              Vui lòng đăng nhập bằng Google để hệ thống tự động nhận diện tài khoản và cộng Credits khi nạp tiền.
            </p>

            <button
              onClick={
                handleLoginGoogle
              }
              type="button"
              className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-3 transition shadow-lg shadow-white/10 active:scale-95"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />

                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />

                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />

                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>

              Tiếp tục với tài khoản Google
            </button>

            <p className="text-[10px] text-slate-500 mt-4">
              Bảo mật 100% qua Google • Đăng nhập tức thì trong 1 giây
            </p>
          </div>
        </div>
      )}
    </div>
  );
}