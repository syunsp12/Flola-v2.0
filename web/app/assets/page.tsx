import { Suspense } from 'react'
import { getAccountsWithBalance, getAssetGroups } from '@/app/actions'
import AssetsLoading from './loading'
import { AssetsClient } from './assets-client'

export const revalidate = 60

async function AssetsContent() {
  const [accounts, assetGroups] = await Promise.all([
    getAccountsWithBalance(),
    getAssetGroups()
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

