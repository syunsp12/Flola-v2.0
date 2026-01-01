import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 })
    }

    // 指定期間内の既存取引を取得 (GAS側での重複チェック用)
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('date, amount, description')
      .gte('date', start)
      .lte('date', end)

    return NextResponse.json({
      success: true,
      existing_transactions: existingTransactions || []
    })

  } catch (error) {
    console.error('Fetch History Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
