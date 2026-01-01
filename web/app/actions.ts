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
  const supabase = await createClient() // ★クライアント生成
  
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

// --- 2. 未承認データの取得 (旧互換用) ---
export async function getPendingTransactions() {
  return getTransactions({ status: 'pending' })
}

// --- 3. データの承認・更新 ---
export async function updateTransaction(id: string, updates: any) {
  const supabase = await createClient() // ★クライアント生成
  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}

// --- 4. カテゴリ一覧の取得 ---
export async function getCategories() {
  const supabase = await createClient() // ★クライアント生成
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id')
  
  if (error) return []
  return data
}

// --- 5. 口座一覧と最新残高の取得 ---
export async function getAccountsWithBalance() {
  const supabase = await createClient() // ★クライアント生成
  
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('type')
    .order('id')

  if (!accounts) return []

  const { data: balances } = await supabase
    .from('monthly_balances')
    .select('account_id, amount, record_date')
    .order('record_date', { ascending: false })
    .limit(100)

  const result = accounts.map(acc => {
    const latestBalance = balances?.find(b => b.account_id === acc.id)
    return {
      ...acc,
      current_amount: latestBalance ? latestBalance.amount : 0,
      last_updated: latestBalance ? latestBalance.record_date : null
    }
  })

  return result
}

// --- 6. 資産残高の更新 ---
export async function updateAssetBalance(accountId: string, amount: number, date: string) {
  const supabase = await createClient() // ★クライアント生成
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
  const supabase = await createClient() // ★クライアント生成
  const { data, error } = await supabase
    .from('job_status')
    .select('*')
    .order('job_id')

  if (error) return []
  return data
}

// --- 8. ログの取得 ---
export async function getSystemLogs() {
  const supabase = await createClient() // ★クライアント生成
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
  const supabase = await createClient() // ★クライアント生成
  const { error } = await supabase
    .from('categories')
    .insert({ name, type, keywords })
  
  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateCategory(id: number, name: string, type: 'income' | 'expense', keywords: string[]) {
  const supabase = await createClient() // ★クライアント生成
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
  const supabase = await createClient() // ★クライアント生成
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
      type: 'expense', // デフォルトは支出
      status: data.status || 'confirmed',
      // account_id は一旦null (または手動入力用のダミー口座があればそれを指定)
    })

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}

// --- AI予測 (ここだけDBを使わないが、カテゴリ取得のために必要) ---
export async function predictCategories(descriptions: string[]) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return {}

  // サーバーアクション内でカテゴリ取得
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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch (e) {
    console.error("AI Error:", e)
    return {}
  }
}