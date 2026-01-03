'use client'

import { useEffect, useState } from 'react'
import { 
  getJobStatuses, 
  getSystemLogs, 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getAccountsWithBalance,
  updateAccount,
  triggerJob,
  getSalaryHistory,
  getAssetGroups,
  updateAssetGroup,
  createAssetGroup,
  deleteAssetGroup
} from '@/app/actions'
import { 
  Card, 
  Button, 
  Badge, 
  Tabs, 
  Loader, 
  Modal, 
  TextInput, 
  Textarea, 
  Radio, 
  Group, 
  Text, 
  ActionIcon, 
  Stack,
  ThemeIcon,
  Box,
  Divider,
  useMantineColorScheme,
  Switch,
  Image,
  SegmentedControl,
  Select,
  rem,
  UnstyledButton,
  ColorInput,
  NumberInput as MantineNumberInput
} from "@mantine/core"
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { Activity, FileText, RefreshCw, Server, AlertCircle, CheckCircle2, Clock, Tag, Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Search, Settings, Moon, Sun, Bell, LogOut, User, Shield, Image as ImageIcon, Upload, X, Building2, TrendingUp, Wrench, Layers } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { getSmartIconUrl } from '@/lib/utils/icon-helper'
import Link from 'next/link'

// --- 型定義 ---
type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  keywords: string[] | null
}

type Account = {
  id: string
  name: string
  type: string
  is_liability: boolean
  icon_url: string | null
  card_brand: string | null
}

type AssetGroup = {
  id: string
  name: string
  color: string
  sort_order: number
}

export default function AdminPage() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const dark = colorScheme === 'dark'

  const [jobs, setJobs] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>("categories")
  const [systemTab, setSystemTab] = useState("jobs")
  const [categoryView, setCategoryView] = useState("transactions") // 'transactions' | 'assets'
  
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  const [opened, { open, close }] = useDisclosure(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [assetGroupOpened, { open: agOpen, close: agClose }] = useDisclosure(false)
  const [editingAG, setEditingAG] = useState<AssetGroup | null>(null)
  const [agId, setAgId] = useState("")
  const [agName, setAgName] = useState("")
  const [agColor, setAgColor] = useState("#4E82EE")
  const [agOrder, setAgOrder] = useState(0)

  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<'income' | 'expense'>("expense")
  const [catKeywords, setCatKeywords] = useState("")

  const [pushEnabled, setPushEnabled] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [jobsData, logsData, catsData, accountsData, agData] = await Promise.all([
      getJobStatuses(),
      getSystemLogs(),
      getCategories(),
      getAccountsWithBalance(),
      getAssetGroups()
    ])
    setJobs(jobsData || [])
    setLogs(logsData || [])
    setCategories(catsData || [])
    setAccounts(accountsData || [])
    setAssetGroups(agData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCatName(category.name)
      setCatType(category.type)
      setCatKeywords(category.keywords?.join(", ") || "")
    } else {
      setEditingCategory(null)
      setCatName("")
      setCatType("expense")
      setCatKeywords("")
    }
    open()
  }

  const handleSaveCategory = async () => {
    if (!catName) {
      notifications.show({ message: 'カテゴリ名は必須です', color: 'red' })
      return
    }
    const keywordsArray = catKeywords.split(",").map(k => k.trim()).filter(k => k !== "")
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, catName, catType, keywordsArray)
        notifications.show({ message: 'カテゴリを更新しました', color: 'green' })
      } else {
        await createCategory(catName, catType, keywordsArray)
        notifications.show({ message: 'カテゴリを作成しました', color: 'green' })
      }
      loadData()
      close()
    } catch (e: any) {
      notifications.show({ message: e.message || 'エラーが発生しました', color: 'red' })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("本当に削除しますか？使用中のカテゴリは削除できません。")) return
    try {
      await deleteCategory(id)
      notifications.show({ message: '削除しました', color: 'gray' })
      loadData()
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' })
    }
  }

  const handleOpenAGModal = (ag?: AssetGroup) => {
    if (ag) {
      setEditingAG(ag)
      setAgId(ag.id)
      setAgName(ag.name)
      setAgColor(ag.color)
      setAgOrder(ag.sort_order)
    } else {
      setEditingAG(null)
      setAgId("")
      setAgName("")
      setAgColor("#4E82EE")
      setAgOrder(assetGroups.length + 1)
    }
    agOpen()
  }

  const handleSaveAG = async () => {
    if (!agId || !agName) {
      notifications.show({ message: 'IDと表示名は必須です', color: 'red' })
      return
    }
    try {
      const data = { id: agId, name: agName, color: agColor, sort_order: agOrder }
      if (editingAG) {
        await updateAssetGroup(editingAG.id, data)
        notifications.show({ message: '資産グループを更新しました', color: 'green' })
      } else {
        await createAssetGroup(data)
        notifications.show({ message: '資産グループを作成しました', color: 'green' })
      }
      loadData()
      agClose()
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' })
    }
  }

  const handleDeleteAG = async (id: string) => {
    if (!confirm("この資産グループを削除しますか？")) return
    try {
      await deleteAssetGroup(id)
      notifications.show({ message: '削除しました', color: 'gray' })
      loadData()
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' })
    }
  }

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'success': return { icon: <CheckCircle2 size={14} />, color: "green" }
      case 'failed': return { icon: <AlertCircle size={14} />, color: "red" }
      case 'running': return { icon: <Activity size={14} />, color: "blue" }
      default: return { icon: <Clock size={14} />, color: "gray" }
    }
  }

  const getJob = (jobsList: any[], jobId: string) => jobsList.find(j => j.job_id === jobId)

  const getStatusBadge = (jobsList: any[], jobId: string) => {
    const job = getJob(jobsList, jobId)
    if (!job) return null
    const colors: Record<string, string> = { 'success': 'green', 'failed': 'red', 'running': 'blue' }
    return (
      <Badge size="xs" variant="light" color={colors[job.last_status] || 'gray'}>
        {job.last_status}
      </Badge>
    )
  }

  const handleTriggerJob = async (jobId: string) => {
    setSyncing(prev => ({ ...prev, [jobId]: true }))
    try {
      await triggerJob(jobId)
      notifications.show({ title: 'Success', message: 'Job triggered successfully', color: 'green' })
      setTimeout(loadData, 5000)
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' })
    } finally {
      setSyncing(prev => ({ ...prev, [jobId]: false }))
    }
  }

  const tabListStyle = {
    backgroundColor: 'var(--mantine-color-gray-1)',
    padding: '2px',
    borderRadius: '100px',
    border: 'none'
  }

  const tabStyle = {
    borderRadius: '100px',
    fontSize: '11px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    border: 'none'
  }

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
      <PageHeader
        title="Admin"
        tabs={
          <Tabs.List grow style={tabListStyle}>
            <Tabs.Tab value="categories" leftSection={<Tag size={14} />} style={tabStyle}>Categories</Tabs.Tab>
            <Tabs.Tab value="tools" leftSection={<Wrench size={14} />} style={tabStyle}>Tools</Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<User size={14} />} style={tabStyle}>Settings</Tabs.Tab>
            <Tabs.Tab value="system" leftSection={<Activity size={14} />} style={tabStyle}>System</Tabs.Tab>
          </Tabs.List>
        }
      >
        <ActionIcon variant="light" size="2rem" onClick={loadData}>
          <RefreshCw size={18} />
        </ActionIcon>
      </PageHeader>

      <PageContainer>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* --- カテゴリ管理タブ --- */}
            <Tabs.Panel value="categories" pt="md">
              <Stack gap="md">
                <SegmentedControl
                  value={categoryView}
                  onChange={setCategoryView}
                  data={[
                    { label: '取引カテゴリ', value: 'transactions' },
                    { label: '資産グループ', value: 'assets' },
                  ]}
                  fullWidth
                  radius="md"
                />

                {categoryView === 'transactions' ? (
                  <>
                    <Button fullWidth leftSection={<Plus size={16} />} variant="light" onClick={() => handleOpenModal()}>
                      新規カテゴリ追加
                    </Button>
                    <Stack gap="sm">
                      {categories.map((cat) => (
                        <Card key={cat.id} padding="sm" radius="md" withBorder>
                          <Group justify="space-between">
                            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                              <Group gap="xs">
                                <Text fw={700} size="sm">{cat.name}</Text>
                                <Badge size="sm" variant="light" color={cat.type === 'expense' ? "red" : "green"}>
                                  {cat.type === 'expense' ? '支出' : '収入'}
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed" lineClamp={1}>{cat.keywords?.join(", ")}</Text>
                            </Stack>
                            <Group gap={4}>
                              <ActionIcon variant="subtle" color="gray" onClick={() => handleOpenModal(cat)}><Pencil size={16} /></ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={16} /></ActionIcon>
                            </Group>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Stack gap="sm">
                    <Button fullWidth leftSection={<Plus size={16} />} variant="light" onClick={() => handleOpenAGModal()}>
                      新規資産グループ追加
                    </Button>
                    <Text size="xs" c="dimmed" px="xs">資産種別の表示名や、グラフでの色を設定します。</Text>
                    {assetGroups.map((ag) => (
                      <Card key={ag.id} padding="sm" radius="md" withBorder shadow="xs">
                        <Group justify="space-between">
                          <Group gap="md">
                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: ag.color }} />
                            <Stack gap={0}>
                              <Text fw={700} size="sm">{ag.name}</Text>
                              <Text size="10px" c="dimmed" tt="uppercase">{ag.id}</Text>
                            </Stack>
                          </Group>
                          <Group gap={4}>
                            <ActionIcon variant="subtle" color="gray" onClick={() => handleOpenAGModal(ag)}>
                              <Pencil size={14} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteAG(ag.id)}>
                              <Trash2 size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Tabs.Panel>

            {/* --- ツールタブ (旧Toolsの統合) --- */}
            <Tabs.Panel value="tools" pt="md">
              <Stack gap="xl">
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

                <Box>
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs" mb="xs">External Asset Sync</Text>
                  <Card padding="md" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md" style={{ flex: 1 }}>
                        <ThemeIcon size={48} radius="md" variant="light" color="indigo">
                          <RefreshCw size={24} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text fw={700} size="lg">全金融機関の残高同期</Text>
                            {getStatusBadge(jobs, 'scraper_dc')}
                          </Group>
                          <Text size="sm" c="dimmed">DC年金、野村持株会のデータをまとめて取得します</Text>
                          <Text size="10px" c="dimmed">
                            最終同期: {getJob(jobs, 'scraper_dc')?.last_run_at ? format(new Date(getJob(jobs, 'scraper_dc').last_run_at), 'MM/dd HH:mm') : '未実行'}
                          </Text>
                        </Stack>
                      </Group>
                      <Button 
                        variant="filled" 
                        color="indigo"
                        onClick={() => handleTriggerJob('scraper_dc')}
                        loading={syncing['scraper_dc']}
                        leftSection={<RefreshCw size={14} />}
                        radius="md"
                      >
                        同期
                      </Button>
                    </Group>
                  </Card>
                </Box>
              </Stack>
            </Tabs.Panel>

            {/* --- 設定タブ --- */}
            <Tabs.Panel value="settings" pt="md">
              <Stack gap="xl">
                <Card 
                  p="lg" 
                  style={{ 
                    background: 'linear-gradient(135deg, var(--mantine-color-indigo-7) 0%, var(--mantine-color-indigo-9) 100%)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <ThemeIcon size={50} radius="xl" color="white" variant="white">
                        <User size={30} color="var(--mantine-color-indigo-7)" />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={800} size="lg">山田 太郎</Text>
                        <Text size="xs" style={{ opacity: 0.8 }} fw={600} tt="uppercase">Personal Account</Text>
                      </Stack>
                    </Group>
                    <ActionIcon variant="transparent" color="white">
                      <Plus size={20} />
                    </ActionIcon>
                  </Group>
                </Card>

                <Stack gap="xs">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs">App Preferences</Text>
                  <Card p={0} withBorder>
                    <Stack gap={0}>
                      <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
                        <Group gap="sm">
                          <ThemeIcon variant="light" color="gray"><Bell size={16} /></ThemeIcon>
                          <Text size="sm" fw={600}>通知を有効にする</Text>
                        </Group>
                        <Switch checked={pushEnabled} onChange={(e) => setPushEnabled(e.currentTarget.checked)} />
                      </Group>

                      <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
                        <Group gap="sm">
                          <ThemeIcon variant="light" color="gray">{dark ? <Moon size={16} /> : <Sun size={16} />}</ThemeIcon>
                          <Text size="sm" fw={600}>ダークモード</Text>
                        </Group>
                        <Switch checked={dark} onChange={() => toggleColorScheme()} />
                      </Group>

                      <Group justify="space-between" p="md">
                        <Group gap="sm">
                          <ThemeIcon variant="light" color="gray"><Shield size={16} /></ThemeIcon>
                          <Text size="sm" fw={600}>セキュリティ設定</Text>
                        </Group>
                        <ActionIcon variant="subtle" color="gray"><Plus size={16} /></ActionIcon>
                      </Group>
                    </Stack>
                  </Card>
                </Stack>

                <Button 
                  variant="light" 
                  color="red" 
                  fullWidth 
                  size="md" 
                  leftSection={<LogOut size={18} />}
                  onClick={() => notifications.show({ title: 'Logout', message: 'ログアウトしました', color: 'red' })}
                >
                  ログアウト
                </Button>

                <Stack align="center" gap={4} py="xl">
                  <Text size="10px" c="dimmed" fw={800} tt="uppercase" style={{ letterSpacing: '2px' }}>Flola v2.1.0-stable</Text>
                  <Text size="10px" c="dimmed">Powered by Gemini 1.5 Flash</Text>
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* --- システム状態タブ --- */}
            <Tabs.Panel value="system" pt="md">
              <Stack gap="md">
                <SegmentedControl
                  value={systemTab}
                  onChange={setSystemTab}
                  fullWidth
                  radius="xl"
                  data={[
                    { label: 'Sync Jobs', value: 'jobs' },
                    { label: 'Debug Logs', value: 'logs' },
                  ]}
                />

                {systemTab === 'jobs' ? (
                  <Stack gap="sm">
                    {loading ? <Group justify="center" py="xl"><Loader type="dots" /></Group> : 
                     jobs.map((job) => {
                       const { icon, color } = getStatusInfo(job.last_status)
                       return (
                         <Card key={job.job_id} padding="md" radius="md" withBorder>
                           <Group justify="space-between" align="flex-start" mb="xs">
                             <Stack gap={0}>
                               <Text fw={700} size="sm">{job.job_id}</Text>
                               <Text size="xs" c="dimmed">Last Run</Text>
                             </Stack>
                             <Badge leftSection={icon} color={color} variant="light" tt="capitalize">
                               {job.last_status}
                             </Badge>
                           </Group>
                           <Group justify="space-between" align="flex-end">
                             <Text size="xs" ff="monospace" c="dimmed">
                               {job.last_run_at ? format(new Date(job.last_run_at), 'MM/dd HH:mm') : 'Never'}
                             </Text>
                             <Button 
                               size="compact-xs" 
                               variant="light" 
                               color="indigo" 
                               onClick={() => handleTriggerJob(job.job_id)}
                               leftSection={<RefreshCw size={10} />}
                             >
                               Run Now
                             </Button>
                           </Group>
                           {job.message && (
                             <Text size="xs" mt="sm" p="xs" bg="gray.1" style={{ borderRadius: 4, fontFamily: 'monospace' }} lineClamp={2}>
                               {job.message}
                             </Text>
                           )}
                         </Card>
                       )
                     })
                    }
                  </Stack>
                ) : (
                  <Stack gap="0">
                    {logs.map((log) => (
                       <Group key={log.id} wrap="nowrap" align="flex-start" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                         <ThemeIcon 
                           size={8} 
                           radius="xl" 
                           color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'yellow' : 'blue'}
                           mt={6}
                         />
                         <Stack gap={2} style={{ flex: 1 }}>
                           <Group justify="space-between">
                             <Text size="xs" fw={700}>{log.source}</Text>
                             <Text size="xs" c="dimmed" ff="monospace">
                               {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                             </Text>
                           </Group>
                           <Text size="sm" lh={1.4} style={{ wordBreak: 'break-word' }}>
                             {log.message}
                           </Text>
                         </Stack>
                       </Group>
                     ))
                    }
                  </Stack>
                )}
              </Stack>
            </Tabs.Panel>
          </motion.div>
        </AnimatePresence>

        {/* カテゴリ編集モーダル */}
        <Modal 
          opened={opened} 
          onClose={close} 
          title={`カテゴリ${editingCategory ? '編集' : '追加'}`}
          centered
        >
          <Stack gap="md">
            <TextInput
              label="カテゴリ名"
              placeholder="例: 食費"
              value={catName}
              onChange={(e) => setCatName(e.currentTarget.value)}
            />

            <Radio.Group
              label="収支タイプ"
              value={catType}
              onChange={(val) => setCatType(val as 'income' | 'expense')}
            >
              <Stack gap="xs" mt="xs">
                <Radio 
                  value="expense" 
                  label={
                    <Group gap="xs">
                      <ArrowUpCircle size={16} color="var(--mantine-color-red-6)" />
                      <Text size="sm" fw={500} c="red">支出 (Expense)</Text>
                    </Group>
                  }
                  style={{ padding: '12px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px', cursor: 'pointer' }}
                />
                <Radio 
                  value="income" 
                  label={
                    <Group gap="xs">
                      <ArrowDownCircle size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500} c="green">収入 (Income)</Text>
                    </Group>
                  }
                  style={{ padding: '12px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px', cursor: 'pointer' }}
                />
              </Stack>
            </Radio.Group>

            <Textarea
              label="AI用キーワード"
              description="カンマ(,)区切り。ここに入力した単語が含まれると、AIが優先的に提案します。"
              placeholder="スーパー, コンビニ, マクドナルド"
              minRows={3}
              value={catKeywords}
              onChange={(e) => setCatKeywords(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={close}>キャンセル</Button>
              <Button onClick={handleSaveCategory}>保存</Button>
            </Group>
          </Stack>
        </Modal>

        {/* 資産グループ編集モーダル */}
        <Modal opened={assetGroupOpened} onClose={agClose} title={`資産グループの${editingAG ? '編集' : '追加'}`} centered>
          <Stack gap="md">
            <TextInput 
              label="グループID" 
              placeholder="例: crypto, gold" 
              value={agId} 
              onChange={(e) => setAgId(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={!!editingAG}
              description="英数字のみ。一度作成すると変更できません。"
            />
            <TextInput label="表示名" placeholder="例: 仮想通貨" value={agName} onChange={(e) => setAgName(e.currentTarget.value)} />
            <ColorInput label="グラフカラー" value={agColor} onChange={setAgColor} />
            <MantineNumberInput label="並び順" value={agOrder} onChange={(val) => setAgOrder(Number(val))} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={agClose}>キャンセル</Button>
              <Button onClick={handleSaveAG}>保存</Button>
            </Group>
          </Stack>
        </Modal>
      </PageContainer>
    </Tabs>
  )
}
