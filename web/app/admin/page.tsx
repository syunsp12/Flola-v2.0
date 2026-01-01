'use client'

import { useEffect, useState } from 'react'
import { 
  getJobStatuses, 
  getSystemLogs, 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
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
} from "@mantine/core"
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Activity, FileText, RefreshCw, Server, AlertCircle, CheckCircle2, Clock, Tag, Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

// --- 型定義 ---
type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  keywords: string[] | null
}

export default function AdminPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>("categories")
  
  const [opened, { open, close }] = useDisclosure(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<'income' | 'expense'>("expense")
  const [catKeywords, setCatKeywords] = useState("")

  const loadData = async () => {
    setLoading(true)
    const [jobsData, logsData, catsData] = await Promise.all([
      getJobStatuses(),
      getSystemLogs(),
      getCategories()
    ])
    setJobs(jobsData || [])
    setLogs(logsData || [])
    setCategories(catsData || [])
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

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'success': return { icon: <CheckCircle2 size={14} />, color: "green" }
      case 'failed': return { icon: <AlertCircle size={14} />, color: "red" }
      case 'running': return { icon: <Activity size={14} />, color: "blue" }
      default: return { icon: <Clock size={14} />, color: "gray" }
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
            <Tabs.Tab value="jobs" leftSection={<Server size={14} />} style={tabStyle}>Jobs</Tabs.Tab>
            <Tabs.Tab value="logs" leftSection={<FileText size={14} />} style={tabStyle}>Logs</Tabs.Tab>
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
            <Tabs.Panel value="categories" pt="md">
              <Button 
                fullWidth 
                mb="md"
                leftSection={<Plus size={16} />}
                onClick={() => handleOpenModal()}
              >
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
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {cat.keywords?.join(", ")}
                        </Text>
                      </Stack>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="gray" onClick={() => handleOpenModal(cat)}>
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="jobs" pt="md">
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
            </Tabs.Panel>

            <Tabs.Panel value="logs" pt="md">
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
            </Tabs.Panel>
          </motion.div>
        </AnimatePresence>
      </PageContainer>

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
    </Tabs>
  )
}