import { Box, Card, Group, Skeleton, Stack } from '@mantine/core'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { Suspense } from 'react'
import { DashboardView } from '@/components/dashboard-view'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/utils/supabase/server'

export const revalidate = 60

type DashboardRpcResponse = {
  netWorth?: number
  totalAssets?: number
  totalLiabilities?: number
  monthlyFlowData?: { month: string; income: number; expense: number }[]
  categoryRanking?: { name: string; value: number }[]
  currentMonthTotalExpense?: number
  recentTransactions?: {
    id: string
    type: 'income' | 'expense' | 'transfer'
    description: string
    date: string
    amount: number
    accounts?: { name?: string; icon_url?: string | null; card_brand?: string | null } | null
    categories?: { name?: string } | null
  }[]
}

type DashboardData = Required<DashboardRpcResponse>

function emptyDashboardData(): DashboardData {
  return {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthlyFlowData: [],
    categoryRanking: [],
    currentMonthTotalExpense: 0,
    recentTransactions: [],
  }
}

async function getDashboardDataFromTables(): Promise<DashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [accountsResult, balancesResult, currentMonthResult, recentTransactionsResult] = await Promise.all([
    supabase.from('accounts').select('id, name, icon_url, card_brand, is_liability').order('id'),
    supabase
      .from('monthly_balances')
      .select('account_id, amount, record_date')
      .order('record_date', { ascending: false })
      .limit(1000),
    supabase
      .from('transactions')
      .select(
        `
          id,
          type,
          amount,
          description,
          date,
          category_id,
          user_category_id,
          user_amount,
          user_date,
          user_description,
          user_categories:categories!user_category_id(name),
          categories!category_id(name)
        `
      )
      .eq('status', 'confirmed')
      .gte('date', monthStart.toISOString())
      .lte('date', monthEnd.toISOString())
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select(
        `
          id,
          type,
          amount,
          description,
          date,
          user_amount,
          user_date,
          user_description,
          accounts!from_account_id(name, icon_url, card_brand),
          categories!category_id(name),
          user_categories:categories!user_category_id(name)
        `
      )
      .eq('status', 'confirmed')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (balancesResult.error) throw new Error(balancesResult.error.message)
  if (currentMonthResult.error) throw new Error(currentMonthResult.error.message)
  if (recentTransactionsResult.error) throw new Error(recentTransactionsResult.error.message)

  const latestBalanceByAccount = new Map<string, number>()
  for (const balance of balancesResult.data || []) {
    if (!latestBalanceByAccount.has(balance.account_id)) {
      latestBalanceByAccount.set(balance.account_id, Number(balance.amount) || 0)
    }
  }

  let totalAssets = 0
  let totalLiabilities = 0
  for (const account of accountsResult.data || []) {
    const amount = latestBalanceByAccount.get(account.id) || 0
    if (account.is_liability) {
      totalLiabilities += amount
    } else {
      totalAssets += amount
    }
  }

  const categoryTotals = new Map<string, number>()
  let currentMonthTotalExpense = 0
  for (const transaction of currentMonthResult.data || []) {
    const amount = transaction.user_amount !== null ? Number(transaction.user_amount) : Number(transaction.amount)
    if (transaction.type !== 'expense') {
      continue
    }
    currentMonthTotalExpense += amount
    const rawCategory = transaction.user_category_id ? transaction.user_categories : transaction.categories
    const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory
    const categoryName = category?.name || '未分類'
    categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + amount)
  }

  const categoryRanking = [...categoryTotals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const recentTransactions = (recentTransactionsResult.data || []).map((transaction) => {
    const rawCategory = transaction.user_categories || transaction.categories
    const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory

    return {
      id: transaction.id,
      type: transaction.type,
      description:
        transaction.user_description !== null ? transaction.user_description : transaction.description || '取引',
      date: transaction.user_date !== null ? transaction.user_date : transaction.date,
      amount: transaction.user_amount !== null ? Number(transaction.user_amount) : Number(transaction.amount),
      accounts: Array.isArray(transaction.accounts) ? transaction.accounts[0] : transaction.accounts,
      categories: category,
    }
  })

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    monthlyFlowData: [],
    categoryRanking,
    currentMonthTotalExpense,
    recentTransactions,
  }
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const sixMonthsAgo = startOfMonth(subMonths(now, 5)).toISOString()
  const currentMonthStart = format(now, 'yyyy-MM')
  const currentMonthEnd = endOfMonth(now).toISOString()

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_start_date: sixMonthsAgo,
    p_end_date: currentMonthEnd,
    p_current_month_start: currentMonthStart,
  })

  if (!error && data) {
    const rpcData = data as DashboardRpcResponse
    return {
      netWorth: rpcData.netWorth || 0,
      totalAssets: rpcData.totalAssets || 0,
      totalLiabilities: rpcData.totalLiabilities || 0,
      monthlyFlowData: rpcData.monthlyFlowData || [],
      categoryRanking: rpcData.categoryRanking || [],
      currentMonthTotalExpense: rpcData.currentMonthTotalExpense || 0,
      recentTransactions: rpcData.recentTransactions || [],
    }
  }

  console.error('Dashboard RPC Error:', error)

  try {
    return await getDashboardDataFromTables()
  } catch (fallbackError) {
    console.error('Dashboard fallback query error:', fallbackError)
    return emptyDashboardData()
  }
}

async function DashboardContent() {
  const data = await getDashboardData()
  return <DashboardView data={data} />
}

function DashboardFallback() {
  return (
    <Stack gap="lg" className="p-5">
      <Card padding="lg" radius="lg" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Skeleton height={12} width={100} radius="xl" />
            <Skeleton height={20} width={80} radius="xl" />
          </Group>
          <Skeleton height={40} width={200} radius="md" />
          <Group grow>
            <Skeleton height={30} radius="md" />
            <Skeleton height={30} radius="md" />
          </Group>
        </Stack>
      </Card>

      <Card padding="lg" radius="lg" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Skeleton height={20} width={120} radius="md" />
            <Skeleton height={24} width={100} radius="md" />
          </Group>
          <Skeleton height={220} radius="md" />
        </Stack>
      </Card>

      <Box>
        <Skeleton height={200} radius="lg" />
      </Box>
    </Stack>
  )
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="ホーム" subtitle="家計ダッシュボード" />
      <PageContainer>
        <Suspense fallback={<DashboardFallback />}>
          <DashboardContent />
        </Suspense>
      </PageContainer>
    </>
  )
}
