'use client'

import { useMemo, useState } from 'react'
import {
  createAssetGroup,
  createCategory,
  deleteAssetGroup,
  deleteCategory,
  getAccountsWithBalance,
  getAssetGroups,
  getCategories,
  getJobStatuses,
  getSystemLogs,
  triggerJob,
  updateAssetGroup,
  updateCategory,
} from '@/app/actions'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  NumberInput as MantineNumberInput,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  Activity,
  Bell,
  Clock,
  FileText,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Sun,
  Tag,
  Trash2,
  User,
  Wrench,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { JobStatus, SystemLog } from '@/types/ui'

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  keywords: string[] | null
}

type AssetGroup = {
  id: string
  name: string
  color: string
  sort_order: number
}

type JobWithMessage = JobStatus & {
  message?: string | null
  last_status: JobStatus['last_status'] | 'running'
}

interface AdminClientProps {
  initialJobs: JobWithMessage[]
  initialLogs: SystemLog[]
  initialCategories: Category[]
  initialAccounts: unknown[]
  initialAssetGroups: AssetGroup[]
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

function getJobBadgeColor(status: string) {
  if (status === 'success') return 'green'
  if (status === 'failed') return 'red'
  if (status === 'running') return 'blue'
  return 'gray'
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs">
      {title}
    </Text>
  )
}

export function AdminClient({
  initialJobs,
  initialLogs,
  initialCategories,
  initialAccounts: _initialAccounts,
  initialAssetGroups,
}: AdminClientProps) {
  const [jobs, setJobs] = useState<JobWithMessage[]>(initialJobs)
  const [logs, setLogs] = useState<SystemLog[]>(initialLogs)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>(initialAssetGroups)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string | null>('categories')
  const [categoryView, setCategoryView] = useState<'transactions' | 'assets'>('transactions')
  const [systemTab, setSystemTab] = useState<'jobs' | 'logs'>('jobs')
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [pushEnabled, setPushEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

  const [categoryModalOpened, { open: openCategoryModal, close: closeCategoryModal }] = useDisclosure(false)
  const [assetGroupModalOpened, { open: openAssetGroupModal, close: closeAssetGroupModal }] = useDisclosure(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catKeywords, setCatKeywords] = useState('')

  const [editingAssetGroup, setEditingAssetGroup] = useState<AssetGroup | null>(null)
  const [assetGroupId, setAssetGroupId] = useState('')
  const [assetGroupName, setAssetGroupName] = useState('')
  const [assetGroupColor, setAssetGroupColor] = useState('#4E82EE')
  const [assetGroupOrder, setAssetGroupOrder] = useState(0)

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logs]
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const [jobsData, logsData, categoriesData, assetGroupsData] = await Promise.all([
        getJobStatuses(),
        getSystemLogs(),
        getCategories(),
        getAssetGroups(),
        getAccountsWithBalance(),
      ])
      setJobs((jobsData || []) as JobWithMessage[])
      setLogs((logsData || []) as SystemLog[])
      setCategories(categoriesData || [])
      setAssetGroups(assetGroupsData || [])
    } catch (error) {
      notifications.show({ title: '読み込みに失敗しました', message: getErrorMessage(error), color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCatName(category.name)
      setCatType(category.type)
      setCatKeywords(category.keywords?.join(', ') || '')
    } else {
      setEditingCategory(null)
      setCatName('')
      setCatType('expense')
      setCatKeywords('')
    }
    openCategoryModal()
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      notifications.show({ message: 'カテゴリ名を入力してください。', color: 'red' })
      return
    }

    const keywords = catKeywords
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, catName, catType, keywords)
        notifications.show({ message: 'カテゴリを更新しました。', color: 'green' })
      } else {
        await createCategory(catName, catType, keywords)
        notifications.show({ message: 'カテゴリを作成しました。', color: 'green' })
      }
      await loadData()
      closeCategoryModal()
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('このカテゴリを削除しますか？')) return

    try {
      await deleteCategory(id)
      notifications.show({ message: 'カテゴリを削除しました。', color: 'gray' })
      await loadData()
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    }
  }

  const handleOpenAssetGroupModal = (group?: AssetGroup) => {
    if (group) {
      setEditingAssetGroup(group)
      setAssetGroupId(group.id)
      setAssetGroupName(group.name)
      setAssetGroupColor(group.color)
      setAssetGroupOrder(group.sort_order)
    } else {
      setEditingAssetGroup(null)
      setAssetGroupId('')
      setAssetGroupName('')
      setAssetGroupColor('#4E82EE')
      setAssetGroupOrder(assetGroups.length > 0 ? Math.max(...assetGroups.map((item) => item.sort_order)) + 1 : 1)
    }
    openAssetGroupModal()
  }

  const handleSaveAssetGroup = async () => {
    if (!assetGroupId.trim() || !assetGroupName.trim()) {
      notifications.show({ message: '資産グループIDと表示名を入力してください。', color: 'red' })
      return
    }

    try {
      if (editingAssetGroup) {
        await updateAssetGroup(editingAssetGroup.id, {
          name: assetGroupName,
          color: assetGroupColor,
          sort_order: assetGroupOrder,
        })
        notifications.show({ message: '資産グループを更新しました。', color: 'green' })
      } else {
        await createAssetGroup({
          id: assetGroupId,
          name: assetGroupName,
          color: assetGroupColor,
          sort_order: assetGroupOrder,
        })
        notifications.show({ message: '資産グループを作成しました。', color: 'green' })
      }
      await loadData()
      closeAssetGroupModal()
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    }
  }

  const handleDeleteAssetGroup = async (id: string) => {
    if (!confirm('この資産グループを削除しますか？')) return

    try {
      await deleteAssetGroup(id)
      notifications.show({ message: '資産グループを削除しました。', color: 'gray' })
      await loadData()
    } catch (error) {
      notifications.show({ message: getErrorMessage(error), color: 'red' })
    }
  }

  const handleTriggerJob = async (jobId: string) => {
    setSyncing((prev) => ({ ...prev, [jobId]: true }))
    try {
      await triggerJob(jobId)
      notifications.show({ title: '実行を開始しました', message: 'ジョブを起動しました。', color: 'green' })
      setTimeout(() => {
        void loadData()
      }, 5000)
    } catch (error) {
      notifications.show({ title: 'ジョブの起動に失敗しました', message: getErrorMessage(error), color: 'red' })
    } finally {
      setSyncing((prev) => ({ ...prev, [jobId]: false }))
    }
  }

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
      <PageHeader
        title="管理"
        subtitle="運用と各種設定"
        tabs={
          <Tabs.List grow>
            <Tabs.Tab value="categories" leftSection={<Tag size={14} />}>
              カテゴリ
            </Tabs.Tab>
            <Tabs.Tab value="tools" leftSection={<Wrench size={14} />}>
              ツール
            </Tabs.Tab>
            <Tabs.Tab value="system" leftSection={<Activity size={14} />}>
              システム
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<User size={14} />}>
              設定
            </Tabs.Tab>
          </Tabs.List>
        }
      >
        <ActionIcon variant="light" size="2rem" onClick={() => void loadData()} loading={loading}>
          <RefreshCw size={18} />
        </ActionIcon>
      </PageHeader>

      <PageContainer>
        <Tabs.Panel value="categories" pt="md">
          <Stack gap="md">
            <SegmentedControl
              value={categoryView}
              onChange={(value) => setCategoryView(value as 'transactions' | 'assets')}
              data={[
                { label: '取引カテゴリ', value: 'transactions' },
                { label: '資産グループ', value: 'assets' },
              ]}
              fullWidth
            />

            {categoryView === 'transactions' ? (
              <Stack gap="sm">
                <Button leftSection={<Plus size={16} />} variant="light" onClick={() => handleOpenCategoryModal()}>
                  カテゴリを追加
                </Button>
                {categories.length === 0 ? (
                  <Card>
                    <Text c="dimmed" ta="center">
                      カテゴリはまだ登録されていません。
                    </Text>
                  </Card>
                ) : (
                  categories.map((category) => (
                    <Card key={category.id} withBorder radius="md" p="md">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs">
                            <Text fw={700}>{category.name}</Text>
                            <Badge color={category.type === 'expense' ? 'red' : 'green'} variant="light">
                              {category.type}
                            </Badge>
                          </Group>
                          <Text size="sm" c="dimmed" lineClamp={2}>
                              {category.keywords?.join(', ') || 'キーワード未設定'}
                          </Text>
                        </Stack>
                        <Group gap={4}>
                          <ActionIcon variant="subtle" color="gray" onClick={() => handleOpenCategoryModal(category)}>
                            <Pencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => void handleDeleteCategory(category.id)}>
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            ) : (
              <Stack gap="sm">
                <Button leftSection={<Plus size={16} />} variant="light" onClick={() => handleOpenAssetGroupModal()}>
                  資産グループを追加
                </Button>
                {assetGroups.length === 0 ? (
                  <Card>
                    <Text c="dimmed" ta="center">
                      資産グループはまだ登録されていません。
                    </Text>
                  </Card>
                ) : (
                  assetGroups.map((group) => (
                    <Card key={group.id} withBorder radius="md" p="md">
                      <Group justify="space-between" align="flex-start">
                        <Group gap="sm">
                          <ThemeIcon color={group.color} variant="light" radius="xl">
                            <Tag size={14} />
                          </ThemeIcon>
                          <Stack gap={2}>
                            <Text fw={700}>{group.name}</Text>
                            <Text size="xs" c="dimmed">
                              ID: {group.id} / 並び順: {group.sort_order}
                            </Text>
                          </Stack>
                        </Group>
                        <Group gap={4}>
                          <ActionIcon variant="subtle" color="gray" onClick={() => handleOpenAssetGroupModal(group)}>
                            <Pencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => void handleDeleteAssetGroup(group.id)}>
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="tools" pt="md">
          <Stack gap="lg">
            <SectionTitle title="収入管理" />
            <Link href="/tools/salary" style={{ textDecoration: 'none' }}>
              <Card>
                <Group wrap="nowrap">
                  <ThemeIcon size={48} radius="md" variant="light" color="blue">
                    <FileText size={24} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>給与明細分析</Text>
                    <Text size="sm" c="dimmed">
                      給与明細 PDF を解析して収入として登録します。
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </Link>

            <SectionTitle title="外部連携" />
            <Card withBorder radius="md" p="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text fw={700}>投資残高同期</Text>
                    <Badge variant="light" color={getJobBadgeColor(jobs.find((job) => job.job_id === 'scraper_dc')?.last_status || 'idle')}>
                      {jobs.find((job) => job.job_id === 'scraper_dc')?.last_status || 'idle'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    外部サービスの投資残高を Flola に同期します。
                  </Text>
                  <Text size="xs" c="dimmed">
                    最終実行:{' '}
                    {jobs.find((job) => job.job_id === 'scraper_dc')?.last_run_at
                      ? format(new Date(jobs.find((job) => job.job_id === 'scraper_dc')!.last_run_at), 'MM/dd HH:mm')
                      : '未実行'}
                  </Text>
                </Stack>
                <Button
                  variant="filled"
                  color="indigo"
                  onClick={() => void handleTriggerJob('scraper_dc')}
                  loading={syncing.scraper_dc}
                  leftSection={<RefreshCw size={14} />}
                >
                  実行
                </Button>
              </Group>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="system" pt="md">
          <Stack gap="md">
            <SegmentedControl
              value={systemTab}
              onChange={(value) => setSystemTab(value as 'jobs' | 'logs')}
              data={[
                { label: 'ジョブ', value: 'jobs' },
                { label: 'ログ', value: 'logs' },
              ]}
              fullWidth
            />

            {systemTab === 'jobs' ? (
              loading ? (
                <Group justify="center" py="xl">
                  <Loader type="dots" />
                </Group>
              ) : (
                <Stack gap="sm">
                  {jobs.map((job) => (
                    <Card key={job.job_id} withBorder radius="md" p="md">
                      <Group justify="space-between" align="flex-start" mb="xs">
                        <Stack gap={2}>
                          <Text fw={700}>{job.job_id}</Text>
                          <Text size="xs" c="dimmed">
                            最終実行: {job.last_run_at ? format(new Date(job.last_run_at), 'MM/dd HH:mm') : '未実行'}
                          </Text>
                        </Stack>
                        <Badge variant="light" color={getJobBadgeColor(job.last_status)}>
                          {job.last_status}
                        </Badge>
                      </Group>
                      {job.message ? (
                        <Text size="sm" c="dimmed" mb="sm">
                          {job.message}
                        </Text>
                      ) : null}
                      <Button
                        size="compact-sm"
                        variant="light"
                        leftSection={<RefreshCw size={12} />}
                        onClick={() => void handleTriggerJob(job.job_id)}
                        loading={syncing[job.job_id]}
                      >
                        今すぐ実行
                      </Button>
                    </Card>
                  ))}
                </Stack>
              )
            ) : (
              <Stack gap="sm">
                {sortedLogs.map((log) => (
                  <Card key={log.id} withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" mb="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'yellow' : 'blue'}>
                          <Activity size={12} />
                        </ThemeIcon>
                        <Text fw={700}>{log.source}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                      </Text>
                    </Group>
                    <Text size="sm">{log.message}</Text>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Stack gap="md">
            <SectionTitle title="基本設定" />
            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="gray">
                      <Bell size={16} />
                    </ThemeIcon>
                    <Text fw={600}>通知</Text>
                  </Group>
                  <Switch checked={pushEnabled} onChange={(event) => setPushEnabled(event.currentTarget.checked)} />
                </Group>

                <Group justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="gray">
                      {darkModeEnabled ? <Moon size={16} /> : <Sun size={16} />}
                    </ThemeIcon>
                    <Text fw={600}>ダークモード</Text>
                  </Group>
                  <Switch checked={darkModeEnabled} onChange={(event) => setDarkModeEnabled(event.currentTarget.checked)} />
                </Group>
              </Stack>
            </Card>

            <SectionTitle title="管理画面の状態" />
            <Card withBorder radius="md" p="md">
              <Stack gap={6}>
                <Text fw={700}>管理画面を整理済み</Text>
                <Text size="sm" c="dimmed">
                  カテゴリ、資産グループ、運用ツール、システム監視をタブごとに分離しています。
                </Text>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Modal
          opened={categoryModalOpened}
          onClose={closeCategoryModal}
          title={editingCategory ? 'カテゴリ編集' : 'カテゴリ追加'}
          centered
        >
          <Stack gap="md">
            <TextInput
              label="カテゴリ名"
              placeholder="例: 食費"
              value={catName}
              onChange={(event) => setCatName(event.currentTarget.value)}
            />
            <SegmentedControl
              value={catType}
              onChange={(value) => setCatType(value as 'income' | 'expense')}
              data={[
                { label: '支出', value: 'expense' },
                { label: '収入', value: 'income' },
              ]}
              fullWidth
            />
            <Textarea
              label="キーワード"
              description="AI 補助に使うキーワードをカンマ区切りで入力します。"
              placeholder="スーパー, コンビニ"
              minRows={3}
              value={catKeywords}
              onChange={(event) => setCatKeywords(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeCategoryModal}>
                キャンセル
              </Button>
              <Button onClick={() => void handleSaveCategory()}>保存</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={assetGroupModalOpened}
          onClose={closeAssetGroupModal}
          title={editingAssetGroup ? '資産グループ編集' : '資産グループ追加'}
          centered
        >
          <Stack gap="md">
            <TextInput
              label="ID"
              placeholder="例: crypto"
              value={assetGroupId}
              onChange={(event) =>
                setAssetGroupId(event.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              disabled={!!editingAssetGroup}
            />
            <TextInput
              label="表示名"
              placeholder="例: 暗号資産"
              value={assetGroupName}
              onChange={(event) => setAssetGroupName(event.currentTarget.value)}
            />
            <ColorInput label="色" value={assetGroupColor} onChange={setAssetGroupColor} />
            <MantineNumberInput
              label="並び順"
              value={assetGroupOrder}
              onChange={(value) => setAssetGroupOrder(Number(value) || 0)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeAssetGroupModal}>
                キャンセル
              </Button>
              <Button onClick={() => void handleSaveAssetGroup()}>保存</Button>
            </Group>
          </Stack>
        </Modal>
      </PageContainer>
    </Tabs>
  )
}
