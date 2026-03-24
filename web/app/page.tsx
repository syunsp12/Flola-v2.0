import { createClient } from '@/utils/supabase/server'
import { DashboardView } from '@/components/dashboard-view'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

export const revalidate = 60 // 60秒キャッシュ

async function getDashboardData() {
  const supabase = await createClient()
  const now = new Date()

  // 集計済みデータをRPCで取得 (大幅な高速化)
  // パラメータ:
  // 1. 集計開始日 (6ヶ月前)
  // 2. 集計終了日 (今月末)
  // 3. 今月の開始日 (カテゴリランキング用)
  const sixMonthsAgo = startOfMonth(subMonths(now, 5)).toISOString()
  const currentMonthStart = format(now, 'yyyy-MM')
  const currentMonthEnd = endOfMonth(now).toISOString()

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_start_date: sixMonthsAgo,
    p_end_date: currentMonthEnd,
    p_current_month_start: currentMonthStart
  })

  if (error) {
    console.error("Dashboard RPC Error:", error)
    return {
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      monthlyFlowData: [],
      categoryRanking: [],
      currentMonthTotalExpense: 0,
      recentTransactions: []
    }
  }

  return {
    netWorth: data.netWorth || 0,
    totalAssets: data.totalAssets || 0,
    totalLiabilities: data.totalLiabilities || 0,
    monthlyFlowData: data.monthlyFlowData || [],
    categoryRanking: data.categoryRanking || [],
    currentMonthTotalExpense: data.currentMonthTotalExpense || 0,
    recentTransactions: data.recentTransactions || []
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