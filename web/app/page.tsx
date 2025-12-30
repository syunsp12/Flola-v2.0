import { createClient } from '@/utils/supabase/server'
import { DashboardView } from '@/components/dashboard-view'

// このページがアクセスされるたびにデータを再取得するように設定
export const dynamic = 'force-dynamic'

/**
 * サーバーサイドで資産と支出のサマリーデータを取得する非同期関数
 */
async function getSummary() {
  // ★重要: まずクライアントを作成して変数に入れる
  const supabase = await createClient()

  // 1. 最新の資産残高を取得
  // 変数 'supabase' を使ってクエリを実行する
  const { data: assets } = await supabase
    .from('monthly_balances')
    .select('amount, record_date')
    .order('record_date', { ascending: false })
    .limit(100)

  // 2. 今月の支出合計を取得
  const startOfMonth = new Date()
  startOfMonth.setDate(1) // 今月の1日
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')
    .eq('status', 'confirmed')
    .gte('date', startOfMonth.toISOString())

  // 3. データを集計
  const totalAssets = assets?.reduce((sum, item) => sum + item.amount, 0) || 0
  const totalExpense = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0

  return { totalAssets, totalExpense }
}


/**
 * ダッシュボードページのメインコンポーネント (Server Component)
 */
export default async function DashboardPage() {
  // サーバーサイドでデータ取得を実行
  const { totalAssets, totalExpense } = await getSummary()

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* 取得したデータをClient Componentに渡して描画を任せる */}
      <DashboardView totalAssets={totalAssets} totalExpense={totalExpense} />
    </main>
  )
}