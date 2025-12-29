'use client'

import { useEffect, useState } from 'react'
import { getJobStatuses, getSystemLogs } from '@/app/actions'
import { Card, CardBody, Button, Chip, Tabs, Tab, ScrollShadow, Spinner } from "@nextui-org/react"
import { Activity, FileText, RefreshCw, Server, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from "sonner"

export default function AdminPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [jobsData, logsData] = await Promise.all([
      getJobStatuses(),
      getSystemLogs()
    ])
    setJobs(jobsData || [])
    setLogs(logsData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // ステータスに応じたアイコンと色
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'success': return { icon: <CheckCircle2 className="w-4 h-4" />, color: "success" as const }
      case 'failed': return { icon: <AlertCircle className="w-4 h-4" />, color: "danger" as const }
      case 'running': return { icon: <Activity className="w-4 h-4 animate-pulse" />, color: "primary" as const }
      default: return { icon: <Clock className="w-4 h-4" />, color: "default" as const }
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-divider px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Admin</h1>
        <Button size="sm" variant="light" isIconOnly onPress={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 max-w-md mx-auto">
        <Tabs aria-label="Admin Options" className="w-full" fullWidth>
          
          {/* --- ジョブ監視タブ --- */}
          <Tab key="jobs" title={
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Jobs</span>
            </div>
          }>
            <div className="space-y-3 mt-4">
              {loading ? <div className="flex justify-center py-10"><Spinner /></div> : 
               jobs.length === 0 ? <p className="text-center text-default-500 py-10">No jobs recorded.</p> :
               jobs.map((job) => {
                 const { icon, color } = getStatusInfo(job.last_status)
                 return (
                   <Card key={job.job_id} className="border border-divider shadow-sm">
                     <CardBody className="p-4">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-col">
                           <span className="font-bold text-medium">{job.job_id}</span>
                           <span className="text-tiny text-default-400">Last Run</span>
                         </div>
                         <Chip startContent={icon} color={color} size="sm" variant="flat" className="capitalize">
                           {job.last_status}
                         </Chip>
                       </div>
                       <div className="flex justify-between items-end">
                         <span className="text-small font-mono text-default-600">
                           {job.last_run_at ? format(new Date(job.last_run_at), 'MM/dd HH:mm') : 'Never'}
                         </span>
                         {/* 将来的にここに「実行」ボタンを配置 */}
                         {/* <Button size="sm" variant="ghost">Run Now</Button> */}
                       </div>
                       {job.message && (
                         <div className="mt-3 p-2 bg-default-100 rounded-md text-tiny font-mono text-default-600 truncate">
                           {job.message}
                         </div>
                       )}
                     </CardBody>
                   </Card>
                 )
               })
              }
            </div>
          </Tab>

          {/* --- ログ閲覧タブ --- */}
          <Tab key="logs" title={
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Logs</span>
            </div>
          }>
            <ScrollShadow className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-2 pb-20">
                {loading ? <div className="flex justify-center py-10"><Spinner /></div> :
                 logs.length === 0 ? <p className="text-center text-default-500 py-10">No logs found.</p> :
                 logs.map((log) => (
                   <div key={log.id} className="flex gap-3 p-3 border-b border-divider last:border-none">
                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                       log.level === 'error' ? 'bg-danger' : 
                       log.level === 'warning' ? 'bg-warning' : 'bg-primary'
                     }`} />
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-tiny font-bold text-default-600">{log.source}</span>
                         <span className="text-[10px] text-default-400 font-mono">
                           {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                         </span>
                       </div>
                       <p className="text-small text-foreground break-words leading-snug">
                         {log.message}
                       </p>
                     </div>
                   </div>
                 ))
                }
              </div>
            </ScrollShadow>
          </Tab>
        </Tabs>
      </div>
    </main>
  )
}