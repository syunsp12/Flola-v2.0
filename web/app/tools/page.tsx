import { Suspense } from 'react'
import { getJobStatuses } from '@/app/actions'
import ToolsLoading from './loading'
import { ToolsClient } from './tools-client'

export const revalidate = 30

async function ToolsContent() {
  const jobs = await getJobStatuses()

  return <ToolsClient initialJobs={jobs || []} />
}

export default async function ToolsPage() {
  return (
    <Suspense fallback={<ToolsLoading />}>
      <ToolsContent />
    </Suspense>
  )
}
