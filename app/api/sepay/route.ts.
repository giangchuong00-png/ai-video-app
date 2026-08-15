import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Sử dụng key quyền cao nếu có, hoặc dùng Anon Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// BẢNG QUY ĐỔI CHUẨN BETA & GÓI THÁNG
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
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("SePay Webhook Data:", body)

    const { content, transferAmount } = body

    if (!content || !transferAmount) {
      return NextResponse.json({ success: true, message: 'No content or amount' }, { status: 200 })
    }

    // 1. Tính toán số credits cần cộng
    const amountNum = Number(transferAmount)
    const creditsToAdd = CREDIT_MAPPING[amountNum] || Math.floor(amountNum / 1000)

    if (creditsToAdd <= 0) {
      return NextResponse.json({ success: true, message: 'Amount too low' }, { status: 200 })
    }

    // 2. Tìm email người dùng trong nội dung chuyển khoản (Memo)
    const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

    if (emailMatch) {
      const userEmail = emailMatch[0].toLowerCase().trim()

      // Lấy số credit hiện tại của user
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('email', userEmail)
        .maybeSingle()

      const currentCredits = userData?.credits || 0
      const newCredits = currentCredits + creditsToAdd

      // Cập nhật credits vào database
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          { email: userEmail, credits: newCredits },
          { onConflict: 'email' }
        )

      if (upsertError) {
        console.error('Supabase error:', upsertError)
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Đã cộng thành công ${creditsToAdd} credits cho ${userEmail}`,
        newCredits,
      }, { status: 200 })
    }

    return NextResponse.json({ success: true, message: 'No email found in memo' }, { status: 200 })
  } catch (error: any) {
    console.error('Lỗi Webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}