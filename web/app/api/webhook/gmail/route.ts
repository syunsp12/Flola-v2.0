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
      // 厳格モデルに合わせたデータ整形
      // GASからはマイナスで来る場合があるので絶対値にする
      const amount = Math.abs(record.amount) 
      const description = record.description || '不明'
      
      // 口座IDの特定 (今回は簡易的に 'Oliveフレキシブルペイ' 固定とします)
      // ※GAS側でカード名を判別して送ってくる場合は分岐可能
      let accountName = 'Oliveフレキシブルペイ'
      if (record.source.includes('view')) accountName = 'Viewカード'
      
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
        type: 'expense', // 一旦すべて支出として登録
        from_account_id: account.id, // 負債口座からの出金
        status: 'pending', // 未承認
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