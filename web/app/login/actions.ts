'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  console.log("🚀 Login action started...") // ログ: 開始

  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log(`📧 Attempting login for: ${email}`) // ログ: メール確認

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("❌ Login error:", error.message) // ログ: エラー
    // リダイレクトではなく、エラーメッセージを返す
    return { error: error.message }
  }

  console.log("✅ Login successful, redirecting...") // ログ: 成功
  
  revalidatePath('/', 'layout')
  // redirectはtry-catchで囲むとエラーになる仕様があるため、最後に行う
  redirect('/')
}