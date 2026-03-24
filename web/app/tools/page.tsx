import { ToolsClient } from './tools-client'

export const revalidate = 30

export default function ToolsPage() {
  return <ToolsClient initialJobs={[]} />
}
