import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateAdminApiRequest } from '@/lib/auth/admin-api'

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { error: NextResponse.json({ error: 'Supabase credentials are not configured' }, { status: 500 }) }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Using ANON_KEY. RLS might block updates.')
  }

  return { client: createClient(supabaseUrl, supabaseKey) }
}

export async function GET(request: Request) {
  try {
    const auth = authenticateAdminApiRequest(request)
    if (!auth.ok) return auth.response

    const supabaseResult = getSupabaseAdminClient()
    if ('error' in supabaseResult) return supabaseResult.error
    const supabase = supabaseResult.client

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

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
    // Service Role Keyを使っているため、RLSに関わらず更新可能
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
    const auth = authenticateAdminApiRequest(request)
    if (!auth.ok) return auth.response

    const supabaseResult = getSupabaseAdminClient()
    if ('error' in supabaseResult) return supabaseResult.error
    const supabase = supabaseResult.client

    const body = await request.json()
    const { requestId, status, message, processedCount } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const updateData: {
      updated_at: string
      status?: string
      message?: string
      processed_count?: number
    } = {
      updated_at: new Date().toISOString()
    }
    if (status) updateData.status = status
    if (message) updateData.message = message
    if (processedCount !== undefined) updateData.processed_count = processedCount

    // Service Role Keyを使っているため、RLSに関わらず更新可能
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