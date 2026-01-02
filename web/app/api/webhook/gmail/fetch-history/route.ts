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

    // パターンA: 期間指定があれば、重複チェック用の既存取引データを返す (GAS: doPost用)
    if (start && end) {
      const { data: existingTransactions, error } = await supabase
        .from('transactions')
        .select('date, amount, description')
        .gte('date', start)
        .lte('date', end)

      if (error) {
        console.error('DB Error (Existing Check):', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        existing_transactions: existingTransactions || []
      })
    }

    // パターンB: 期間指定がなければ、Pendingなリクエストを1つ返す (GAS: fetchHistoryByPeriod用)
    const { data: requests, error: reqError } = await supabase
      .from('history_fetch_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (reqError) {
      console.error('DB Error (Fetch Request):', reqError)
      throw reqError
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ hasRequest: false })
    }

    const requestData = requests[0]

    // ステータスを processing に更新
    await supabase
      .from('history_fetch_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', requestData.id)

    // 重複チェック用の既存取引データを取得
    const { data: existingTransactions, error: transError } = await supabase
      .from('transactions')
      .select('date, amount, description')
      .gte('date', requestData.start_date)
      .lte('date', requestData.end_date)
      
    if (transError) {
      console.error('DB Error (Trans Check):', transError)
      throw transError
    }

    return NextResponse.json({
      hasRequest: true,
      requestId: requestData.id,
      period: {
        start: requestData.start_date,
        end: requestData.end_date
      },
      existing_transactions: existingTransactions || []
    })

  } catch (error) {
    console.error('Fetch History Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, status, message, processedCount } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (status) updateData.status = status
    if (message) updateData.message = message
    if (processedCount !== undefined) updateData.processed_count = processedCount

    const { error } = await supabase
      .from('history_fetch_requests')
      .update(updateData)
      .eq('id', requestId)

    if (error) {
      console.error('DB Error (Update Status):', error)
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update Status Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}