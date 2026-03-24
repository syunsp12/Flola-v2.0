'use client'

import { useEffect, useState } from 'react'
import { Badge, Box, Button, Card, Group, Loader, Stack, Text, ThemeIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { FileText, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { getJobStatuses, triggerJob } from '@/app/actions'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { SCRAPER_JOB_CONFIGS } from '@/lib/jobs/config'

interface ToolsClientProps {
  initialJobs: Array<{ job_id: string; last_status?: string; last_run_at?: string | null }>
}

export function ToolsClient({ initialJobs }: ToolsClientProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [loadingJobs, setLoadingJobs] = useState(initialJobs.length === 0)

  const loadJobStatus = async () => {
    try {
      setLoadingJobs(true)
      const data = await getJobStatuses()
      setJobs(data || [])
    } catch (error) {
      notifications.show({
        title: 'ジョブ状態の取得に失敗しました',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました。',
        color: 'red',
      })
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    if (initialJobs.length === 0) {
      void loadJobStatus()
    }
  }, [initialJobs.length])

  const handleSync = async (jobId: string) => {
    setSyncing((prev) => ({ ...prev, [jobId]: true }))
    try {
      await triggerJob(jobId)
      notifications.show({
        title: '実行を開始しました',
        message: 'GitHub Actions のジョブを起動しました。状態が反映されるまで数秒かかります。',
        color: 'green',
      })
      setTimeout(() => {
        void loadJobStatus()
      }, 5000)
    } catch (error) {
      notifications.show({
        title: '実行に失敗しました',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました。',
        color: 'red',
      })
    } finally {
      setSyncing((prev) => ({ ...prev, [jobId]: false }))
    }
  }

  const getJob = (jobId: string) => jobs.find((job) => job.job_id === jobId)

  const getStatusBadge = (jobId: string) => {
    const job = getJob(jobId)
    if (!job) {
      return <Badge size="xs" variant="light" color="gray">未取得</Badge>
    }

    const colors: Record<string, string> = {
      success: 'green',
      failed: 'red',
      running: 'blue',
    }

    return (
      <Badge size="xs" variant="light" color={colors[job.last_status || ''] || 'gray'}>
        {job.last_status || 'idle'}
      </Badge>
    )
  }

  return (
    <>
      <PageHeader title="ツール" subtitle="運用ツールと外部同期" />
      <PageContainer>
        <Stack gap="xl">
          <Box>
            <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs" mb="xs">
              収入管理
            </Text>
            <Link href="/tools/salary" style={{ textDecoration: 'none' }}>
              <Card>
                <Group wrap="nowrap">
                  <ThemeIcon size={48} radius="md" variant="light" color="blue">
                    <FileText size={24} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700} size="lg">
                      給与明細分析
                    </Text>
                    <Text size="sm" c="dimmed">
                      給与明細 PDF を解析し、収入データとして登録します。
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </Link>
          </Box>

          <Box>
            <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs" mb="xs">
              外部同期
            </Text>
            <Stack gap="md">
              {SCRAPER_JOB_CONFIGS.map((jobConfig) => (
                <Card key={jobConfig.jobId} padding="md" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="md" style={{ flex: 1 }}>
                      <ThemeIcon size={48} radius="md" variant="light" color={jobConfig.color}>
                        <RefreshCw size={24} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Text fw={700} size="lg">
                            {jobConfig.title}
                          </Text>
                          {loadingJobs ? <Loader size="xs" /> : getStatusBadge(jobConfig.jobId)}
                        </Group>
                        <Text size="sm" c="dimmed">
                          {jobConfig.description}
                        </Text>
                        <Text size="xs" c="dimmed">
                          最終実行:{' '}
                          {getJob(jobConfig.jobId)?.last_run_at
                            ? format(new Date(getJob(jobConfig.jobId)!.last_run_at!), 'MM/dd HH:mm')
                            : '未実行'}
                        </Text>
                      </Stack>
                    </Group>
                    <Button
                      variant="filled"
                      color={jobConfig.color}
                      onClick={() => void handleSync(jobConfig.jobId)}
                      loading={syncing[jobConfig.jobId]}
                      leftSection={<RefreshCw size={14} />}
                      radius="md"
                    >
                      今すぐ同期
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      </PageContainer>
    </>
  )
}
