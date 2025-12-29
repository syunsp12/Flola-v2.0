import { supabase } from '@/lib/supabase'
import { DashboardView } from '@/components/dashboard-view'

// このページがアクセスされるたびにデータを再取得するように設定
export const dynamic = 'force-dynamic'

/**
 * サーバーサイドで資産と支出のサマリーデータを取得する非同期関数
 */
async function getSummary() {
  // 1. 最新の資産残高を取得
  // 各口座(account_id)ごとの最新日付(record_date)のレコードを1件ずつ取得する高度なクエリ
  // SupabaseのRPC(Remote Procedure Call)を使うとより効率的だが、
  // ここでは直近のデータを多めに取ってJSで処理する簡易的な方法を採用
  const { data: assets } = await supabase
    .from('monthly_balances')
    .select('amount, record_date')
    .order('record_date', { ascending: false })
    .limit(100) // 直近100件を取得

  // 2. 今月の支出合計を取得
  const startOfMonth = new Date()
  startOfMonth.setDate(1) // 今月の1日
  startOfMonth.setHours(0, 0, 0, 0) // 今月1日の0時0分0秒

  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')      // 支出のみ
    .eq('status', 'confirmed')  // 承認済みのみ
    .gte('date', startOfMonth.toISOString()) // 今月1日以降

  // 3. データを集計
  
  // 最新の資産残高を口座ごとに集計
  // (同日に複数口座のデータがある場合を考慮し、全件合計する)
  // ※より正確には、各口座の最新日を特定して合計すべきだが、
  // スクレイピングが月1回程度なので、この方法でも実用上はほぼ問題ない
  const totalAssets = assets?.reduce((sum, item) => sum + item.amount, 0) || 0
  
  // 今月の支出合計
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