"use client";

import React, { useState, useEffect } from "react";

export default function Home() {
  const [creativeMode, setCreativeMode] = useState<"creative" | "clone">("creative");
  const [keepVoice, setKeepVoice] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");

  // State chọn 1 trong 2 nguồn dữ liệu mẫu (File hoặc Link)
  const [inputType, setInputType] = useState<"file" | "link">("file");

  // State dữ liệu người dùng nhập
  const [textPrompt, setTextPrompt] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [sampleMediaFile, setSampleMediaFile] = useState<File | null>(null);

  // State quản lý tab "Gợi Ý Mẫu" sáng động
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  // Quản lý ảnh nhân vật (5-10 ảnh)
  const [characterFiles, setCharacterFiles] = useState<File[]>([]);
  const [characterPreviews, setCharacterPreviews] = useState<string[]>([]);
  const [useConsistentCharacter, setUseConsistentCharacter] = useState(true);

  // 🔒 CREDITS & THANH TOÁN: Mặc định = 0 Credits để ép nạp tiền khi bấm Sinh Video
  const [credits, setCredits] = useState(0); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [cooldown, setCooldown] = useState(0); 
  const totalCooldownTime = 15;

  const [videoLength, setVideoLength] = useState("15s");
  const [videoMode, setVideoMode] = useState("fast");
  const [voiceType, setVoiceType] = useState("nu_bac");

  const [chatLoading, setChatLoading] = useState(false);
  const [script, setScript] = useState<any>(null);

  const [scriptVideoLoading, setScriptVideoLoading] = useState(false);
  const [scriptVideoUrls, setScriptVideoUrls] = useState<string[]>([]);
  const [singleSceneLoading, setSingleSceneLoading] = useState<number | null>(null);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  const categories = [
    { name: "✨ Tất cả", prompt: "Váy đầm nữ linen mùa hè năng động, tôn dáng" },
    { name: "👗 Thời trang", prompt: "Áo sơ mi nam form rộng phong cách Hàn Quốc" },
    { name: "🍲 Thực phẩm", prompt: "Lẩu thái chua cay chuẩn vị, topping hải sản ngập tràn" },
    { name: "📱 Công nghệ", prompt: "Tai nghe chống ồn không dây bass siêu trầm" },
  ];

  const calculateRequiredCredits = () => {
    if (videoLength === "30s") return 10;
    if (videoLength === "60s") return 18;
    return 6; 
  };

  const currentRequiredCredits = calculateRequiredCredits();

  // Xử lý click chọn Tab Gợi ý mẫu sáng nổi bật
  const handleCategoryClick = (idx: number, promptText: string) => {
    setActiveCategory(idx);
    setTextPrompt(promptText);
  };

  // Upload nhiều ảnh nhân vật KOC cố định (5-10 ảnh)
  const handleMultipleCharacterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length + characterFiles.length > 10) {
        alert("Bạn chỉ được tải tối đa 10 ảnh nhân vật!");
        return;
      }
      
      const newFiles = [...characterFiles, ...filesArray].slice(0, 10);
      setCharacterFiles(newFiles);

      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
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
    if (file) {
      setSampleMediaFile(file);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // XỬ LÝ TẠO KỊCH BẢN AI (TEXT - MIỄN PHÍ)
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

    let modeInstruction = "";
    if (keepVoice) {
      modeInstruction = "[YÊU CẦU: GIỮ NGUYÊN LỜI THOẠI GỐC. AI tự phân chia cảnh và tạo góc quay KOC MỚI]";
    } else if (creativeMode === "creative") {
      modeInstruction = "[YÊU CẦU: Dùng cho đồ cầm tay/Review. Bóc sản phẩm từ mẫu, SÁNG TẠO kịch bản & góc quay MỚI 100%]";
    } else {
      modeInstruction = "[YÊU CẦU: Dùng cho thời trang/nhảy. Giữ trang phục & điệu nhảy từ mẫu, đè mặt KOC cố định vào]";
    }

    try {
      const payloadMessage = inputType === "link" 
        ? `${textPrompt} (BẮT BUỘC XỬ LÝ LINK: ${competitorUrl}) ${modeInstruction}`
        : `${textPrompt} (XỬ LÝ TỆP MẪU UPLOAD) ${modeInstruction}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payloadMessage,
          duration: videoLength,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo kịch bản.");

      setScript(data.script);
    } catch (err: any) {
      alert(err.message || "Lỗi kết nối AI.");
    } finally {
      setChatLoading(false);
    }
  };

  // 🔒 HÀM XỬ LÝ SINH TOÀN BỘ VIDEO (CREDITS = 0 SẼ BẬT POPUP NẠP 20K)
  const handleGenerateAllVideos = async () => {
    if (!script || !script.scenes) return;

    if (credits < currentRequiredCredits) {
      setShowPaymentModal(true);
      return;
    }

    setScriptVideoLoading(true);
    const newVideoUrls: string[] = [];
    const sampleMp4Url = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

    try {
      for (let i = 0; i < script.scenes.length; i++) {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            visual_prompt: script.scenes[i].visual_prompt,
            scene_number: script.scenes[i].scene_number,
            mode: videoMode,
            creativeMode: creativeMode,
            hasCharacter: characterFiles.length > 0
          }),
        });

        const data = await res.json();
        const urlToUse = (res.ok && data.video_url) ? data.video_url : sampleMp4Url;
        newVideoUrls.push(urlToUse);
        setScriptVideoUrls([...newVideoUrls]);
      }
      
      setMergedVideoUrl(newVideoUrls[0] || sampleMp4Url);
      setCredits((prev) => Math.max(0, prev - currentRequiredCredits));
    } catch (err: any) {
      alert("Lỗi khi sinh video.");
    } finally {
      setScriptVideoLoading(false);
    }
  };

  // 🔒 HÀM XỬ LÝ TẠO LẠI CẢNH LẺ (-2 CREDITS)
  const handleReGenerateSingleScene = async (sceneIndex: number) => {
    if (credits < 2) {
      setShowPaymentModal(true);
      return;
    }

    setSingleSceneLoading(sceneIndex);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          visual_prompt: script.scenes[sceneIndex].visual_prompt + " (Góc quay biến thể mới)",
          scene_number: script.scenes[sceneIndex].scene_number,
          mode: videoMode,
          creativeMode: creativeMode,
          hasCharacter: characterFiles.length > 0
        }),
      });

      const data = await res.json();
      const updatedUrls = [...scriptVideoUrls];
      updatedUrls[sceneIndex] = (res.ok && data.video_url) ? data.video_url : "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
      setScriptVideoUrls(updatedUrls);
      setCredits((prev) => Math.max(0, prev - 2));
    } catch (err: any) {
      alert("Lỗi khi tạo lại phân cảnh này.");
    } finally {
      setSingleSceneLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      {/* HEADER: THƯƠNG HIỆU MỚI REELBO.AI */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-lg text-white">
            R
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reelbo.ai
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs sm:text-sm mt-2 sm:mt-0">
          <button className="hover:text-purple-400 transition">🕒 Lịch Sử</button>
          
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded-full cursor-pointer outline-none hover:border-purple-500 transition"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
          </select>

          {/* CREDITS BADGE */}
          <div className="bg-slate-800 border border-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-yellow-400 font-bold">🔥 {credits} Credits</span>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 text-xs font-bold px-2.5 py-0.5 rounded-full transition shadow"
            >
              + Nạp
            </button>
          </div>
        </div>
      </header>

      {/* BANNER KHUYẾN MÃI BETA LAUNCH */}
      <div className="bg-purple-900/20 border-b border-purple-500/20 text-center py-2 text-xs text-purple-300">
        🔥 Ưu đãi Beta Launch: Giảm 50% tất cả gói nạp Credits — Nạp 20k nhận ngay 20 Credits!
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-4">
        {/* BỘ LỌC CHỌN NHANH (CÁC TAB SÁNG ĐỘNG KHI CLICK) */}
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

        {/* BỐ CỤC 2 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          
          {/* CỘT TRÁI: BẢNG ĐIỀU KHIỂN SÁNG TẠO */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* CARDS CHỌN MODE SÁNG TẠO */}
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
                  🔮 AI Sáng Tạo Góc Quay Mới
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Phù hợp <strong>đồ cầm tay</strong> (Máy sấy, son...). AI giữ Nhân vật cố định + Bóc sản phẩm & tạo góc quay MỚI.
                </p>
                {creativeMode === "creative" && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                )}
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
                  Phù hợp <strong>Thời trang / Đồ mặc</strong>. AI giữ trang phục & điệu nhảy gốc + Đè mặt Nhân vật cố định vào.
                </p>
                {creativeMode === "clone" && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            </div>

            {/* BẢNG ĐIỀU KHIỂN CHI TIẾT */}
            <div className={`bg-slate-900 border rounded-xl p-4 space-y-3.5 shadow-xl transition-all duration-300 ${
              creativeMode === "creative" ? "border-purple-500/40 shadow-purple-900/10" : "border-emerald-500/40 shadow-emerald-900/10"
            }`}>

              {/* 1. UPLOAD NHIỀU ẢNH NHÂN VẬT CỐ ĐỊNH */}
              <div className={`p-3 rounded-lg border space-y-2 transition-all ${
                creativeMode === "creative" ? "bg-slate-950 border-purple-500/30" : "bg-slate-950 border-emerald-500/30"
              }`}>
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold flex items-center gap-1 ${
                    creativeMode === "creative" ? "text-purple-300" : "text-emerald-300"
                  }`}>
                    👤 1. Bộ Ảnh Nhân Vật KOC Cố Định (5 - 10 ảnh):
                  </label>
                  <input
                    type="checkbox"
                    checked={useConsistentCharacter}
                    onChange={(e) => setUseConsistentCharacter(e.target.checked)}
                    className={creativeMode === "creative" ? "accent-purple-600" : "accent-emerald-600"}
                  />
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  💡 Khuyên dùng: Tải từ 5 - 10 ảnh (Chân dung, góc nghiêng 45°, toàn thân) để AI giữ độ nhất quán tốt nhất!
                </p>

                {useConsistentCharacter && (
                  <div className="space-y-2">
                    {characterPreviews.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                        {characterPreviews.map((preview, idx) => (
                          <div key={idx} className="relative group flex-shrink-0">
                            <img
                              src={preview}
                              alt={`KOC ${idx + 1}`}
                              className={`w-10 h-10 rounded-lg object-cover border ${
                                creativeMode === "creative" ? "border-purple-500" : "border-emerald-500"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => removeCharacterImage(idx)}
                              className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow opacity-80 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleCharacterChange}
                      className={`w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-white file:text-[10px] transition-all ${
                        creativeMode === "creative" ? "file:bg-purple-600 hover:file:bg-purple-500" : "file:bg-emerald-600 hover:file:bg-emerald-500"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* 2. CHỌN NGUỒN MẪU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">🎬 2. Nguồn mẫu (Bắt buộc chọn 1):</span>
                  
                  <div className="flex items-center gap-3 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="inputType"
                        value="file"
                        checked={inputType === "file"}
                        onChange={() => setInputType("file")}
                        className={creativeMode === "creative" ? "accent-purple-500" : "accent-emerald-500"}
                      />
                      <span className={inputType === "file" ? "text-white font-semibold" : "text-slate-400"}>📂 Tải File</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="inputType"
                        value="link"
                        checked={inputType === "link"}
                        onChange={() => setInputType("link")}
                        className={creativeMode === "creative" ? "accent-purple-500" : "accent-emerald-500"}
                      />
                      <span className={inputType === "link" ? "text-white font-semibold" : "text-slate-400"}>🔗 Dán Link</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg border transition-all ${
                    inputType === "file" 
                      ? creativeMode === "creative" ? "bg-slate-950 border-purple-500/50" : "bg-slate-950 border-emerald-500/50"
                      : "bg-slate-950/40 border-slate-900 opacity-40 pointer-events-none"
                  }`}>
                    <label className="text-[10px] text-slate-400 block mb-1">🖼️ Video/Ảnh mẫu (Từ máy):</label>
                    <input
                      type="file"
                      disabled={inputType !== "file"}
                      accept="video/*,image/*"
                      onChange={handleSampleMediaChange}
                      className={`w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-white file:text-[10px] transition-all ${
                        creativeMode === "creative" ? "file:bg-purple-600" : "file:bg-emerald-600"
                      }`}
                    />
                  </div>

                  <div className={`p-2 rounded-lg border transition-all ${
                    inputType === "link" 
                      ? creativeMode === "creative" ? "bg-slate-950 border-purple-500/50" : "bg-slate-950 border-emerald-500/50"
                      : "bg-slate-950/40 border-slate-900 opacity-40 pointer-events-none"
                  }`}>
                    <label className="text-[10px] text-slate-400 block mb-1">🔗 Link TikTok/Shopee đối thủ:</label>
                    <input
                      type="text"
                      disabled={inputType !== "link"}
                      value={competitorUrl}
                      onChange={(e) => setCompetitorUrl(e.target.value)}
                      placeholder="https://tiktok.com/@doithu/..."
                      className={`w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition ${
                        creativeMode === "creative" ? "focus:border-purple-500" : "focus:border-emerald-500"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. CÔNG TẮC GIỮ LỜI THOẠI */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">⚙️ Giữ Lời Thoại từ Video Mẫu:</span>
                <label className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer text-xs transition ${
                  keepVoice 
                    ? creativeMode === "creative" ? "bg-purple-900/60 border-purple-400 text-white font-semibold" : "bg-emerald-900/60 border-emerald-400 text-white font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <input
                    type="checkbox"
                    checked={keepVoice}
                    onChange={(e) => setKeepVoice(e.target.checked)}
                    className={creativeMode === "creative" ? "accent-purple-500" : "accent-emerald-500"}
                  />
                  🔒 Bật Giữ Lời Thoại
                </label>
              </div>

              {/* 4. MÔ TẢ SẢN PHẨM / AI CHAT */}
              {!keepVoice ? (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mô tả sản phẩm / Ghi chú (AI Chat):</label>
                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder={creativeMode === "creative" ? "Ví dụ: Máy sấy tóc ion âm Sunhouse, Son môi..." : "Ví dụ: Set váy đầm linen mùa hè..."}
                    className={`w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none text-slate-200 transition ${
                      creativeMode === "creative" ? "focus:border-purple-500" : "focus:border-emerald-500"
                    }`}
                  />
                </div>
              ) : (
                <div className={`p-2.5 rounded-lg text-xs italic border ${
                  creativeMode === "creative" ? "bg-purple-950/30 border-purple-500/30 text-purple-300" : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                }`}>
                  ⚡ <strong>AI Chat đã ẨN:</strong> AI sẽ tự động phân tách câu thoại đối thủ để tạo video góc quay MỚI.
                </div>
              )}

              {/* THỜI LƯỢNG VIDEO */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">⏱️ Thời lượng video & Chi phí Credits:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "15s", label: "⚡ 15s (3 cảnh)" },
                    { id: "30s", label: "🔥 30s (5 cảnh)" },
                    { id: "60s", label: "🎬 60s (9 cảnh)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setVideoLength(item.id)}
                      className={`py-1.5 px-1 text-[11px] font-medium rounded-lg border transition flex flex-col items-center justify-center ${
                        videoLength === item.id
                          ? creativeMode === "creative" ? "bg-purple-600 border-purple-400 text-white" : "bg-emerald-600 border-emerald-400 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHẤT LƯỢNG & GIỌNG ĐỌC */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">🎬 Chất lượng Video:</label>
                  <select
                    value={videoMode}
                    onChange={(e) => setVideoMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="fast">⚡ Chế độ Nhanh (Rẻ)</option>
                    <option value="hd_pro">🔥 Chế độ HD Pro (Đẹp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">🎙️ Giọng đọc AI KOC:</label>
                  <select
                    value={voiceType}
                    onChange={(e) => setVoiceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="nu_bac">🗣️ Nữ Miền Bắc</option>
                    <option value="nam_nam">🗣️ Nam Miền Nam</option>
                    <option value="nu_nam">🗣️ Nữ Miền Nam</option>
                  </select>
                </div>
              </div>

              {/* NÚT TẠO KỊCH BẢN AI (FREE) */}
              <div className="space-y-1.5">
                <button
                  onClick={handleChatSubmit}
                  disabled={chatLoading || cooldown > 0}
                  className={`w-full text-white font-semibold py-2.5 rounded-lg text-xs shadow-lg transition disabled:opacity-50 ${
                    creativeMode === "creative"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  }`}
                >
                  {chatLoading
                    ? "⏳ AI Đang Xử Lý Kịch Bản..."
                    : cooldown > 0
                    ? `⏳ Đang làm mới AI... (${cooldown}s)`
                    : script
                    ? "🔄 Tạo Lại Kịch Bản AI"
                    : "✨ Tạo Kịch Bản AI (Miễn phí)"}
                </button>

                {cooldown > 0 && (
                  <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        creativeMode === "creative" ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
                      }`}
                      style={{ width: `${(cooldown / totalCooldownTime) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* KHUNG HIỂN THỊ KỊCH BẢN */}
            {script && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-xs text-purple-300">
                    📜 Kịch Bản Chi Tiết ({script.scenes?.length} phân cảnh)
                  </h3>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1 text-xs">
                  {script.scenes?.map((scene: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <p className="font-bold text-purple-400 mb-1">Phân cảnh {scene.scene_number} ({scene.duration})</p>
                      <p className="text-slate-300 mb-1"><strong>Hình ảnh:</strong> {scene.visual_prompt_vi}</p>
                      <p className="text-slate-400 italic"><strong>Lời thoại:</strong> "{scene.voiceover}"</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGenerateAllVideos}
                  disabled={scriptVideoLoading}
                  className={`w-full font-bold py-3 rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-white ${
                    creativeMode === "creative"
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

          {/* CỘT PHẢI: VIDEO STUDIO */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl min-h-[500px]">
              <h2 className="font-semibold text-purple-400 text-sm flex items-center justify-between">
                <span>🎬 Kết Quả Video Studio</span>
                {scriptVideoLoading && <span className="text-xs text-yellow-400 animate-pulse">⚡ Đang xử lý AI...</span>}
              </h2>

              {/* KẾT QUẢ VIDEO TỔNG */}
              {mergedVideoUrl ? (
                <div className="bg-slate-950 border border-purple-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-purple-300">🏆 VIDEO TỔNG HOÀN CHỈNH HD</span>
                    <a
                      href={mergedVideoUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition shadow-md"
                    >
                      📥 Tải video gộp FREE
                    </a>
                  </div>
                  <video src={mergedVideoUrl} controls autoPlay className="w-full h-52 object-cover rounded-lg bg-black shadow" />
                </div>
              ) : (
                <div className="border border-dashed border-slate-800/80 rounded-xl h-40 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
                  <span className="text-2xl animate-bounce">🎬</span>
                  <p className="text-slate-400">Khung hiển thị video thành phẩm gộp HD</p>
                  <span className="text-[10px] text-slate-600">
                    Bấm "Tạo Kịch Bản AI" và "Sinh Toàn Bộ Video" ở cột bên trái
                  </span>
                </div>
              )}

              {/* LƯỚI PHÂN CẢNH LẺ */}
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
                            className="text-yellow-400 hover:text-yellow-300 text-[10px] font-medium underline flex items-center gap-1 transition"
                          >
                            {singleSceneLoading === idx ? "⏳..." : "🔄 Tạo lại video (-2 Cr)"}
                          </button>
                          <a href={url} download target="_blank" rel="noreferrer" className="text-purple-400 hover:underline text-[10px]">Tải về</a>
                        </div>
                      </div>
                      <video src={url} controls className="w-full h-32 object-cover rounded-lg bg-black" />
                    </div>
                  ))
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

      {/* 🔒 POP-UP MODAL NẠP TIỀN THẬT VIETQR */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center relative shadow-2xl">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-3 right-4 text-slate-400 hover:text-white text-xl font-bold transition"
            >
              ✕
            </button>
            
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-2xl mx-auto mb-3">
              🔒
            </div>

            <h3 className="text-xl font-bold text-purple-400 mb-1">
              Kích Hoạt Sinh Toàn Bộ Video AI HD
            </h3>
            <p className="text-xs text-slate-300 mb-5">
              Bạn không đủ Credits để Sinh Video. Nạp gói trải nghiệm tối thiểu 20k để Reelbo AI tiến hành render toàn bộ video sắc nét, không dính logo!
            </p>
            
            <div className="space-y-3 mb-6 text-left">
              <div className="p-3.5 bg-slate-950 border-2 border-purple-500/80 rounded-xl flex justify-between items-center cursor-pointer shadow-lg relative">
                <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-[9px] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                  Beta Launch - Tặng Thêm 100% Cr
                </span>
                <div>
                  <p className="font-bold text-white text-sm">Gói Dùng Thử (20 Credits)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Giá gốc: <span className="line-through text-slate-500">40.000đ</span> (Tạo được 3 video 15s)
                  </p>
                </div>
                <span className="font-bold text-emerald-400 text-xl">20.000đ</span>
              </div>
            </div>

            <button 
              onClick={() => alert("Chuyển đến trang quét mã VietQR tự động...")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold py-3 rounded-xl text-white shadow-lg transition text-sm flex items-center justify-center gap-2"
            >
              💳 Thanh Toán Tự Động Qua VietQR (20.000 VNĐ)
            </button>
            <p className="text-[10px] text-slate-500 mt-3">
              Mã QR cập nhật Credits tự động sau 3s-5s chuyển khoản.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
