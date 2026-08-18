"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

type HistoryItem = {
  id: string;
  createdAt: string;
  videoUrl: string;
  prompt: string;
  scenesCount: number;
};

export default function Home() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [creativeMode, setCreativeMode] = useState<"creative" | "clone">("creative");
  const [inputType, setInputType] = useState<"file" | "link">("file");

  const [textPrompt, setTextPrompt] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [sampleMediaFile, setSampleMediaFile] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

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
  const [recentScripts, setRecentScripts] = useState<any[]>([]);

  const [scriptVideoLoading, setScriptVideoLoading] = useState(false);
  const [scriptVideoUrls, setScriptVideoUrls] = useState<string[]>([]);
  const [singleSceneLoading, setSingleSceneLoading] = useState<number | null>(null);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  // Lịch sử video đã tạo
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [renderProgress, setRenderProgress] = useState<string>("");

  const topupPlans = [
    { amount: 20000, credits: 96, bonus: "+16 Cr Beta", original: "40.000đ", popular: false },
    { amount: 50000, credits: 240, bonus: "+40 Cr Beta", original: "100.000đ", popular: false },
    { amount: 100000, credits: 530, bonus: "+80 Cr Beta", original: "200.000đ", popular: true },
    { amount: 200000, credits: 1080, bonus: "+180 Cr Beta", original: "400.000đ", popular: false },
  ];

  const subscriptionPlans = [
    { amount: 249000, name: "Starter", credits: 1200, label: "249.000đ /tháng", popular: false },
    { amount: 499000, name: "Pro", credits: 2600, label: "499.000đ /tháng", popular: true },
    { amount: 999000, name: "Business", credits: 5500, label: "999.000đ /tháng", popular: false },
  ];

  // Đọc lịch sử từ LocalStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("reelbo_video_history");
      if (savedHistory) {
        setHistoryList(JSON.parse(savedHistory));
      }
    } catch {}
  }, []);

  const saveToHistory = (videoUrl: string, promptText: string, scenesCount: number) => {
    const newItem: HistoryItem = {
      id: "vid_" + Date.now(),
      createdAt: new Date().toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      videoUrl,
      prompt: promptText || "Video KOC TikTok",
      scenesCount,
    };
    const updated = [newItem, ...historyList].slice(0, 30);
    setHistoryList(updated);
    try {
      localStorage.setItem("reelbo_video_history", JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    const fetchUserData = async (currentUser: any) => {
      if (!currentUser?.email) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("email", currentUser.email)
          .single();

        if (!error && data && typeof data.credits === "number") {
          setCredits(data.credits);
        }
      } catch (err) {
        console.error("Lỗi lấy profile credits:", err);
      }
    };

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchUserData(user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchUserData(currentUser);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLoginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
  };

  const handlePaymentClick = () => {
    if (!user || !user.email) {
      setShowPaymentModal(false);
      setShowAuthModal(true);
      return;
    }
    const amount = selectedPlanAmount || 50000;
    const memo = `REELBO RB100`;
    const qrUrl = `https://img.vietqr.io/image/MB-0914285399-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}`;
    window.open(qrUrl, "_blank");
  };

  const categories = [
    { name: "✨ Tất cả", prompt: "Váy đầm nữ linen mùa hè năng động, tôn dáng" },
    { name: "👗 Thời trang", prompt: "Áo sơ mi nam form rộng phong cách Hàn Quốc" },
    { name: "🍲 Thực phẩm", prompt: "Lẩu thái chua cay chuẩn vị, topping hải sản ngập tràn" },
    { name: "📱 Công nghệ", prompt: "Tai nghe chống ồn không dây bass siêu trầm" },
  ];

  const calculateRequiredCredits = () => {
    let baseCredits = 60;
    if (videoLength === "30s") baseCredits = 100;
    if (videoLength === "60s") baseCredits = 180;
    return videoMode === "hd_pro" ? baseCredits * 2 : baseCredits;
  };

  const currentRequiredCredits = calculateRequiredCredits();

  const handleCategoryClick = (idx: number, promptText: string) => {
    setActiveCategory(idx);
    setTextPrompt(promptText);
  };

  const handleMultipleCharacterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length + characterFiles.length > 10) {
        alert("Bạn chỉ được tải tối đa 10 ảnh nhân vật!");
        return;
      }
      const newFiles = [...characterFiles, ...filesArray].slice(0, 10);
      setCharacterFiles(newFiles);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setCharacterPreviews(newPreviews);
    }
  };

  const removeCharacterImage = (indexToRemove: number) => {
    const updatedFiles = characterFiles.filter((_, idx) => idx !== indexToRemove);
    const updatedPreviews = characterPreviews.filter((_, idx) => idx !== indexToRemove);
    setCharacterFiles(updatedFiles);
    setCharacterPreviews(updatedPreviews);
  };

  const handleSampleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSampleMediaFile(file);
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
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

  const handleChatSubmit = async () => {
    if (inputType === "link" && !competitorUrl.trim() && !textPrompt.trim()) {
      alert("Bạn đã chọn chế độ Dán Link. Vui lòng dán link TikTok/Shopee!");
      return;
    }

    if (inputType === "file" && !sampleMediaFile && !textPrompt.trim()) {
      alert("Bạn đã chọn chế độ Tải File. Vui lòng chọn ảnh/video từ máy!");
      return;
    }

    setChatLoading(true);
    setCooldown(totalCooldownTime);
    setScript(null);
    setScriptVideoUrls([]);
    setMergedVideoUrl(null);
    setReferenceImageUrl(null);

    let crawledText = textPrompt;
    let videoAnalysis: any = null;
    let currentReferenceImage = null;

    if (inputType === "link" && competitorUrl.trim()) {
      try {
        const crawlRes = await fetch("/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: competitorUrl }),
        });
        const crawlData = await crawlRes.json();

        if (crawlRes.ok && crawlData?.data) {
          if (crawlData.data.coverImage) currentReferenceImage = crawlData.data.coverImage;
          if (crawlData.data.videoUrl) {
            const analyzeRes = await fetch("/api/analyze-video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoUrl: crawlData.data.videoUrl }),
            });
            const analyzeData = await analyzeRes.json();
            if (analyzeRes.ok && analyzeData?.analysis) {
              videoAnalysis = analyzeData.analysis;
            }
          }

          crawledText = `
THÔNG TIN TỪ LINK TIKTOK:
Caption: ${crawlData.data.title || "Không có"}
Creator: ${crawlData.data.author || "Không rõ"}
Sản phẩm nhận diện: ${videoAnalysis?.product_guess || "Không rõ"}
Mô tả chi tiết: ${videoAnalysis?.product_visual_detail || "Không có"}
Lời thoại: ${videoAnalysis?.transcript || "Không lấy được transcript"}
Hook gốc: ${videoAnalysis?.hook || "Không xác định"}
Bối cảnh gốc: ${videoAnalysis?.scenes?.[0]?.location || "Không rõ"}
THÔNG TIN NHẬP THÊM: ${textPrompt || "Không có"}`;
        }
      } catch (err) {
        crawledText = textPrompt;
      }
    } else if (inputType === "file" && sampleMediaFile) {
      if (sampleMediaFile.type.startsWith("image/")) {
        try {
          currentReferenceImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(sampleMediaFile);
          });
        } catch {}
      }
    }

    if (currentReferenceImage) setReferenceImageUrl(currentReferenceImage);

    try {
      const payloadMessage = inputType === "link"
        ? `THÔNG TIN NGUỒN:\n${crawledText}\n\nLINK THAM KHẢO:\n${competitorUrl}`
        : `THÔNG TIN SẢN PHẨM:\n${textPrompt}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payloadMessage,
          duration: videoLength,
          product: textPrompt.trim(),
          referenceUrl: inputType === "link" ? competitorUrl.trim() : "",
          mode: creativeMode === "creative" ? "creative" : "motion",
          recentScripts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo kịch bản.");

      setScript(data.script);
      if (data.script) {
        const firstVoiceover = data.script?.scenes?.[0]?.voiceover || "";
        const scriptMemory = {
          hook: data.script?.hook || firstVoiceover,
          sales_angle: data.script?.strategy?.sales_angle || "",
          structure: data.script?.strategy?.structure || "",
          content_type: data.script?.strategy?.content_type || "",
        };
        setRecentScripts((prev) => [...prev.slice(-7), scriptMemory]);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi kết nối AI.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateAllVideos = async () => {
    if (!script || !Array.isArray(script.scenes) || script.scenes.length === 0) {
      alert("Chưa có kịch bản để tạo video.");
      return;
    }

    if (!user || !user.email) {
      setShowAuthModal(true);
      return;
    }

    if (credits < currentRequiredCredits) {
      setShowPaymentModal(true);
      return;
    }

    let currentKocImageBase64: string | null = null;
    if (useConsistentCharacter && characterFiles.length > 0) {
      try {
        currentKocImageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(characterFiles[0]);
        });
      } catch {}
    }

    setScriptVideoLoading(true);
    setScriptVideoUrls([]);
    setMergedVideoUrl(null);
    setRenderProgress("Bắt đầu xử lý...");

    const newVideoUrls: string[] = [];

    try {
      for (let i = 0; i < script.scenes.length; i++) {
        const scene = script.scenes[i];
        setRenderProgress(`Đang render phân cảnh ${i + 1}/${script.scenes.length}...`);

        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visual_prompt: scene.visual_prompt,
            voiceover: scene.voiceover || "",
            voiceType: voiceType,
            scene_number: scene.scene_number,
            imageUrl: referenceImageUrl,
            kocImageUrl: currentKocImageBase64,
            hasCharacter: characterFiles.length > 0,
            user_email: user.email,
            cost: Math.floor(currentRequiredCredits / script.scenes.length),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.video_url) {
          throw new Error(data?.error || `Không thể tạo video phân cảnh ${i + 1}.`);
        }

        newVideoUrls.push(data.video_url);
        setScriptVideoUrls([...newVideoUrls]);
      }

      setRenderProgress("Đang kết nối gộp các phân cảnh...");
      const mergeRes = await fetch("/api/merge-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrls: newVideoUrls }),
      });
      const mergeData = await mergeRes.json();
      const finalUrl = mergeData?.mergedVideoUrl || newVideoUrls[0];
      setMergedVideoUrl(finalUrl);

      setCredits((prev) => Math.max(0, prev - currentRequiredCredits));
      saveToHistory(finalUrl, textPrompt, script.scenes.length);
      setRenderProgress(`Hoàn thành ${newVideoUrls.length}/${script.scenes.length} phân cảnh!`);
    } catch (err: any) {
      alert(err?.message || "Lỗi trong quá trình sinh video.");
    } finally {
      setScriptVideoLoading(false);
    }
  };

  const handleReGenerateSingleScene = async (sceneIndex: number) => {
    const singleSceneCost = 20;

    if (!user || !user.email) {
      setShowAuthModal(true);
      return;
    }

    if (!script?.scenes?.[sceneIndex]) {
      alert("Không tìm thấy phân cảnh.");
      return;
    }

    if (credits < singleSceneCost) {
      setShowPaymentModal(true);
      return;
    }

    setSingleSceneLoading(sceneIndex);

    let currentKocImageBase64: string | null = null;
    if (useConsistentCharacter && characterFiles.length > 0) {
      try {
        currentKocImageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(characterFiles[0]);
        });
      } catch {}
    }

    try {
      const scene = script.scenes[sceneIndex];
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visual_prompt: `${scene.visual_prompt || ""} (Đổi sang góc quay cận cảnh hoặc bối cảnh mới, ánh sáng studio, không lấy chân).`,
          voiceover: scene.voiceover || "",
          voiceType: voiceType,
          scene_number: scene.scene_number,
          imageUrl: referenceImageUrl,
          kocImageUrl: currentKocImageBase64,
          hasCharacter: characterFiles.length > 0,
          user_email: user.email,
          cost: singleSceneCost,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.video_url) throw new Error(data?.error || "Lỗi tạo lại phân cảnh.");

      const updatedUrls = [...scriptVideoUrls];
      updatedUrls[sceneIndex] = data.video_url;
      setScriptVideoUrls(updatedUrls);
      setMergedVideoUrl(null);
      setCredits((prev) => Math.max(0, prev - singleSceneCost));
    } catch (err: any) {
      alert(err?.message || "Lỗi khi tạo lại phân cảnh này.");
    } finally {
      setSingleSceneLoading(null);
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
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reelbo.ai
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
              Beta v1.0.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
          <div className="bg-slate-800 border border-yellow-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1">
            <span className="text-yellow-400 font-bold text-[11px] sm:text-xs">
              {credits} Credits
            </span>
            <button
              onClick={() => setShowPaymentModal(true)}
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
                onClick={handleLogout}
                className="text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded-full transition"
              >
                Thoát
              </button>
            </div>
          ) : (
            <button
              onClick={handleLoginGoogle}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
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
        {/* GỢI Ý MẪU */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 text-xs">
          <span className="text-slate-400 whitespace-nowrap font-medium">Gợi ý mẫu:</span>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => handleCategoryClick(idx, cat.prompt)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium border ${
                activeCategory === idx
                  ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500 hover:bg-purple-600/20"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* CỘT TRÁI: ĐIỀU KHIỂN & KỊCH BẢN */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setCreativeMode("creative")}
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative ${
                  creativeMode === "creative"
                    ? "bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-900/30 -translate-y-0.5"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="font-bold text-xs text-purple-300 flex items-center gap-1.5 mb-1">
                  🔮 AI Sáng Tạo Bối Cảnh Mới
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Bóc sản phẩm & tự động đổi bối cảnh phòng/studio, góc quay điện ảnh 35mm.
                </p>
              </button>

              <button
                onClick={() => setCreativeMode("clone")}
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative ${
                  creativeMode === "clone"
                    ? "bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 -translate-y-0.5"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="font-bold text-xs text-emerald-300 flex items-center gap-1.5 mb-1">
                  ⚡ AI Nhái Chuyển Động
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Giữ nguyên chuyển động tham khảo và ghép mặt KOC cố định vào.
                </p>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">
              {/* 1. KOC */}
              <div className="p-3 rounded-lg border bg-slate-950 border-purple-500/30 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-purple-300">
                    👤 1. Ảnh Nhân Vật KOC Cố Định (Bán thân/Chân dung):
                  </label>
                  <input
                    type="checkbox"
                    checked={useConsistentCharacter}
                    onChange={(e) => setUseConsistentCharacter(e.target.checked)}
                    className="accent-purple-600"
                  />
                </div>
                {useConsistentCharacter && (
                  <div className="space-y-2">
                    {characterPreviews.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {characterPreviews.map((preview, idx) => (
                          <div key={idx} className="relative group flex-shrink-0">
                            <img src={preview} alt="KOC" className="w-10 h-10 rounded-lg object-cover border border-purple-500" />
                            <button
                              type="button"
                              onClick={() => removeCharacterImage(idx)}
                              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleCharacterChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:bg-purple-600 file:border-0 file:rounded file:text-white file:text-[10px] file:py-0.5 file:px-2 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* 2. NGUỒN MẪU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">🎬 2. Nguồn mẫu:</span>
                  <div className="flex items-center gap-3 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="inputType" value="file" checked={inputType === "file"} onChange={() => setInputType("file")} className="accent-purple-500" />
                      <span className={inputType === "file" ? "text-white font-semibold" : "text-slate-400"}>📂 Tải File</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="inputType" value="link" checked={inputType === "link"} onChange={() => setInputType("link")} className="accent-purple-500" />
                      <span className={inputType === "link" ? "text-white font-semibold" : "text-slate-400"}>🔗 Dán Link</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg border transition-all ${inputType === "file" ? "bg-slate-950 border-purple-500/50 shadow-inner" : "opacity-40 pointer-events-none"}`}>
                    <label className="text-[10px] text-slate-300 font-semibold block mb-1">🖼️ Ảnh/Video sản phẩm:</label>
                    <input type="file" disabled={inputType !== "file"} accept="video/*,image/*" onChange={handleSampleMediaChange} className="w-full text-[11px] text-slate-300 file:bg-purple-600 file:border-0 file:rounded file:text-white file:text-[10px] file:py-0.5 file:px-2 cursor-pointer" />
                  </div>

                  <div className={`p-2 rounded-lg border transition-all ${inputType === "link" ? "bg-slate-950 border-purple-500/50 shadow-inner" : "opacity-40 pointer-events-none"}`}>
                    <label className="text-[10px] text-slate-300 font-semibold block mb-1">🔗 Link TikTok/Shopee đối thủ:</label>
                    <input type="text" disabled={inputType !== "link"} value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="https://tiktok.com/@doithu/..." className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* MÔ TẢ */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mô tả sản phẩm (tùy chọn):</label>
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Nhập tên sản phẩm, ưu điểm nổi bật..."
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* THỜI LƯỢNG & GIỌNG ĐỌC */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">⏱️ Thời lượng:</label>
                  <select value={videoLength} onChange={(e) => setVideoLength(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200">
                    <option value="15s">⚡ 15s (60 Credits)</option>
                    <option value="30s">🔥 30s (100 Credits)</option>
                    <option value="60s">🎬 60s (180 Credits)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">🎙️ Giọng đọc:</label>
                  <select value={voiceType} onChange={(e) => setVoiceType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200">
                    <option value="nu_bac">🗣️ Nữ Miền Bắc</option>
                    <option value="nam_nam">🗣️ Nam Miền Nam</option>
                    <option value="nu_nam">🗣️ Nữ Miền Nam</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleChatSubmit}
                disabled={chatLoading || cooldown > 0}
                className="w-full text-white font-semibold py-2.5 rounded-lg text-xs shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition cursor-pointer"
              >
                {chatLoading ? "⏳ AI Đang Xử Lý Kịch Bản..." : cooldown > 0 ? `⏳ Đang làm mới AI... (${cooldown}s)` : script ? "🔄 Tạo Lại Kịch Bản AI" : "✨ Tạo Kịch Bản AI (Miễn phí)"}
              </button>
            </div>

            {/* DANH SÁCH PHÂN CẢNH */}
            {script && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
                <h3 className="font-semibold text-xs text-purple-300">
                  📜 Kịch Bản Chi Tiết ({script.scenes?.length} phân cảnh)
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
                  {script.scenes?.map((scene: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <p className="font-bold text-purple-400 mb-0.5">Phân cảnh {scene.scene_number} ({scene.duration})</p>
                      <p className="text-slate-300 mb-0.5"><strong>Hình ảnh:</strong> {scene.visual_prompt_vi}</p>
                      <p className="text-slate-400 italic"><strong>Lời thoại:</strong> "{scene.voiceover}"</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleGenerateAllVideos}
                  disabled={scriptVideoLoading}
                  className="w-full font-bold py-3 rounded-lg text-xs shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {scriptVideoLoading ? "🎬 Đang Render Video HD..." : `🪄 Sinh Toàn Bộ Video (-${currentRequiredCredits} Credits)`}
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: VIDEO STUDIO & LỊCH SỬ */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl min-h-[480px]">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-purple-400 text-sm">🎬 Kết Quả Video Studio</h2>
                {scriptVideoLoading && (
                  <span className="text-xs text-yellow-400 font-medium animate-pulse">
                    ⚡ {renderProgress || "Đang xử lý render..."}
                  </span>
                )}
              </div>

              {/* KHUNG VIDEO GỘP HOÀN CHỈNH */}
              {mergedVideoUrl ? (
                <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-purple-300">🏆 VIDEO TỔNG HOÀN CHỈNH HD</span>
                    <button
                      onClick={() => handleDownloadVideo(mergedVideoUrl)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      📥 Tải video gộp FREE
                    </button>
                  </div>
                  <video src={mergedVideoUrl} controls autoPlay className="w-full h-56 object-cover rounded-lg bg-black shadow" />
                </div>
              ) : (
                <div className="border border-dashed border-slate-800/80 rounded-xl h-40 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
                  <span className="text-2xl animate-bounce">🎬</span>
                  <p className="text-slate-400 font-medium">Khung hiển thị video thành phẩm gộp HD</p>
                  <span className="text-[10px] text-slate-500">
                    bấm tạo kịch bản và sinh toàn bộ video ở đây
                  </span>
                </div>
              )}

              {/* LƯỚI PHÂN CẢNH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scriptVideoUrls.length > 0 ? (
                  scriptVideoUrls.map((url, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-purple-300">Phân cảnh {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReGenerateSingleScene(idx)}
                            disabled={singleSceneLoading === idx}
                            className="text-yellow-400 hover:text-yellow-300 text-[10px] font-medium underline flex items-center gap-1 transition cursor-pointer"
                          >
                            {singleSceneLoading === idx ? "⏳..." : "🔄 Tạo lại (-20 Credits)"}
                          </button>
                          <a href={url} download target="_blank" rel="noreferrer" className="text-purple-400 hover:underline text-[10px]">
                            Tải về
                          </a>
                        </div>
                      </div>
                      <video src={url} controls className="w-full h-32 object-cover rounded-lg bg-black" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500 italic">
                    Các phân cảnh video riêng lẻ sẽ tự động hiển thị ở đây sau khi bạn bấm "Sinh Toàn Bộ Video".
                  </div>
                )}
              </div>

              {/* LỊCH SỬ VIDEO ĐÃ TẠO */}
              {historyList.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    🕒 Lịch sử video đã tạo gần đây ({historyList.length}):
                  </h3>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {historyList.map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-36 bg-slate-950 border border-slate-800 p-1.5 rounded-lg space-y-1">
                        <video src={item.videoUrl} className="w-full h-20 object-cover rounded bg-black" />
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>{item.createdAt}</span>
                          <button onClick={() => handleDownloadVideo(item.videoUrl)} className="text-purple-400 font-bold hover:underline">
                            Tải
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL THANH TOÁN VIETQR */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full text-center relative space-y-4">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-4 text-slate-400 hover:text-white text-xl font-bold">✕</button>
            <h3 className="text-lg font-bold text-purple-400">Nạp Credits Render Video AI HD</h3>
            <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
              <button onClick={() => { setPaymentTab("one_time"); setSelectedPlanAmount(100000); }} className={`py-2 rounded-lg ${paymentTab === "one_time" ? "bg-purple-600 text-white" : "text-slate-400"}`}>💳 Nạp Lẻ Credits</button>
              <button onClick={() => { setPaymentTab("subscription"); setSelectedPlanAmount(499000); }} className={`py-2 rounded-lg ${paymentTab === "subscription" ? "bg-purple-600 text-white" : "text-slate-400"}`}>👑 Gói Đăng Ký Tháng</button>
            </div>
            {paymentTab === "one_time" ? (
              <div className="grid grid-cols-2 gap-2.5 text-left">
                {topupPlans.map((plan) => (
                  <div key={plan.amount} onClick={() => setSelectedPlanAmount(plan.amount)} className={`p-3 rounded-xl border cursor-pointer ${selectedPlanAmount === plan.amount ? "bg-purple-950/60 border-purple-500" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                    <p className="font-bold text-xs text-white">{plan.credits} Credits</p>
                    <span className="font-bold text-emerald-400 text-xs block mt-1">{plan.amount.toLocaleString("vi-VN")}đ <span className="text-[9px] text-amber-400 font-normal">({plan.bonus})</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-left">
                {subscriptionPlans.map((sub) => (
                  <div key={sub.amount} onClick={() => setSelectedPlanAmount(sub.amount)} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${selectedPlanAmount === sub.amount ? "bg-purple-950/60 border-purple-500" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                    <p className="font-bold text-xs text-white">Gói {sub.name} ({sub.credits.toLocaleString("vi-VN")} Credits)</p>
                    <span className="font-bold text-emerald-400 text-sm">{sub.label}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handlePaymentClick} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg">
              💳 Thanh Toán VietQR ({(selectedPlanAmount || 0).toLocaleString("vi-VN")} VNĐ)
            </button>
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG NHẬP */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative text-center">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
            <h3 className="text-lg font-bold text-white mb-2">Đăng Nhập Tài Khoản</h3>
            <p className="text-xs text-slate-400 mb-6">Đăng nhập bằng Google để hệ thống kích hoạt Credits tự động khi chuyển khoản.</p>
            <button onClick={handleLoginGoogle} className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer">
              Tiếp tục với tài khoản Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
