'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// --- 型定義 ---
type TransactionFilter = {
  status?: 'pending' | 'confirmed' | 'ignore' | 'all'
  startDate?: string
  endDate?: string
}

// --- 1. 取引データの取得 ---
export async function getTransactions(filter: TransactionFilter = {}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('transactions')
    .select(`
      *,
      accounts!from_account_id(name),
      categories(id, name)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }
  if (filter.startDate) {
    query = query.gte('date', filter.startDate)
  }
  if (filter.endDate) {
    query = query.lte('date', filter.endDate)
  }
  if (!filter.startDate && !filter.endDate) {
    query = query.limit(100)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// --- 2. 未承認データの取得 ---
export async function getPendingTransactions() {
  return getTransactions({ status: 'pending' })
}

export async function getPendingCount() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  
  if (error) return 0
  return count || 0
}

// --- 3. データの承認・更新 ---
export async function updateTransaction(id: string, updates: any) {
  const supabase = await createClient()
  const cleanUpdates = { ...updates, is_ai_suggested: false }

  const { error } = await supabase
    .from('transactions')
    .update(cleanUpdates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}

// --- 4. カテゴリ一覧の取得 ---
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id')
  
  if (error) return []
  return data
}

// --- 5. 口座一覧と最新残高の取得 ---
export async function getAccountsWithBalance() {
  const supabase = await createClient()
  
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('type')
    .order('id')

  if (!accounts) return []

  // 各口座の最新の残高レコードのみを取得するクエリ
  // 注意: monthly_balancesが大量にある場合、SQL側で集計するのが理想的ですが、
  // 現状の構成に合わせて確実な方法で取得します。
  const { data: latestBalances, error } = await supabase
    .from('monthly_balances')
    .select('account_id, amount, record_date')
    .order('record_date', { ascending: false })

  if (error) {
    console.error("Error fetching balances:", error)
    return accounts.map(acc => ({ ...acc, current_amount: 0, last_updated: null }))
  }

  const result = accounts.map(acc => {
    // この口座に紐づく最新（record_dateが最大）のレコードを探す
    const latest = latestBalances?.find(b => b.account_id === acc.id)
    return {
      ...acc,
      current_amount: latest ? latest.amount : 0,
      last_updated: latest ? latest.record_date : null
    }
  })

  return result
}

// --- 6. 資産残高の更新 ---
export async function updateAssetBalance(accountId: string, amount: number, date: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_balances')
    .upsert(
      { account_id: accountId, amount: amount, record_date: date },
      { onConflict: 'record_date, account_id' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/assets')
  revalidatePath('/')
  return { success: true }
}

// --- 7. ジョブ状態の取得 ---
export async function getJobStatuses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_status')
    .select('*')
    .order('job_id')

  if (error) return []
  return data
}

// --- 8. ログの取得 ---
export async function getSystemLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50)

  if (error) return []
  return data
}

// --- 9. カテゴリ操作 ---
export async function createCategory(name: string, type: 'income' | 'expense', keywords: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .insert({ name, type, keywords })
  
  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateCategory(id: number, name: string, type: 'income' | 'expense', keywords: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ name, type, keywords })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteCategory(id: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error("使用中のカテゴリは削除できません")
  revalidatePath('/inbox')
  revalidatePath('/admin')
  return { success: true }
}

// --- 10. 取引の手動作成 ---
export async function createTransaction(data: {
  date: string
  amount: number
  description: string
  category_id: number
  status?: 'confirmed' | 'pending'
}) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .insert({
      date: data.date,
      amount: data.amount,
      description: data.description,
      category_id: data.category_id,
      type: 'expense',
      status: data.status || 'confirmed',
    })

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}


// --- 11. AIカテゴリ一括適用 ---
export async function applyAiCategories(targets: { id: string, description: string | null }[]) {
  const supabase = await createClient()
  const uniqueDescriptions = Array.from(new Set(targets.map(t => t.description || "").filter(d => d)))
  if (uniqueDescriptions.length === 0) return { count: 0 }

  const suggestions: Record<string, number | null> = await predictCategories(uniqueDescriptions)
  if (!suggestions || Object.keys(suggestions).length === 0) return { count: 0 }

  let updateCount = 0
  const updates = targets.map(async (t) => {
    if (!t.description) return
    const categoryId = suggestions[t.description]
    if (categoryId) {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId, is_ai_suggested: true })
        .eq('id', t.id)
      if (!error) updateCount++
    }
  })

  await Promise.all(updates)
  revalidatePath('/inbox')
  return { success: true, count: updateCount }
}

// --- 12. 口座管理 ---
export async function createAccount(data: {
  name: string
  type: string
  is_liability: boolean
  icon_url?: string | null
  card_brand?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/assets')
  return { success: true }
}

export async function updateAccount(id: string, data: {
  name: string
  type: string
  is_liability: boolean
  icon_url?: string | null
  card_brand?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/assets')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw new Error("この口座に関連付けられた取引があるため削除できません")
  revalidatePath('/admin')
  revalidatePath('/assets')
  return { success: true }
}

// --- 13. 過去履歴取得リクエスト ---
export async function requestHistoryFetch(startDate: string, endDate: string) {
  const supabase = await createClient()

  // ユーザー情報の確認
  const { data: { user } } = await supabase.auth.getUser()
  
  // 1. DBにリクエストを保存
  const { data: requestRecord, error } = await supabase
    .from('history_fetch_requests')
    .insert({
      start_date: startDate,
      end_date: endDate,
      status: 'pending'
    })
    .select('id')
    .single()

  if (error) {
    console.error('History fetch error:', error, 'User:', user?.id)
    throw new Error(`${error.message} (User: ${user?.id ?? 'anon'})`)
  }

  // 2. GAS Web App をキックする (非同期)
  const GAS_APP_URL = process.env.GAS_APP_URL
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY

  if (GAS_APP_URL) {
    // GASの処理は時間がかかる可能性があるため、レスポンスを待たずにバックグラウンドで実行させるか、
    // タイムアウトを考慮して呼び出します。
    fetch(GAS_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: ADMIN_API_KEY,
        startDate: startDate,
        endDate: endDate,
        requestId: requestRecord.id
      }),
    }).catch(err => {
      console.error('GAS Trigger Error:', err)
    })
  } else {
    console.warn('GAS_APP_URL is not set. GAS will not be triggered automatically.')
  }

  revalidatePath('/inbox')
  return { success: true }
}

// --- 14. 外部ジョブの実行 (GitHub Actions) ---
export async function triggerJob(jobId: string) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  const REPO_OWNER = process.env.GITHUB_OWNER
  const REPO_NAME = process.env.GITHUB_REPO
  
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    throw new Error("GitHub credentials not configured.")
  }

  // ワークフローファイル名の決定
  let workflowId = ""
  if (jobId.startsWith("scraper_")) {
    workflowId = "investment_scraper.yml"
  } else {
    throw new Error(`Unknown job type: ${jobId}`)
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowId}/dispatches`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      ref: 'main',
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub API Error: ${error}`)
  }

  return { success: true }
}

// --- 15. 分析用データの取得 ---

/**
 * 資産履歴の取得 (口座種別ごとの推移)
 */
export async function getAssetHistory() {
  const supabase = await createClient()
  
  // 口座マスタを取得
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, is_liability')

  // 全ての履歴を取得
  const { data: balances, error } = await supabase
    .from('monthly_balances')
    .select('*')
    .order('record_date', { ascending: true })

  if (error) return []

  // 日付ごとに口座種別で集計
  const historyMap = new Map<string, any>()
  
  balances.forEach(b => {
    const date = b.record_date
    const acc = accounts?.find(a => a.id === b.account_id)
    if (!acc) return

    if (!historyMap.has(date)) {
      historyMap.set(date, { date, total: 0, bank: 0, pension: 0, securities: 0, wallet: 0, liability: 0 })
    }
    
    const entry = historyMap.get(date)
    const amount = b.amount

    if (acc.is_liability) {
      entry.liability += amount
      entry.total -= amount
    } else {
      entry[acc.type] = (entry[acc.type] || 0) + amount
      entry.total += amount
    }
  })

  return Array.from(historyMap.values())
}

/**
 * 給与履歴の取得
 */
export async function getSalaryHistory() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('salary_slips')
    .select('*')
    .order('date', { ascending: true })

  if (error) return []
  return data
}

// --- AI予測 (Gemini) ---
export async function predictCategories(descriptions: string[]): Promise<Record<string, number | null>> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return {}

  const categories = await getCategories()
  if (!categories || categories.length === 0) return {}

  const catText = categories.map((c: any) => 
    `ID:${c.id}, Name:${c.name}, Keywords:${c.keywords?.join(',')}`
  ).join('\n')

  const prompt = `
    あなたは家計簿のAIアシスタントです。
    以下の「カテゴリリスト」に基づき、「対象の摘要」に適切な「カテゴリID」を推測してください。
    
    # カテゴリリスト
    ${catText}
    
    # 対象の摘要
    ${JSON.stringify(descriptions)}
    
    # 制約
    出力は以下のJSONフォーマットのみ。Markdown不要。確信がなければID: null。
    {"SUKIYA": 2, "AMAZON": 5}
  `

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch (e) {
    console.error("AI Error:", e)
    return {}
  }
}