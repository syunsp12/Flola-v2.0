import { Suspense } from 'react'
import { getAccountsWithBalance, getAssetGroups } from '@/app/actions'
import { AssetsClient } from './assets-client'
import AssetsLoading from './loading'

export const revalidate = 60

async function AssetsContent() {
  const [accounts, assetGroups] = await Promise.all([
    getAccountsWithBalance(),
    getAssetGroups(),
  ])

  return (
    <AssetsClient
      initialAccounts={accounts || []}
      initialAssetGroups={assetGroups || []}
    />
  )
}

export default async function AssetsPage() {
  return (
    <Suspense fallback={<AssetsLoading />}>
      <AssetsContent />
    </Suspense>
  )
}
