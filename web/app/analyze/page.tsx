import { Suspense } from 'react'
import { getAssetHistory, getSalaryHistory, getAccountsWithBalance, getAssetGroups } from '@/app/actions'
import { AnalyzeClient } from './analyze-client'
import AnalyzeLoading from './loading'

export const revalidate = 300 // 5分キャッシュ

async function AnalyzeContent() {
  const [accounts, assetHistory, salaryHistory, assetGroups] = await Promise.all([
    getAccountsWithBalance(),
    getAssetHistory(),
    getSalaryHistory(),
    getAssetGroups()
  ])

  return (
    <AnalyzeClient
      initialAccounts={accounts || []}
      initialAssetHistory={assetHistory || []}
      initialSalaryHistory={salaryHistory || []}
      initialAssetGroups={assetGroups || []}
    />
  )
}

export default async function AnalyzePage() {
  return (
    <Suspense fallback={<AnalyzeLoading />}>
      <AnalyzeContent />
    </Suspense>
  )
}