import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
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
    console.log("SePay Webhook Body:", body)

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

    // 2. Thuật toán tìm email thông minh (Xử lý việc ngân hàng xóa mất dấu chấm)
    let userEmail: string | null = null
    const cleanContent = content.toLowerCase()

    // Trường hợp A: Có email chuẩn đầy đủ ký tự
    const standardEmailMatch = cleanContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (standardEmailMatch) {
      userEmail = standardEmailMatch[0]
    } 
    // Trường hợp B: Ngân hàng xóa mất dấu chấm (VD: gtran7214@gmailcom hoặc gtran7214 gmail com)
    else {
      const matchNoDot = cleanContent.match(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9]+)(com|vn|net|org)/)
      if (matchNoDot) {
        userEmail = `${matchNoDot[1]}@${matchNoDot[2]}.${matchNoDot[3]}`
      } else {
        const matchSpace = cleanContent.match(/([a-zA-Z0-9._%+-]+)\s*@?\s*gmail\s*com/)
        if (matchSpace) {
          userEmail = `${matchSpace[1].replace(/[^a-zA-Z0-9._%+-]/g, '')}@gmail.com`
        }
      }
    }

    if (userEmail) {
      userEmail = userEmail.trim()

      // Lấy số credit hiện tại của user
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('email', userEmail)
        .maybeSingle()

      const currentCredits = userData?.credits || 0
      const newCredits = currentCredits + creditsToAdd

      // Cập nhật hoặc tự tạo hàng mới nếu chưa có
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          { email: userEmail, credits: newCredits },
          { onConflict: 'email' }
        )

      if (upsertError) {
        console.error('Lỗi Supabase:', upsertError)
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Đã cộng thành công ${creditsToAdd} credits cho ${userEmail}`,
        newCredits,
      }, { status: 200 })
    }

    return NextResponse.json({ 
      success: false, 
      message: `Không bóc tách được email từ nội dung: "${content}"` 
    }, { status: 200 })
  } catch (error: any) {
    console.error('Lỗi Server:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}