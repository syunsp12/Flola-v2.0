import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  // 簡易セキュリティ
  const VALID_TOKEN = process.env.ADMIN_API_KEY || 'flola-secret-key'

  if (token !== VALID_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    // INBOX（ステータスが pending）の件数を取得
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) throw error

    return NextResponse.json({
      inbox_count: count || 0,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Widget API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}