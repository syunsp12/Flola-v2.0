import { Suspense } from 'react'
import {
  getJobStatuses,
  getSystemLogs,
  getCategories,
  getAccountsWithBalance,
  getAssetGroups
} from '@/app/actions'
import { AdminClient } from './admin-client'
import AdminLoading from './loading'

export const revalidate = 30

async function AdminContent() {
  const [jobs, logs, categories, accounts, assetGroups] = await Promise.all([
    getJobStatuses(),
    getSystemLogs(),
    getCategories(),
    getAccountsWithBalance(),
    getAssetGroups()
  ])

  return (
    <AdminClient
      initialJobs={jobs || []}
      initialLogs={logs || []}
      initialCategories={categories || []}
      initialAccounts={accounts || []}
      initialAssetGroups={assetGroups || []}
    />
  )
}

export default async function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent />
    </Suspense>
  )
}
