'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTransactions, updateTransaction, applyAiCategories, getCategories, createTransaction } from '@/app/actions'
import { 
  Card, 
  Text, 
  Group, 
  Button, 
  Badge, 
  Loader, 
  Select, 
  Modal, 
  NumberInput, 
  ActionIcon, 
  Menu,
  Stack,
  ThemeIcon,
  rem,
  Divider,
  Grid,
  TextInput,
  Tabs
} from "@mantine/core"
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Check, X, Wand2, CreditCard, CalendarDays, Search, Plus, PenLine, History, Wallet } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

type Category = { id: number; name: string }

function TransactionList({ 
  transactions, 
  categoryOptions, 
  handleCategoryChange, 
  handleIgnore, 
  handleApprove 
}: any) {
  return (
    <Stack gap="md">
      {transactions.map((t: any) => (
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
            leftSection={t.is_ai_suggested && <Wand2 size={14} color="purple" />}
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
  )
}

function InboxContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') === 'all' ? 'confirmed' : 'pending'

  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<string | null>(initialStatus)

  // 手動入力モーダル用
  const [opened, { open, close }] = useDisclosure(false)
  const [newDate, setNewDate] = useState<Date | null>(new Date())
  const [newAmount, setNewAmount] = useState<string | number>('')
  const [newDescription, setNewDescription] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [transData, catData] = await Promise.all([
        getTransactions({
          status: (activeTab as any) || 'pending'
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
  }, [activeTab]) // タブ切り替え時にリロード

  const handleAiPredict = async () => {
    setAiLoading(true)
    const targets = transactions
      .filter(t => !t.category_id && t.status === 'pending')
      .map(t => ({ id: t.id, description: t.description }))
    
    if (targets.length > 0) {
      try {
        const result = await applyAiCategories(targets)
        if (result.count > 0) {
          notifications.show({ title: 'AI Categorize', message: `${result.count}件のAI提案を適用しました`, color: 'green' })
          loadData()
        } else {
          notifications.show({ title: 'Info', message: '提案可能なカテゴリが見つかりませんでした', color: 'blue' })
        }
      } catch (e) {
        notifications.show({ title: 'Error', message: 'AI処理中にエラーが発生しました', color: 'red' })
      }
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
    setTransactions(prev => prev.filter(item => item.id !== t.id))

    await updateTransaction(t.id, { status: 'confirmed', category_id: t.category_id })
    notifications.show({ message: '承認しました', color: 'green' })
  }

  const handleIgnore = async (id: string) => {
    setTransactions(prev => prev.filter(item => item.id !== id))
    await updateTransaction(id, { status: 'ignore' })
    notifications.show({ message: '除外しました', color: 'gray' })
  }

  const handleCategoryChange = (transactionId: string, newCategoryId: string | null) => {
    if (!newCategoryId) return
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, category_id: Number(newCategoryId), is_ai_suggested: false } : t
    ))
  }

  const handleManualSave = async () => {
    if (!newAmount || !newDescription || !newCategoryId || !newDate) {
      notifications.show({ message: '必須項目を入力してください', color: 'red' })
      return
    }
    try {
      await createTransaction({
        date: format(newDate, 'yyyy-MM-dd'),
        amount: Number(newAmount),
        description: newDescription,
        category_id: Number(newCategoryId),
        status: 'confirmed'
      })
      notifications.show({ title: 'Success', message: '登録しました', color: 'green' })
      loadData()
      setNewAmount('')
      setNewDescription('')
      setNewCategoryId(null)
      setNewDate(new Date())
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
        tabs={
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="xl" size="xs">
            <Tabs.List grow>
              <Tabs.Tab value="pending">承認待ち</Tabs.Tab>
              <Tabs.Tab value="confirmed">確認済み</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        }
      >
        <ActionIcon variant="light" size="lg" onClick={loadData}>
          <Search size={18} />
        </ActionIcon>
      </PageHeader>

      <PageContainer>
        <Tabs value={activeTab} onChange={setActiveTab} variant="unstyled">
          <Tabs.Panel value="pending">
            {transactions.length > 0 && (
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
              <Text c="dimmed" ta="center" py="xl" size="sm">承認待ちのデータはありません</Text>
            ) : (
              <TransactionList 
                transactions={transactions} 
                categoryOptions={categoryOptions}
                handleCategoryChange={handleCategoryChange}
                handleIgnore={handleIgnore}
                handleApprove={handleApprove}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="confirmed">
            {loading ? (
              <Group justify="center" py="xl"><Loader type="dots" /></Group>
            ) : transactions.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl" size="sm">確認済みのデータはありません</Text>
            ) : (
              <TransactionList 
                transactions={transactions} 
                categoryOptions={categoryOptions}
                handleCategoryChange={handleCategoryChange}
                handleIgnore={handleIgnore}
                handleApprove={handleApprove}
              />
            )}
          </Tabs.Panel>
        </Tabs>
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
            <DateInput
              label="日付"
              value={newDate}
              onChange={setNewDate}
              valueFormat="YYYY/MM/DD"
              placeholder="日付を選択"
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

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  )
}
