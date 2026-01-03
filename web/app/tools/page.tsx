'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, Text, Group, ThemeIcon, Stack, Button, Loader, Badge, Box } from "@mantine/core"
import { FileText, TrendingUp, Building2, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { triggerJob, getJobStatuses } from '@/app/actions'
import { notifications } from '@mantine/notifications'
import { format } from 'date-fns'

export default function ToolsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  const loadJobStatus = async () => {
    const data = await getJobStatuses()
    setJobs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadJobStatus()
  }, [])

  const handleSync = async (jobId: string) => {
    setSyncing(prev => ({ ...prev, [jobId]: true }))
    try {
      await triggerJob(jobId)
      notifications.show({
        title: '同期リクエスト送信済',
        message: 'GitHub Actionsを起動しました。反映まで数分かかります。',
        color: 'green'
      })
      // 状態を定期的に更新するために少し待機
      setTimeout(loadJobStatus, 5000)
    } catch (e: any) {
      notifications.show({ title: 'エラー', message: e.message, color: 'red' })
    } finally {
      setSyncing(prev => ({ ...prev, [jobId]: false }))
    }
  }

  const getJob = (jobId: string) => jobs.find(j => j.job_id === jobId)

  const getStatusBadge = (jobId: string) => {
    const job = getJob(jobId)
    if (!job) return null
    
    const colors: Record<string, string> = { 'success': 'green', 'failed': 'red', 'running': 'blue' }
    return (
      <Badge size="xs" variant="light" color={colors[job.last_status] || 'gray'}>
        {job.last_status}
      </Badge>
    )
  }

  return (
    <>
      <PageHeader title="Tools" />
      <PageContainer>
        <Stack gap="xl">
          {/* 1. 給与明細分析 */}
          <Box>
            <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs" mb="xs">Income Management</Text>
            <Link href="/tools/salary" style={{ textDecoration: 'none' }}>
              <Card padding="md" radius="md" withBorder>
                <Group wrap="nowrap">
                  <ThemeIcon size={48} radius="md" variant="light" color="blue">
                    <FileText size={24} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700} size="lg">給与明細分析</Text>
                    <Text size="sm" c="dimmed">PDFをアップロードして収入項目を自動抽出</Text>
                  </Stack>
                </Group>
              </Card>
            </Link>
          </Box>

          {/* 2. 外部資産同期 */}
          <Box>
            <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs" mb="xs">External Asset Sync</Text>
            <Stack gap="sm">
              {/* DC年金 */}
              <Card padding="md" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <ThemeIcon size={48} radius="md" variant="light" color="indigo">
                      <Building2 size={24} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={700} size="lg">DC年金 同期</Text>
                        {getStatusBadge('scraper_dc')}
                      </Group>
                      <Text size="xs" c="dimmed">
                        最終同期: {getJob('scraper_dc')?.last_run_at ? format(new Date(getJob('scraper_dc').last_run_at), 'MM/dd HH:mm') : '未実行'}
                      </Text>
                    </Stack>
                  </Group>
                  <Button 
                    variant="light" 
                    onClick={() => handleSync('scraper_dc')}
                    loading={syncing['scraper_dc']}
                    leftSection={<RefreshCw size={14} />}
                  >
                    同期
                  </Button>
                </Group>
              </Card>

              {/* 野村持株会 */}
              <Card padding="md" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <ThemeIcon size={48} radius="md" variant="light" color="teal">
                      <TrendingUp size={24} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={700} size="lg">野村持株会 同期</Text>
                        {getStatusBadge('scraper_nomura')}
                      </Group>
                      <Text size="xs" c="dimmed">
                        最終同期: {getJob('scraper_nomura')?.last_run_at ? format(new Date(getJob('scraper_nomura').last_run_at), 'MM/dd HH:mm') : '未実行'}
                      </Text>
                    </Stack>
                  </Group>
                  <Button 
                    variant="light" 
                    color="teal"
                    onClick={() => handleSync('scraper_nomura')}
                    loading={syncing['scraper_nomura']}
                    leftSection={<RefreshCw size={14} />}
                  >
                    同期
                  </Button>
                </Group>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </PageContainer>
    </>
  )
}