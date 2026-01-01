'use client'

import { useEffect, useState } from 'react'
import { getTransactions, updateTransaction, predictCategories, getCategories, createTransaction } from '@/app/actions'
import { 
  Card, 
  Text, 
  Group, 
  Button, 
  Badge, 
  Loader, 
  Select, 
  TextInput, 
  Modal, 
  NumberInput, 
  ActionIcon, 
  Menu,
  Stack,
  ThemeIcon,
  rem,
  Divider,
  Grid
} from "@mantine/core"
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Check, X, Wand2, CreditCard, CalendarDays, Search, Plus, PenLine, History, Wallet } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

type Category = { id: number; name: string }

export default function InboxPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState<string | null>('pending')
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState("")

  // 手動入力モーダル用
  const [opened, { open, close }] = useDisclosure(false)
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newAmount, setNewAmount] = useState<string | number>('')
  const [newDescription, setNewDescription] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [transData, catData] = await Promise.all([
        getTransactions({ 
          status: (statusFilter as any) || 'all',
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        categories.length > 0 ? Promise.resolve(categories) : getCategories()
      ])
      
      setTransactions(transData || [])
      if (catData.length > 0) setCategories(catData)
    } catch (e) {
      notifications.show({ title: 'Error', message: 'データの取得に失敗しました', color: 'red' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAiPredict = async () => {
    setAiLoading(true)
    const targetDescriptions = transactions
      .filter(t => !t.category_id && t.status === 'pending')
      .map(t => t.description || "")
    
    const uniqueDescriptions = Array.from(new Set(targetDescriptions))
    
    if (uniqueDescriptions.length > 0) {
      const suggestions = await predictCategories(uniqueDescriptions)
      setTransactions(prev => prev.map(t => {
        if (t.description && suggestions[t.description]) {
          return { ...t, category_id: suggestions[t.description], ai_suggested: true }
        }
        return t
      }))
      notifications.show({ title: 'AI Categorize', message: 'AI提案を適用しました', color: 'green' })
    } else {
      notifications.show({ title: 'Info', message: '対象となるデータがありません', color: 'blue' })
    }
    setAiLoading(false)
  }

  const handleApprove = async (t: any) => {
    if (!t.category_id) {
      notifications.show({ message: 'カテゴリを選択してください', color: 'red' })
      return
    }
    
    // Optimistic update
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== t.id))
    } else {
      setTransactions(prev => prev.map(item => item.id === t.id ? {...item, status: 'confirmed'} : item))
    }

    await updateTransaction(t.id, { status: 'confirmed', category_id: t.category_id })
    notifications.show({ message: '承認しました', color: 'green' })
  }

  const handleIgnore = async (id: string) => {
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== id))
    }
    await updateTransaction(id, { status: 'ignore' })
    notifications.show({ message: '除外しました', color: 'gray' })
  }

  const handleCategoryChange = (transactionId: string, newCategoryId: string | null) => {
    if (!newCategoryId) return
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, category_id: Number(newCategoryId), ai_suggested: false } : t
    ))
  }

  const handleManualSave = async () => {
    if (!newAmount || !newDescription || !newCategoryId) {
      notifications.show({ message: '必須項目を入力してください', color: 'red' })
      return
    }
    try {
      await createTransaction({
        date: newDate,
        amount: Number(newAmount),
        description: newDescription,
        category_id: Number(newCategoryId),
        status: 'confirmed'
      })
      notifications.show({ title: 'Success', message: '登録しました', color: 'green' })
      loadData()
      // Reset & Close
      setNewAmount('')
      setNewDescription('')
      setNewCategoryId(null)
      close()
    } catch (e) {
      notifications.show({ title: 'Error', message: '登録に失敗しました', color: 'red' })
    }
  }

  const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }))

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={`${transactions.length} items`}
        bottomContent={
          <Grid gutter="xs">
            <Grid.Col span={5}>
              <Select
                size="xs"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'pending', label: '未承認のみ' },
                  { value: 'all', label: 'すべての履歴' },
                ]}
                allowDeselect={false}
              />
            </Grid.Col>
            <Grid.Col span={7}>
              <TextInput
                size="xs"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        }
      >
        <ActionIcon variant="light" size="lg" onClick={loadData}>
          <Search size={18} />
        </ActionIcon>
      </PageHeader>

      <PageContainer>
        {statusFilter === 'pending' && transactions.length > 0 && (
          <Button 
            fullWidth 
            mb="md"
            variant="gradient" 
            gradient={{ from: 'indigo', to: 'cyan' }}
            leftSection={!aiLoading && <Wand2 size={16} />}
            loading={aiLoading}
            onClick={handleAiPredict}
          >
            AI Categorize
          </Button>
        )}

        {loading ? (
          <Group justify="center" py="xl"><Loader type="dots" /></Group>
        ) : transactions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl" size="sm">データが見つかりません</Text>
        ) : (
          <Stack gap="md">
            {transactions.map((t) => (
              <Card key={t.id} padding="md" radius="md" withBorder style={{ 
                opacity: t.status === 'confirmed' ? 0.7 : 1,
                backgroundColor: t.status === 'confirmed' ? 'var(--mantine-color-gray-0)' : 'white'
              }}>
                {t.status === 'confirmed' && (
                  <Badge color="green" variant="light" pos="absolute" top={10} right={10}>Approved</Badge>
                )}

                <Group justify="space-between" align="flex-start" mb="xs">
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Group gap={4}>
                      <ThemeIcon variant="light" size="xs" color="gray">
                         <CalendarDays size={10} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed">{format(new Date(t.date), 'yyyy/MM/dd')}</Text>
                    </Group>
                    <Text fw={700} size="lg">¥{t.amount.toLocaleString()}</Text>
                    <Text fw={600} size="sm" lineClamp={1}>{t.description}</Text>
                    <Group gap={4}>
                      <CreditCard size={12} color="gray" />
                      <Text size="xs" c="dimmed">{t.accounts?.name || 'Unknown Account'}</Text>
                    </Group>
                  </Stack>
                </Group>

                <Select
                  placeholder="カテゴリを選択"
                  data={categoryOptions}
                  value={t.category_id ? t.category_id.toString() : null}
                  onChange={(val) => handleCategoryChange(t.id, val)}
                  disabled={t.status === 'confirmed'}
                  searchable
                  leftSection={t.ai_suggested && <Wand2 size={14} color="purple" />}
                  mb={t.status === 'pending' ? 'sm' : 0}
                />

                {t.status === 'pending' && (
                  <>
                    <Divider mb="sm" />
                    <Group gap={0} grow>
                      <Button 
                        variant="subtle" 
                        color="gray" 
                        leftSection={<X size={16} />}
                        onClick={() => handleIgnore(t.id)}
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      >
                        除外
                      </Button>
                      <Button 
                        variant="subtle" 
                        color="indigo" 
                        leftSection={<Check size={16} />}
                        onClick={() => handleApprove(t)}
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: '1px solid var(--mantine-color-gray-2)' }}
                      >
                        承認
                      </Button>
                    </Group>
                  </>
                )}
              </Card>
            ))}
          </Stack>
        )}

        <Menu position="top-end" withArrow>
          <Menu.Target>
            <ActionIcon 
              variant="filled" 
              color="black" 
              size={56} 
              radius="xl" 
              pos="fixed" 
              bottom={100} 
              right={20} 
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 99 }}
            >
              <Plus size={24} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<PenLine size={16} />} onClick={open}>
              手動入力
            </Menu.Item>
            <Menu.Item leftSection={<History size={16} />} onClick={() => notifications.show({ message: '準備中', color: 'blue' })}>
              過去履歴を登録
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Modal opened={opened} onClose={close} title="手動入力" centered>
          <Stack gap="md">
            <TextInput
              label="日付"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.currentTarget.value)}
            />
            <NumberInput
              label="金額"
              placeholder="0"
              leftSection="¥"
              value={newAmount}
              onChange={setNewAmount}
              hideControls
            />
            <TextInput
              label="内容"
              placeholder="例: ランチ"
              value={newDescription}
              onChange={(e) => setNewDescription(e.currentTarget.value)}
            />
            <Select
              label="カテゴリ"
              placeholder="選択してください"
              data={categoryOptions}
              value={newCategoryId}
              onChange={setNewCategoryId}
              searchable
            />
            <Button fullWidth onClick={handleManualSave} mt="md">
              登録
            </Button>
          </Stack>
        </Modal>

      </PageContainer>
    </>
  )
}
