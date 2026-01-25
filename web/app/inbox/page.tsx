import { Suspense } from 'react'
import { getTransactions, getCategories, getAccountsWithBalance } from '@/app/actions'
import { InboxClient } from './inbox-client'
import InboxLoading from './loading'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ status?: string }>
}

async function InboxContent({ searchParams }: Props) {
  const params = await searchParams
  const status = (params.status === 'all' || params.status === 'confirmed') ? 'confirmed' : 'pending'

  // 並列でデータを取得
  const [transactions, categories, accounts] = await Promise.all([
    getTransactions({ status }),
    getCategories(),
    getAccountsWithBalance()
  ])

  return (
    <InboxClient
      initialTransactions={transactions || []}
      initialCategories={categories || []}
      initialAccounts={accounts || []}
      initialStatus={status}
    />
  )
}

export default async function InboxPage(props: Props) {
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxContent {...props} />
    </Suspense>
  )
}
