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

  // ユーザーの修正値を優先して適用
  const mappedData = (data || []).map(t => ({
    ...t,
    amount: t.user_amount !== null ? Number(t.user_amount) : t.amount,
    date: t.user_date !== null ? t.user_date : t.date,
    description: t.user_description !== null ? t.user_description : t.description,
    category_id: t.user_category_id !== null ? t.user_category_id : t.category_id,
    from_account_id: t.user_from_account_id !== null ? t.user_from_account_id : t.from_account_id,
    to_account_id: t.user_to_account_id !== null ? t.user_to_account_id : t.to_account_id,
  }))

  return mappedData
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
  
  // ユーザーの変更した情報を保持するためのマッピング
  const mappedUpdates: any = { 
    is_ai_suggested: false,
    status: updates.status
  }
  
  if (updates.amount !== undefined) mappedUpdates.user_amount = updates.amount
  if (updates.date !== undefined) mappedUpdates.user_date = updates.date
  if (updates.description !== undefined) mappedUpdates.user_description = updates.description
  if (updates.category_id !== undefined) mappedUpdates.user_category_id = updates.category_id
  if (updates.from_account_id !== undefined) mappedUpdates.user_from_account_id = updates.from_account_id
  if (updates.to_account_id !== undefined) mappedUpdates.user_to_account_id = updates.to_account_id

  const { error } = await supabase
    .from('transactions')
    .update(mappedUpdates)
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
    .select(`
      *,
      asset_groups (id, name, color)
    `)
    .order('type')
    .order('id')

  if (!accounts) return []

  // 各口座の最新の残高レコードのみを取得するクエリ
  const { data: latestBalances, error } = await supabase
    .from('monthly_balances')
    .select('account_id, amount, record_date')
    .order('record_date', { ascending: false })

  if (error) {
    console.error("Error fetching balances:", error)
    return accounts.map(acc => ({ ...acc, current_amount: 0, last_updated: null }))
  }

  const result = accounts.map(acc => {
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
  from_account_id: string
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
      from_account_id: data.from_account_id,
      status: data.status || 'confirmed',
    })

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/')
  return { success: true }
}

export async function revertTransactionStatus(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'pending' })
    .eq('id', id)

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
        .update({ user_category_id: categoryId, is_ai_suggested: true })
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
 * 資産グループマスタの取得
 */
export async function getAssetGroups() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('asset_groups')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (error) return []
  return data
}

/**
 * 資産グループの作成
 */
export async function createAssetGroup(data: { id: string, name: string, color: string, sort_order: number }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('asset_groups')
    .insert(data)
  
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/analyze')
  return { success: true }
}

/**
 * 資産グループの更新
 */
export async function updateAssetGroup(id: string, updates: { name: string, color: string, sort_order: number }) {
  const supabase = await createClient()
  
  // IDは更新せず、表示上の属性のみを更新する
  const { error } = await supabase
    .from('asset_groups')
    .update({
      name: updates.name,
      color: updates.color,
      sort_order: updates.sort_order
    })
    .eq('id', id)
  
  if (error) {
    console.error("Asset Group update error:", error)
    throw new Error(error.message)
  }
  
  revalidatePath('/admin')
  revalidatePath('/analyze')
  revalidatePath('/assets')
  return { success: true }
}

/**
 * 資産グループの削除
 */
export async function deleteAssetGroup(id: string) {
  const supabase = await createClient()
  
  // 使用中の口座があるかチェック
  const { count } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('type', id)

  if (count && count > 0) {
    throw new Error("このグループを使用している口座があるため削除できません")
  }

  const { error } = await supabase
    .from('asset_groups')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/analyze')
  return { success: true }
}

/**

 * 資産履歴の取得 (月次のスナップショット - マスタ連動版)

 */

export async function getAssetHistory() {

  const supabase = await createClient()

  

  // 1. マスタと口座情報を取得

  const [groups, accountsResult] = await Promise.all([

    getAssetGroups(),

    supabase.from('accounts').select('id, name, type, is_liability')

  ])



  const accounts = accountsResult.data || []

  if (accounts.length === 0) return []



  // 2. 全ての履歴を取得

  const { data: balances, error } = await supabase

    .from('monthly_balances')

    .select('*')

    .order('record_date', { ascending: true })



  if (error || !balances || balances.length === 0) return []



  // 3. 月リストの作成

  const months = Array.from(new Set(balances.map(b => b.record_date.substring(0, 7)))).sort()

  

  // 各口座の「最新状態」を保持するMap

  const latestBalances = new Map<string, number>()

  const latestInvested = new Map<string, number>()

  

  const history = months.map(month => {

    // その月の更新データを反映

    const balancesInMonth = balances.filter(b => b.record_date.startsWith(month))

    balancesInMonth.forEach(b => {

      latestBalances.set(b.account_id, Number(b.amount) || 0)

      if (b.invested_amount !== null) {

        latestInvested.set(b.account_id, Number(b.invested_amount) || 0)

      }

    })



    // データの初期化 (マスタに存在する全グループのキーを確実に作成)

    const entry: any = { 

      date: `${month}-01`, 

      total: 0, 

      total_invested: 0, 

      liability: 0 

    }

    

    // グループIDの取得

    const groupIds = groups.length > 0 ? groups.map((g: any) => g.id) : ['bank', 'securities', 'pension', 'point', 'wallet']

    groupIds.forEach((id: string) => { 

      entry[id] = 0 

      entry[`${id}_invested`] = 0 

    })



        // 全口座の「現時点の最新値」を集計



        latestBalances.forEach((amount, accId) => {



          const acc = accounts.find(a => a.id === accId)



          if (!acc) return



    



          const invested = Number(latestInvested.get(accId)) || 0



          const currentAmount = Number(amount) || 0



    



          if (acc.is_liability) {



            entry.liability += currentAmount



            entry.total -= currentAmount



          } else {



            const typeKey = acc.type



            if (entry.hasOwnProperty(typeKey)) {



              entry[typeKey] = Number(entry[typeKey] + currentAmount)



              entry[`${typeKey}_invested`] = Number(entry[`${typeKey}_invested`] + invested)



            } else {



              const fallback = groupIds.includes('wallet') ? 'wallet' : groupIds[groupIds.length - 1]



              entry[fallback] = Number((entry[fallback] || 0) + currentAmount)



              entry[`${fallback}_invested`] = Number((entry[`${fallback}_invested`] || 0) + invested)



            }



            entry.total = Number(entry.total + currentAmount)



            entry.total_invested = Number(entry.total_invested + invested)



          }



        })



        return entry



      })



  return history

}

import { exec } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'

/**
 * 給与履歴の取得 (リレーションとJSON解析を強化した完全版)
 */
export async function getSalaryHistory() {
  const supabase = await createClient()
  
  // 1. transactions と結合して取得 (dateを取得するため)
  const { data, error } = await supabase
    .from('salary_slips')
    .select(`
      *,
      transactions!inner (
        date,
        amount,
        user_date,
        user_amount
      )
    `)
    .order('transactions(date)', { ascending: true })

  if (error) {
    console.error("Salary history error:", error)
    return []
  }

  return (data || []).map(s => {
    // ユーザー修正値を優先
    const effectiveDate = s.transactions?.user_date || s.transactions?.date || '2024-01-01'
    const effectiveAmount = s.transactions?.user_amount !== null ? Number(s.transactions?.user_amount) : Number(s.transactions?.amount)

    // detailsが文字列ならパース、オブジェクトならそのまま
    const d = typeof s.details === 'string' ? JSON.parse(s.details) : (s.details || {})
    
    // 数値抽出ヘルパー (カンマ除去と数値変換)
    const num = (key: string) => {
      const val = d[key]
      if (val === undefined || val === null) return 0
      if (typeof val === 'string') return Number(val.replace(/[^0-9.-]/g, '')) || 0
      return Number(val) || 0
    }

    // --- インテリジェント・マッピング ---
    // カラムの値があれば使い、なければJSONから特定キーワードを探す
    
    // 1. 基本給 (本給)
    const base = Number(s.base_pay) || num('本給') || num('基本給')
    
    // 2. 残業代 (時間外勤務手当)
    const overtime = Number(s.overtime_pay) || num('時間外勤務手当') || num('残業手当') || num('時間外手当')
    
    // 3. 税金 (所得税 + 住民税)
    const tax = Number(s.tax_total) || (num('所得税') + num('住民税'))
    
    // 4. 社会保険 (健康 + 厚生年金 + 雇用)
    const insurance = Number(s.insurance_total) || (num('健康保険料') + num('厚生年金保険料') + num('雇用保険料'))
    
    // 5. 額面 (支給金合計)
    const gross = num('支給金合計') || (base + overtime + num('通勤手当'))
    
    // 6. 手取り (差引支給金 または 銀行振込)
    const net = Number(s.net_pay) || num('差引支給金') || num('銀行振込(一般)') || effectiveAmount

    // 賞与判定 (ファイル名 'SYO' または トランザクション名 '賞与')
    const isBonus = (s.image_path && s.image_path.includes('SYO')) || 
                    (s.transactions?.description && s.transactions.description.includes('賞与')) ||
                    false

    // 持株会積立の合算 (通常 + 賞与時の項目)
    const stockSavings = num('持株会積立') + num('持株会定額積立金')

    return {
      ...s,
      date: effectiveDate, // 正しい支給日
      base_pay: base,
      overtime_pay: overtime,
      tax: tax,
      social_insurance: insurance,
      net_pay: net,
      gross_pay: gross,
      stock_savings: stockSavings,
      allowances: Math.max(0, gross - base - overtime),
      is_bonus: isBonus
    }
  })
}

/**
 * 給与PDFの解析 (Pythonスクリプトの呼び出し)
 */
export async function analyzePayrollPdf(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // 一時ファイルとして保存
  const tempPath = path.join(tmpdir(), `payroll_${Date.now()}.pdf`)
  await writeFile(tempPath, buffer)

  // Pythonスクリプトの実行パス (.venvを使用)
  const pythonPath = path.join(process.cwd(), '..', '.venv', 'Scripts', 'python.exe')
  const scriptPath = path.join(process.cwd(), '..', 'collectors', 'payroll_parser.py')

  return new Promise((resolve, reject) => {
    exec(`"${pythonPath}" "${scriptPath}" "${tempPath}"`, async (error, stdout, stderr) => {
      // 処理が終わったら一時ファイルを削除
      await unlink(tempPath).catch(console.error)

      if (error) {
        console.error('Python Error:', stderr)
        return reject(new Error('PDFの解析に失敗しました'))
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch (e) {
        reject(new Error('解析結果の読み取りに失敗しました'))
      }
    })
  })
}

/**
 * 給与明細データの保存
 */
export async function saveSalarySlip(data: {
  date: string,
  base_pay: number,
  overtime_pay: number,
  tax: number,
  social_insurance: number,
  net_pay: number,
  to_account_id: string, // 追加: 入金先口座
  details: any
}) {
  const supabase = await createClient()
  
  // 1. まず給与振込として transactions テーブルに記録 (親レコード)
  const { data: trans, error: transError } = await supabase
    .from('transactions')
    .insert({
      date: data.date,
      amount: data.net_pay,
      type: 'income',
      to_account_id: data.to_account_id, // 指定
      description: '給与振込 (解析データ)',
      status: 'confirmed',
      source: 'salary'
    })
    .select()
    .single()

  if (transError) throw new Error(`Transaction error: ${transError.message}`)

  // 2. salary_slips テーブルに詳細を保存 (子レコード)
  const { error: slipError } = await supabase
    .from('salary_slips')
    .insert({
      transaction_id: trans.id,
      base_pay: data.base_pay,
      overtime_pay: data.overtime_pay,
      tax: data.tax,
      social_insurance: data.social_insurance,
      net_pay: data.net_pay, // スキーマにある場合
      date: data.date,       // スキーマにある場合
      details: data.details
    })

  if (slipError) {
    // 失敗した場合は一部のカラムを削ってリトライ (互換性のため)
    console.warn('Salary slip full insert failed, retrying with minimal fields...', slipError.message)
    await supabase.from('salary_slips').insert({
      transaction_id: trans.id,
      base_pay: data.base_pay,
      overtime_pay: data.overtime_pay,
      details: data.details
    })
  }

  revalidatePath('/analyze')
  revalidatePath('/assets')
  return { success: true }
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
