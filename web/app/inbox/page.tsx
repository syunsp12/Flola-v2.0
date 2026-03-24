import { Suspense } from 'react'
import { getAccountsWithBalance, getCategories, getTransactionsPage } from '@/app/actions'
import { InboxClient } from './inbox-client'
import InboxLoading from './loading'

export const revalidate = 0

type Props = {
  searchParams: Promise<{ status?: string }>
}

async function InboxContent({ searchParams }: Props) {
  const params = await searchParams
  const status = params.status === 'all' || params.status === 'confirmed' ? 'confirmed' : 'pending'
  const pageSize = 20

  const [transactionsPage, categories, accounts] = await Promise.all([
    getTransactionsPage({ status, limit: pageSize, offset: 0 }),
    getCategories(),
    getAccountsWithBalance(),
  ])

  return (
    <InboxClient
      initialTransactions={transactionsPage.items || []}
      initialCategories={categories || []}
      initialAccounts={accounts || []}
      initialStatus={status}
      initialHasMore={transactionsPage.hasMore}
      pageSize={pageSize}
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
