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

    // 2. Thuật toán tìm email người dùng từ nội dung chuyển khoản
    let userEmail: string | null = null
    const cleanContent = content.toLowerCase()

    const standardEmailMatch = cleanContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (standardEmailMatch) {
      userEmail = standardEmailMatch[0]
    } else {
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

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: `Không bóc tách được email từ nội dung: "${content}"` 
      }, { status: 200 })
    }

    userEmail = userEmail.trim()

    // 3. Kiểm tra user trong bảng users
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (selectError) {
      console.error('Supabase Select Error:', selectError)
    }

    if (existingUser) {
      // Đã có tài khoản: Cộng thêm credits
      const newCredits = (existingUser.credits || 0) + creditsToAdd
      const { error: updateError } = await supabase
        .from('users')
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
      // Chưa có dòng trong bảng users: Tạo dòng mới
      const { error: insertError } = await supabase
        .from('users')
        .insert({ email: userEmail, credits: creditsToAdd })

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 200 })
      }

      return NextResponse.json({
        success: true,
        message: `Tạo mới user và cộng ${creditsToAdd} credits cho ${userEmail}`,
        newCredits: creditsToAdd
      }, { status: 200 })
    }

  } catch (error: any) {
    console.error('Lỗi Exception Webhook:', error)
    // Luôn trả về HTTP 200 để tránh SePay báo lỗi 500 đỏ
    return NextResponse.json({ success: false, error: error.message }, { status: 200 })
  }
}