import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GASから送られてくるデータの型定義
type Payload = {
  date: string
  amount: number
  description: string
  source: string
}

export async function POST(request: Request) {
  try {
    // 1. APIキー認証 (簡易版)
    // URLクエリパラメータ ?key=... で認証します
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    // 環境変数に設定したAPIキーと一致するか確認（簡易セキュリティ）
    // ※後でVercelの環境変数に ADMIN_API_KEY を設定します
    if (key !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const records: Payload[] = Array.isArray(body) ? body : [body]
    
    console.log(`📨 Received ${records.length} records from GAS`)

    let savedCount = 0
    let skippedCount = 0

    // 2. データ処理ループ
    for (const record of records) {
      const amount = Math.abs(record.amount) 
      const description = record.description || '不明'
      
      // --- 口座とタイプの判定ロジックを強化 ---
      let accountName = 'Oliveフレキシブルペイ' // デフォルト（三井住友カード等）
      let type: 'income' | 'expense' = 'expense'

      if (record.source.includes('view')) {
        accountName = 'Viewカード'
      } else if (record.source.includes('smbc')) {
        accountName = '三井住友銀行'
        // 入金通知の場合はタイプをincomeにする
        if (record.source === 'email_smbc_deposit') {
          type = 'income'
        }
      }
      
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('name', accountName)
        .single()
        
      if (!account) {
        console.error(`Account not found: ${accountName}`)
        continue
      }

      // 重複チェック (同日・同額・同名のデータが既にないか)
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('date', record.date)
        .eq('amount', amount)
        .eq('description', description)
        .eq('from_account_id', account.id) // 同じ口座からのデータのみ
        .single()

      if (existing) {
        skippedCount++
        continue
      }

      // DB登録
      const { error } = await supabase.from('transactions').insert({
        date: record.date,
        amount: amount,
        description: description,
        type: type,
        from_account_id: account.id,
        status: 'pending', 
        source: 'gmail_webhook'
      })

      if (error) {
        console.error('DB Insert Error:', error)
      } else {
        savedCount++
      }
    }

    // 3. ログ記録 (System Logs)
    await supabase.from('system_logs').insert({
      source: 'api_webhook_gmail',
      level: 'info',
      message: `Processed ${records.length} records. Saved: ${savedCount}, Skipped: ${skippedCount}`
    })

    return NextResponse.json({ 
      success: true, 
      saved: savedCount, 
      skipped: skippedCount 
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}