import { Suspense } from 'react'
import { Card, Stack, Text } from '@mantine/core'
import {
  getAccountsWithBalance,
  getAssetGroups,
  getCategories,
  getJobStatuses,
  getSystemLogs,
} from '@/app/actions'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { AdminClient } from './admin-client'
import AdminLoading from './loading'

export const revalidate = 30

async function AdminContent() {
  try {
    const [jobs, logs, categories, accounts, assetGroups] = await Promise.all([
      getJobStatuses(),
      getSystemLogs(),
      getCategories(),
      getAccountsWithBalance(),
      getAssetGroups(),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return (
      <>
        <PageHeader title="Admin" subtitle="Access required" />
        <PageContainer>
          <Card withBorder radius="lg" padding="lg">
            <Stack gap="xs">
              <Text fw={700}>Admin page could not be loaded.</Text>
              <Text c="dimmed" size="sm">
                {message === 'Forbidden'
                  ? 'Current account is not allowed to open this page. Check ADMIN_EMAILS or the user role metadata.'
                  : message}
              </Text>
            </Stack>
          </Card>
        </PageContainer>
      </>
    )
  }
}

export default async function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent />
    </Suspense>
  )
}
