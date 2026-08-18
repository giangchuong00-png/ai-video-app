import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =========================================================
// ENV
// =========================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SePay webhook secret/API key do mày cấu hình trong SePay.
// Tạo biến này trong Vercel Environment Variables.
const sepayWebhookApiKey = process.env.SEPAY_WEBHOOK_API_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

console.log(
  "Supabase service key loaded:",
  serviceRoleKey.startsWith("sb_secret_")
);

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
 
// =========================================================
// CREDIT MAPPING
// =========================================================

const CREDIT_MAPPING: Record<number, number> = {
  // Gói nạp lẻ Beta
  20000: 96,
  50000: 240,
  100000: 530,
  200000: 1080,

  // Gói tháng
  249000: 1200,
  499000: 2600,
  999000: 5500,
};

// =========================================================
// HELPER: TÌM PAYMENT CODE
// Ví dụ content:
// "REELBO RB100"
// "CHUYEN TIEN REELBO RB100"
// "MOMO-REELBO-RB100"
// =========================================================

function extractPaymentCode(content: string): string | null {
  if (!content) return null;

  const normalized = content.toUpperCase();

  // Bắt mã kiểu RB100, RB7K4P2, RB9F73A1C2...
  const match = normalized.match(/\bRB[A-Z0-9]{3,20}\b/);

  return match ? match[0] : null;
}

// =========================================================
// HELPER: LẤY SEPAY TRANSACTION ID
// =========================================================

function extractSePayId(body: any): number | null {
  const rawId =
    body?.id ??
    body?.transactionId ??
    body?.transaction_id ??
    body?.sepay_id;

  if (rawId === undefined || rawId === null) {
    return null;
  }

  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// =========================================================
// HELPER: LẤY SỐ TIỀN
// =========================================================

function extractAmount(body: any): number | null {
  const rawAmount =
    body?.transferAmount ??
    body?.amount ??
    body?.transfer_amount;

  if (rawAmount === undefined || rawAmount === null) {
    return null;
  }

  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.floor(amount);
}

// =========================================================
// WEBHOOK
// =========================================================

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. XÁC THỰC WEBHOOK SEPAY
    // =====================================================
    //
    // Nếu mày cấu hình SePay Webhook theo API Key,
    // SePay có thể gửi Authorization header.
    //
    // Ví dụ:
    // Authorization: Apikey xxxxx
    //
    // Không bật chế độ "không xác thực" khi dùng thật.
    // =====================================================

    if (sepayWebhookApiKey) {
      const authorization = request.headers.get("authorization") || "";

      const expected = `Apikey ${sepayWebhookApiKey}`;

      if (authorization !== expected) {
        console.error("Invalid SePay webhook authorization");

        return NextResponse.json(
          {
            success: false,
            code: "UNAUTHORIZED",
            message: "Unauthorized webhook",
          },
          { status: 401 }
        );
      }
    } else {
      // Trong production, tao khuyên fail luôn nếu chưa cấu hình.
      console.warn(
        "WARNING: SEPAY_WEBHOOK_API_KEY is not configured."
      );
    }

    // =====================================================
    // 2. ĐỌC BODY
    // =====================================================

    const body = await request.json();

    console.log("SePay webhook received:", {
      id: body?.id,
      transferAmount: body?.transferAmount,
      content: body?.content,
    });

    // =====================================================
    // 3. CHỈ NHẬN TIỀN VÀO
    // =====================================================
    //
    // Tùy payload SePay của mày có trường transferType hay không.
    // Nếu có và không phải "in" thì bỏ qua.
    // =====================================================

    const transferType =
      body?.transferType ??
      body?.transfer_type ??
      null;

    if (
      transferType &&
      String(transferType).toLowerCase() !== "in"
    ) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
          message: "Not an incoming transaction",
        },
        { status: 200 }
      );
    }

    // =====================================================
    // 4. LẤY SEPAY ID
    // =====================================================

    const sepayId = extractSePayId(body);

    if (!sepayId) {
      console.error("Invalid/missing SePay transaction ID", body);

      return NextResponse.json(
        {
          success: false,
          code: "INVALID_SEPAY_ID",
          message: "Missing or invalid SePay transaction ID",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. LẤY SỐ TIỀN
    // =====================================================

    const amount = extractAmount(body);

    if (!amount) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_AMOUNT",
          message: "Invalid transaction amount",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. CHỈ CHẤP NHẬN GÓI HỢP LỆ
    // =====================================================

    const creditsToAdd = CREDIT_MAPPING[amount];

    if (!creditsToAdd) {
      // Không tự Math.floor(amount / 1000) nữa.
      // Tránh chuyển nhầm số tiền vẫn được cộng credit.
      console.warn("Unsupported payment amount:", amount);

      return NextResponse.json(
        {
          success: true,
          ignored: true,
          code: "UNSUPPORTED_AMOUNT",
          message: `Không có gói Reelbo tương ứng với ${amount} VND`,
        },
        { status: 200 }
      );
    }

    // =====================================================
    // 7. LẤY NỘI DUNG CHUYỂN KHOẢN
    // =====================================================

    const content = String(
      body?.content ??
      body?.description ??
      ""
    );

    if (!content) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
          code: "NO_CONTENT",
          message: "Transaction has no payment content",
        },
        { status: 200 }
      );
    }

    // =====================================================
    // 8. BÓC PAYMENT CODE
    // =====================================================

    const paymentCode = extractPaymentCode(content);

    if (!paymentCode) {
      console.warn("Cannot extract Reelbo payment code:", content);

      return NextResponse.json(
        {
          success: true,
          ignored: true,
          code: "PAYMENT_CODE_NOT_FOUND",
          message:
            "Không tìm thấy mã thanh toán Reelbo trong nội dung chuyển khoản.",
        },
        { status: 200 }
      );
    }

    // =====================================================
    // 9. GỌI POSTGRES RPC ATOMIC
    // =====================================================

    const { data, error } = await supabase.rpc(
      "process_sepay_payment",
      {
        p_sepay_id: sepayId,
        p_amount: amount,
        p_credits_to_add: creditsToAdd,
        p_content: content,
        p_payment_code: paymentCode,
        p_email: null,
      }
    );

    // =====================================================
    // 10. DB ERROR -> TRẢ 500
    // SePay sẽ có cơ chế retry webhook khi endpoint fail.
    // =====================================================

    if (error) {
      console.error("process_sepay_payment RPC error:", error);

      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_ERROR",
          message: "Payment processing failed",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 11. PROFILE KHÔNG TÌM THẤY
    // =====================================================

    if (data?.success === false) {
      console.warn("Payment not processed:", data);

      // Đây không phải lỗi tạm thời của server.
      // Retry sẽ không giúp gì nếu payment_code sai.
      return NextResponse.json(
        data,
        { status: 200 }
      );
    }

    // =====================================================
    // 12. DUPLICATE
    // =====================================================
    //
    // RPC trả:
    // success=true
    // duplicate=true
    //
    // Credit KHÔNG được cộng lần 2.
    // Trả 200 để SePay ngừng retry.
    // =====================================================

    if (data?.duplicate === true) {
      console.log(
        `Duplicate transaction ignored: ${sepayId}`
      );

      return NextResponse.json(
        data,
        { status: 200 }
      );
    }

    // =====================================================
    // 13. THÀNH CÔNG
    // =====================================================

    console.log("Payment processed successfully:", {
      sepayId,
      paymentCode,
      amount,
      creditsAdded: creditsToAdd,
      newCredits: data?.new_credits,
    });

    return NextResponse.json(
      data,
      { status: 200 }
    );

  } catch (error: any) {
    console.error("SePay webhook server error:", error);

    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
