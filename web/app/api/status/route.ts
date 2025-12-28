import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic' // 常に最新データを取得

export async function GET(request: Request) {
  try {
    // APIキー認証 (URLパラメータ ?key=... で簡易認証)
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 未承認(pending)の件数を取得
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true }) // データの中身は取らず件数だけ取得
      .eq('status', 'pending')

    if (error) {
      throw error
    }

    // シンプルなJSONを返す
    return NextResponse.json({
      pending_count: count,
      message: count && count > 0 ? `🔴 未承認: ${count}件` : "✅ 完了",
      color: count && count > 0 ? "#FF0000" : "#00FF00" // ウィジェットの色指定用
    })

  } catch (error) {
    console.error('Status API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}