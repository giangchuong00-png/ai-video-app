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

    const content = body.content || body.description || ""
    const transferAmount = body.transferAmount || body.amount || 0

    if (!content || !transferAmount) {
      return NextResponse.json({ success: true, message: 'No content or amount' }, { status: 200 })
    }

    // 1. Tính toán số credits cần cộng
    const amountNum = Number(transferAmount)
    const creditsToAdd = CREDIT_MAPPING[amountNum] || Math.floor(amountNum / 1000)

    // 2. Tìm email người dùng từ nội dung chuyển khoản
    let userEmail: string | null = null
    const cleanContent = content.toLowerCase()

    const standardMatch = cleanContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (standardMatch) {
      userEmail = standardMatch[0]
    } else {
      const missingDotMatch = cleanContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+)(com|vn|net|org)/)
      if (missingDotMatch) {
        userEmail = `${missingDotMatch[1]}.${missingDotMatch[2]}`
      }
    }

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: `Không bóc tách được email từ nội dung: "${content}"` 
      }, { status: 200 })
    }

    userEmail = userEmail.trim().toLowerCase()

    // 3. Cập nhật credits vào bảng PROFILES chuẩn của bạn
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, credits')
      .eq('email', userEmail)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 200 })
    }

    if (existingProfile) {
      const currentCredits = existingProfile.credits || 0
      const newCredits = currentCredits + creditsToAdd

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('email', userEmail)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 200 })
      }

      return NextResponse.json({
        success: true,
        message: `Đã cộng ${creditsToAdd} credits cho ${userEmail}. Tổng mới: ${newCredits}`,
        newCredits
      }, { status: 200 })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Không tìm thấy tài khoản email ${userEmail} trong bảng profiles. Vui lòng đăng nhập trước!` 
      }, { status: 200 })
    }

  } catch (error: any) {
    console.error('Lỗi Server:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 200 })
  }
}