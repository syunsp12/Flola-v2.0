import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GASから送られてくるデータの型定義
type Payload = {
  date: string
  amount: number
  description: string
  source: string
  // GAS側で追加したカード名 (Vpass系のみ付与される想定)
  card_name?: string
}

// --- 口座名マッピング設定 ---
// 左側 (Key): GASの getVpassCardType 関数が返す card_name
// 右側 (Value): Supabaseの accounts テーブルにある正確な name
const ACCOUNT_MAP: Record<string, string> = {
  // DBに存在する名前に完全一致させます
  'Oliveフレキシブルペイ(デビット)': 'Oliveフレキシブルペイ(デビット)',
  'Oliveフレキシブルペイ(クレジット)': 'Oliveフレキシブルペイ(クレジット)',
  '三井住友ゴールド(NL)': '三井住友ゴールド(NL)',

  // DBに「その他」がないため、とりあえずゴールドNLに寄せるか、
  // もし「三井住友カード」という汎用口座を作るならそれに割り当ててください。
  // ここでは既存の「三井住友ゴールド(NL)」に割り当てています。
  '三井住友カード(その他)': '三井住友ゴールド(NL)',

  // source判定で使うものも念のため定義
  'Viewカード': 'Viewカード',
  '三井住友銀行': '三井住友銀行'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    // 1. APIキー認証
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

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

      let dbAccountName = ''
      let type: 'income' | 'expense' = 'expense'

      // --- 口座名の決定ロジック ---

      // パターンA: GASから card_name が送られてきている場合 (Vpass系)
      if (record.card_name && ACCOUNT_MAP[record.card_name]) {
        dbAccountName = ACCOUNT_MAP[record.card_name]
      }
      // パターンB: card_nameがない、またはMapにない場合は source で判定
      else {
        // SMBC銀行の判定 (sourceに smbc が含まれ、vpassを含まない)
        if (record.source.toLowerCase().includes('smbc') && !record.source.toLowerCase().includes('vpass')) {
          dbAccountName = ACCOUNT_MAP['三井住友銀行'] || '三井住友銀行'

          // 入金判定
          if (record.source === 'email_smbc_deposit') {
            type = 'income'
          }
          // ことら送金等はデフォルト(expense)のまま
        } else if (record.source.toLowerCase().includes('view')) {
          dbAccountName = ACCOUNT_MAP['Viewカード'] || 'Viewカード'
        } else {
          // デフォルト (万が一該当しない場合)
          dbAccountName = 'Oliveフレキシブルペイ(クレジット)'
        }
      }

      // --- DBから口座IDを取得 ---
      const { data: account, error: accError } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('name', dbAccountName)
        .single()

      if (!account) {
        const errorMsg = `❌ Account not found in DB: "${dbAccountName}" (GAS source: ${record.source}, card: ${record.card_name})`
        console.error(errorMsg)

        // 診断用にシステムログへ詳細を記録
        await supabase.from('system_logs').insert({
          source: 'api_webhook_gmail',
          level: 'warning',
          message: errorMsg,
          metadata: { record }
        })
        continue
      }

      // --- 重複チェック ---
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('date', record.date)
        .eq('amount', amount)
        .eq('description', description)
        .eq('from_account_id', account.id)
        .single()

      if (existing) {
        skippedCount++
        continue
      }

      // --- DB登録 ---
      const { error: insError } = await supabase.from('transactions').insert({
        date: record.date,
        amount: amount,
        description: description,
        type: type,
        from_account_id: account.id,
        status: 'pending',
        source: 'gmail_webhook'
      })

      if (insError) {
        console.error('DB Insert Error:', insError)
        await supabase.from('system_logs').insert({
          source: 'api_webhook_gmail',
          level: 'error',
          message: `Insert failed for ${description}: ${insError.message}`,
          metadata: { record, error: insError }
        })
      } else {
        savedCount++
      }
    }

    // 3. ログ記録
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