import { createClient } from '@/utils/supabase/server'
import { DashboardView } from '@/components/dashboard-view'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()
  const now = new Date()

  // 1. 純資産 (Net Worth) の計算
  // 最新の口座残高を取得
  const { data: accounts } = await supabase.from('accounts').select('id, type, is_liability')
  const { data: balances } = await supabase
    .from('monthly_balances')
    .select('account_id, amount, record_date')
    .order('record_date', { ascending: false })
    .limit(100) // 直近のデータのみ

  // 口座ごとの最新残高を抽出
  const latestBalances = new Map()
  balances?.forEach(b => {
    if (!latestBalances.has(b.account_id)) {
      latestBalances.set(b.account_id, b.amount)
    }
  })

  let totalAssets = 0
  let totalLiabilities = 0

  accounts?.forEach(acc => {
    const amount = latestBalances.get(acc.id) || 0
    if (acc.is_liability) {
      totalLiabilities += amount
    } else {
      totalAssets += amount
    }
  })
  const netWorth = totalAssets - totalLiabilities

  // 2. 収支トレンド (過去6ヶ月)
  const sixMonthsAgo = startOfMonth(subMonths(now, 5)).toISOString()
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, amount, type, date, category_id, description, 
      categories(name),
      accounts!from_account_id(name, icon_url, card_brand)
    `)
    .eq('status', 'confirmed')
    .gte('date', sixMonthsAgo)
    .order('date', { ascending: true })

  const monthlyFlow = new Map<string, { income: number, expense: number }>()
  
  // 初期化 (データがない月も表示するため)
  for (let i = 5; i >= 0; i--) {
    const monthKey = format(subMonths(now, i), 'yyyy-MM')
    monthlyFlow.set(monthKey, { income: 0, expense: 0 })
  }

  transactions?.forEach(t => {
    const monthKey = format(new Date(t.date), 'yyyy-MM')
    if (monthlyFlow.has(monthKey)) {
      const current = monthlyFlow.get(monthKey)!
      if (t.type === 'income') current.income += t.amount
      else if (t.type === 'expense') current.expense += t.amount
    }
  })

  const monthlyFlowData = Array.from(monthlyFlow.entries()).map(([month, data]) => ({
    month: format(new Date(month + "-01"), 'M月'),
    ...data
  }))

  // 3. 今月のカテゴリ別支出
  const currentMonthKey = format(now, 'yyyy-MM')
  const currentMonthExpenses = transactions?.filter(t => 
    t.type === 'expense' && format(new Date(t.date), 'yyyy-MM') === currentMonthKey
  ) || []

  const categoryMap = new Map<string, number>()
  let currentMonthTotalExpense = 0

  currentMonthExpenses.forEach(t => {
    const categoryData: any = Array.isArray(t.categories) ? t.categories[0] : t.categories
    const catName = categoryData?.name || '未分類'
    const current = categoryMap.get(catName) || 0
    categoryMap.set(catName, current + t.amount)
    currentMonthTotalExpense += t.amount
  })

  const categoryRanking = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5

  // 4. 最近の取引 (5件)
  const recentTransactions = transactions ? [...transactions].reverse().slice(0, 5) : []

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    monthlyFlowData,
    categoryRanking,
    currentMonthTotalExpense,
    recentTransactions
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Financial Overview" />
      <PageContainer>
        <DashboardView data={data} />
      </PageContainer>
    </>
  )
}