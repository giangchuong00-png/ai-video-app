"use client";

import { useState } from "react";
import { 
  Sparkles, 
  Video, 
  Link as LinkIcon, 
  Upload, 
  Zap, 
  CheckCircle2, 
  Copy, 
  Play, 
  CreditCard,
  ShieldCheck,
  X
} from "lucide-react";

export default function HomePage() {
  // States chính cho ứng dụng
  const [activeTab, setActiveTab] = useState<"creative" | "motion">("creative");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [duration, setDuration] = useState("15s");
  
  // States cho quá trình xử lý & kết quả
  const [loading, setLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // States cho Nạp Tiền
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [userCoins, setUserCoins] = useState(50); // Xu mặc định ban đầu

  // Danh sách các gói nạp linh hoạt (Ưu đãi 50% MVP)
  const topupPlans = [
    { amount: 20000, coins: 20, bonus: "+0 xu", label: "20.000đ", popular: false },
    { amount: 50000, coins: 60, bonus: "+10 xu", label: "50.000đ", popular: true },
    { amount: 100000, coins: 140, bonus: "+40 xu", label: "100.000đ", popular: false },
    { amount: 200000, coins: 300, bonus: "+100 xu", label: "200.000đ", popular: false },
  ];

  // Hàm gửi yêu cầu tạo kịch bản AI
  const handleGenerateScript = async () => {
    if (!tiktokUrl && !productDescription) {
      setErrorMessage("Vui lòng dán Link TikTok/Shopee hoặc nhập tên sản phẩm!");
      return;
    }

    if (userCoins < 5) {
      setShowTopupModal(true);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setScriptResult(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${tiktokUrl ? `Link mẫu: ${tiktokUrl}. ` : ""}${productDescription}`,
          duration: duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể khởi tạo kịch bản.");
      }

      setScriptResult(data.script);
      setUserCoins((prev) => Math.max(0, prev - 5)); // Trừ 5 xu mỗi lần tạo thành công
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo kịch bản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Reelbo<span className="text-blue-500">.AI</span>
          </span>
        </div>

        {/* Nút Nạp Xu / Ví */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTopupModal(true)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full transition-all"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{userCoins} Xu</span>
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1">
              + Nạp
            </span>
          </button>
        </div>
      </header>

      {/* Container Chính */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Ưu đãi MVP */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                🔥 Ra Mắt MVP: Giảm 50% Cho Nạp Xu
              </h3>
              <p className="text-xs text-slate-400">
                Tự động biến tấu bối cảnh, giữ 80% lời thoại chuẩn Affiliate.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTopupModal(true)}
            className="hidden sm:block bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Nạp Ngay
          </button>
        </div>

        {/* Chuyển Chế Độ AI */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab("creative")}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
              activeTab === "creative"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Sáng Tạo Kịch Bản</span>
          </button>

          <button
            onClick={() => setActiveTab("motion")}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
              activeTab === "motion"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>AI Nhái Chuyển Động</span>
          </button>
        </div>

        {/* Form Đầu Vào AI Sáng Tạo */}
        {activeTab === "creative" ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            {/* 1. Nhập Link Mẫu */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Link TikTok / Shopee Mẫu (Nếu Có)</span>
              </label>
              <input
                type="text"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="Dán link TikTok đối thủ hoặc link sản phẩm Shopee..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* 2. Ô Mô Tả Sản Phẩm Mới (Đã cập nhật đúng yêu cầu) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mô tả sản phẩm <span className="text-slate-500 font-normal lowercase">(không bắt buộc)</span>
              </label>
              <textarea
                rows={3}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Nhập tên sản phẩm, thương hiệu (nếu có)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {/* 3. Chọn thời lượng */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Thời lượng video:
              </span>
              <div className="flex space-x-2">
                {["15s", "30s", "60s"].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setDuration(dur)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      duration === dur
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* ĐÃ XÓA HOÀN TOÀN Ô CHECKBOX / CẢNH BÁO GIỮ LỜI THOẠI */}

            {/* Lỗi hiển thị nếu có */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Nút Tạo Kịch Bản */}
            <button
              onClick={handleGenerateScript}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang cào dữ liệu & khởi tạo AI...</span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Tạo Kịch Bản Biến Thể (5 Xu)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Tab AI Nhái Chuyển Động (Thời Trang) */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl mx-auto flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Nhái Chuyển Động Trend TikTok</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Tải lên ảnh mẫu KOC mặc đồ + Video nhảy TikTok. AI sẽ tự nhái lại 100% chuyển động cho thời trang.
              </p>
            </div>
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:border-blue-500/50 transition-all">
              <Upload className="w-8 h-8 text-slate-500" />
              <span className="text-xs text-slate-400">Tải lên Ảnh KOC hoặc Video TikTok mẫu</span>
            </div>
          </div>
        )}

        {/* Kết Quả Kịch Bản AI Trả Về */}
        {scriptResult && scriptResult.scenes && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Kịch Bản AI Đã Tối Ưu Ngầm</span>
              </h3>
              <button 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(scriptResult, null, 2))}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 bg-blue-500/10 px-2.5 py-1 rounded-lg"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép kịch bản</span>
              </button>
            </div>

            <div className="space-y-3">
              {scriptResult.scenes.map((scene: any, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-blue-400">Cảnh {scene.scene_number || idx + 1}</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{scene.duration || "5s"}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">🗣️ Lời thoại KOC (Giữ 80% cốt lõi):</span>
                    <p className="text-sm text-slate-100 font-medium bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50">
                      "{scene.voiceover}"
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">🎬 Góc quay & Bối cảnh mới (Visual Prompt):</span>
                    <p className="text-xs text-slate-300 italic bg-slate-900/30 p-2 rounded border border-slate-800/30">
                      {scene.visual_prompt_vi || scene.visual_prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL NẠP TIỀN LEO GIÁ (20k - 50k - 100k - 200k) */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 relative">
            <button
              onClick={() => setShowTopupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-400/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 fill-amber-400" />
              </div>
              <h3 className="font-bold text-white text-lg">Nạp Xu Tạo Kịch Bản Reelbo</h3>
              <p className="text-xs text-slate-400">Ưu đãi giảm 50% áp dụng cho bản MVP hôm nay</p>
            </div>

            {/* Danh sách 4 Gói Nạp */}
            <div className="grid grid-cols-2 gap-3">
              {topupPlans.map((plan) => (
                <button
                  key={plan.amount}
                  onClick={() => setSelectedAmount(plan.amount)}
                  className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all relative ${
                    selectedAmount === plan.amount
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Bán Chạy
                    </span>
                  )}
                  <span className="text-base font-bold">{plan.label}</span>
                  <span className="text-xs text-amber-400 font-semibold mt-1">
                    {plan.coins} Xu <span className="text-[10px] text-emerald-400">({plan.bonus})</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Số Xu nhận được:</span>
                <span className="font-bold text-amber-400">
                  {topupPlans.find((p) => p.amount === selectedAmount)?.coins} Xu
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Hình thức thanh toán:</span>
                <span className="font-semibold text-slate-200">Quét Mã QR Chuyển Khoản</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert(`Đang khởi tạo mã QR thanh toán gói ${selectedAmount.toLocaleString("vi-VN")}đ...`);
                setShowTopupModal(false);
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Xác Nhận Nạp {selectedAmount.toLocaleString("vi-VN")}đ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
