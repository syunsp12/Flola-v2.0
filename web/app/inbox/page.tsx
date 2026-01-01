'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTransactions, updateTransaction, applyAiCategories, getCategories, createTransaction, requestHistoryFetch } from '@/app/actions'
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
  Divider,
  Grid,
  TextInput,
  Tabs,
  Skeleton,
  Box,
  UnstyledButton,
  rem
} from "@mantine/core"
import { DatePickerInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Check, X, Wand2, CreditCard, CalendarDays, RefreshCw, Plus, PenLine, History, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

type Category = { id: number; name: string }

// Geminiロゴを模したカスタムSVGアイコン
function GeminiIcon({ size = 16, ...props }: { size?: number } & React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2C12 2 12.5 8.5 14.5 10.5C16.5 12.5 22 12 22 12C22 12 16.5 13 14.5 15C12.5 17 12 22 12 22C12 22 11.5 17 9.5 15C7.5 13 2 12 2 12C2 12 7.5 11.5 9.5 9.5C11.5 7.5 12 2 12 2Z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop color="#4E82EE" />
          <stop offset="0.45" color="#9B72F3" />
          <stop offset="1" color="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// 各取引アイテムのコンポーネント (個別状態管理のため)


function TransactionItem({ 
  t, 
  index, 
  categoryOptions, 
  handleFieldChange, 
  handleIgnore, 
  handleApprove 
}: any) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const isPending = t.status === 'pending'
  const isExpense = t.type === 'expense'

  const stopEditing = () => setEditingField(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ 
        opacity: 0, 
        scale: 0.95,
        filter: 'blur(8px)',
        transition: { duration: 0.2 } 
      }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
      layout
    >
      <Card 
        padding="md" 
        radius="lg" 
        withBorder 
        style={{ 
          opacity: t.status === 'confirmed' ? 0.7 : 1,
          backgroundColor: t.status === 'confirmed' ? 'var(--mantine-color-gray-0)' : 'white',
          borderLeft: `4px solid ${isExpense ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-teal-5)'}`,
          overflow: 'visible'
        }}
      >
        {t.status === 'confirmed' && (
          <Badge 
            color="green" 
            variant="light" 
            style={{ 
              position: 'absolute', 
              top: -8, 
              right: 10, 
              boxShadow: 'var(--mantine-shadow-sm)' 
            }}
          >
            Approved
          </Badge>
        )}

        <Stack gap="xs">
          {/* 上段：日付と金額 */}
          <Group justify="space-between" align="center" wrap="nowrap">
            {/* 日付 */}
            {isPending && editingField === 'date' ? (
              <DatePickerInput
                size="xs"
                value={new Date(t.date)}
                onChange={(date) => {
                  handleFieldChange(t.id, 'date', date ? format(date, 'yyyy-MM-dd') : t.date)
                  stopEditing()
                }}
                onBlur={stopEditing}
                autoFocus
                valueFormat="YYYY/MM/DD"
                styles={{ input: { width: rem(120) } }}
              />
            ) : (
              <UnstyledButton onClick={() => isPending && setEditingField('date')}>
                <Group gap={4} className={isPending ? "editable-field" : ""}>
                  <CalendarDays size={12} color="var(--mantine-color-gray-5)" />
                  <Text size="xs" c="dimmed" fw={700}>{format(new Date(t.date), 'yyyy/MM/dd')}</Text>
                </Group>
              </UnstyledButton>
            )}

            {/* 金額 */}
            {isPending && editingField === 'amount' ? (
              <NumberInput
                size="sm"
                value={t.amount}
                onChange={(val) => handleFieldChange(t.id, 'amount', Number(val))}
                onBlur={stopEditing}
                onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                autoFocus
                hideControls
                leftSection="¥"
                styles={{ input: { fontWeight: 900, textAlign: 'right', width: rem(120), fontSize: rem(18) } }}
              />
            ) : (
              <UnstyledButton onClick={() => isPending && setEditingField('amount')}>
                <Text 
                  fw={900} 
                  size="xl" 
                  c={isExpense ? 'dark' : 'teal.7'}
                  className={isPending ? "editable-field px-2" : ""}
                >
                  {isExpense ? '-' : '+'}¥{t.amount.toLocaleString()}
                </Text>
              </UnstyledButton>
            )}
          </Group>

          {/* 中段：内容とアイコン */}
          <Group gap="xs" wrap="nowrap" align="center">
            <ThemeIcon variant="light" color={isExpense ? 'red' : 'teal'} size="sm" radius="xl">
              {isExpense ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
            </ThemeIcon>
            
            {isPending && editingField === 'description' ? (
              <TextInput
                size="sm"
                style={{ flex: 1 }}
                value={t.description || ''}
                onChange={(e) => handleFieldChange(t.id, 'description', e.currentTarget.value)}
                onBlur={stopEditing}
                onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                autoFocus
              />
            ) : (
              <UnstyledButton 
                onClick={() => isPending && setEditingField('description')}
                style={{ flex: 1, minWidth: 0 }}
              >
                <Text 
                  fw={700} 
                  size="sm" 
                  lineClamp={1} 
                  className={isPending ? "editable-field p-1" : ""}
                >
                  {t.description || '(内容なし)'}
                </Text>
              </UnstyledButton>
            )}
          </Group>

          {/* 下段：口座とカテゴリ */}
          <Group justify="space-between" align="center">
            <Group gap={4}>
              <CreditCard size={12} color="var(--mantine-color-gray-5)" />
              <Text size="xs" c="dimmed" fw={500}>
                {(Array.isArray(t.accounts) ? t.accounts[0]?.name : t.accounts?.name) || 'Unknown Account'}
              </Text>
            </Group>
            
            <Select
              variant="unstyled"
              placeholder="カテゴリを選択..."
              data={categoryOptions}
              value={t.category_id ? t.category_id.toString() : null}
              onChange={(val) => handleFieldChange(t.id, 'category_id', val ? Number(val) : null)}
              disabled={t.status === 'confirmed'}
              searchable
              size="xs"
              leftSection={t.is_ai_suggested && <GeminiIcon size={18} />}
              styles={{ 
                input: { 
                  fontWeight: 700, 
                  color: 'var(--mantine-color-indigo-7)',
                  textAlign: 'right',
                  paddingRight: rem(20)
                } 
              }}
            />
          </Group>

          {isPending && (
            <Box mt="xs">
              <Group gap="sm" grow>
                <Button 
                  variant="light" 
                  color="gray" 
                  size="sm"
                  radius="md"
                  leftSection={<X size={16} />}
                  onClick={() => handleIgnore(t.id)}
                >
                  除外
                </Button>
                <Button 
                  variant="filled" 
                  color="indigo" 
                  size="sm"
                  radius="md"
                  leftSection={<Check size={16} />}
                  onClick={() => handleApprove(t)}
                >
                  承認
                </Button>
              </Group>
            </Box>
          )}
        </Stack>
      </Card>
    </motion.div>
  )
}

function TransactionList({ 
  transactions, 
  categoryOptions, 
  handleFieldChange,
  handleIgnore, 
  handleApprove 
}: any) {
  return (
    <Stack gap="md">
      <style jsx global>{`
        .editable-field {
          transition: all 0.2s ease;
          border-radius: 4px;
          border-bottom: 1px dashed transparent;
        }
        .editable-field:hover {
          background-color: var(--mantine-color-gray-0);
          border-bottom-color: var(--mantine-color-gray-3);
        }
        .editable-field:active {
          background-color: var(--mantine-color-gray-1);
        }
      `}</style>
      <AnimatePresence mode="popLayout">
        {transactions.map((t: any, index: number) => (
          <TransactionItem
            key={t.id}
            t={t}
            index={index}
            categoryOptions={categoryOptions}
            handleFieldChange={handleFieldChange}
            handleIgnore={handleIgnore}
            handleApprove={handleApprove}
          />
        ))}
      </AnimatePresence>
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
  const [isMenuOpened, setIsMenuOpened] = useState(false)

  // 手動入力モーダル用
  const [opened, { open, close }] = useDisclosure(false)
  const [newDate, setNewDate] = useState<Date | null>(new Date())
  const [newAmount, setNewAmount] = useState<string | number>('')
  const [newDescription, setNewDescription] = useState("")
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null)

  // 過去履歴取得用
  const [historyOpened, { open: historyOpen, close: historyClose }] = useDisclosure(false)
  const [historyRange, setHistoryRange] = useState<[Date | null, Date | null]>([null, null])
  const [isHistoryRequesting, setIsHistoryRequesting] = useState(false)

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
  }, [activeTab])

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
    setTransactions(prev => prev.filter(item => item.id !== t.id))
    await updateTransaction(t.id, { 
      status: 'confirmed', 
      category_id: t.category_id,
      amount: t.amount,
      date: t.date,
      description: t.description
    })
    notifications.show({ message: '承認しました', color: 'green' })
  }

  const handleIgnore = async (id: string) => {
    setTransactions(prev => prev.filter(item => item.id !== id))
    await updateTransaction(id, { status: 'ignore' })
    notifications.show({ message: '除外しました', color: 'gray' })
  }

  const handleFieldChange = (transactionId: string, field: string, value: any) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, [field]: value, is_ai_suggested: field === 'category_id' ? false : t.is_ai_suggested } : t
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

  // 共通のタブリストスタイル
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

  const handleRequestHistory = async () => {
    const [start, end] = historyRange
    if (!start || !end) {
      notifications.show({ message: '期間を選択してください', color: 'red' })
      return
    }

    setIsHistoryRequesting(true)
    try {
      await requestHistoryFetch(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      notifications.show({ 
        title: 'リクエスト完了', 
        message: 'Gmailからの取得リクエストを送信しました。数分後にデータが反映されます。', 
        color: 'green' 
      })
      historyClose()
    } catch (e) {
      notifications.show({ title: 'Error', message: 'リクエストに失敗しました', color: 'red' })
    }
    setIsHistoryRequesting(false)
  }

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
      <PageHeader
        title="Inbox"
        subtitle={`${transactions.length} items`}
        tabs={
          <Tabs.List grow style={tabListStyle}>
            <Tabs.Tab value="pending" style={tabStyle}>承認待ち</Tabs.Tab>
            <Tabs.Tab value="confirmed" style={tabStyle}>確認済み</Tabs.Tab>
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
            <Tabs.Panel value="pending">
              {transactions.length > 0 ? (
                <Stack gap="md">
                  <Button 
                    fullWidth 
                    variant="gradient" 
                    gradient={{ from: 'indigo', to: 'cyan' }}
                    leftSection={!aiLoading && <GeminiIcon size={20} />}
                    loading={aiLoading}
                    onClick={handleAiPredict}
                    size="md"
                  >
                    AI Categorize with Gemini
                  </Button>
                  <TransactionList 
                    transactions={transactions} 
                    categoryOptions={categoryOptions}
                    handleFieldChange={handleFieldChange}
                    handleIgnore={handleIgnore}
                    handleApprove={handleApprove}
                  />
                </Stack>
              ) : loading ? (
                <Stack gap="md">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} padding="md" radius="md" withBorder>
                      <Skeleton h={20} w="30%" mb="sm" />
                      <Skeleton h={30} w="60%" mb="xs" />
                      <Skeleton h={15} w="80%" mb="md" />
                      <Skeleton h={40} radius="md" />
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl" size="sm">承認待ちのデータはありません</Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="confirmed">
              {transactions.length > 0 ? (
                <TransactionList 
                  transactions={transactions} 
                  categoryOptions={categoryOptions}
                  handleFieldChange={handleFieldChange}
                  handleIgnore={handleIgnore}
                  handleApprove={handleApprove}
                />
              ) : loading ? (
                <Stack gap="md">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} padding="md" radius="md" withBorder>
                      <Skeleton h={20} w="30%" mb="sm" />
                      <Skeleton h={30} w="60%" mb="xs" />
                      <Skeleton h={15} w="80%" mb="md" />
                      <Skeleton h={40} radius="md" />
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl" size="sm">確認済みのデータはありません</Text>
              )}
            </Tabs.Panel>
          </motion.div>
        </AnimatePresence>

        <Menu 
          position="top-end" 
          withArrow 
          shadow="xl" 
          transitionProps={{ transition: 'pop-bottom-right' }}
          opened={isMenuOpened}
          onChange={setIsMenuOpened}
        >
          <Menu.Target>
            <ActionIcon 
              variant="filled" 
              color="black" 
              size={rem(56)} 
              radius="xl" 
              pos="fixed" 
              bottom={rem(100)} 
              right={rem(20)} 
              style={{ 
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', 
                zIndex: 99,
              }}
            >
              <motion.div
                animate={{ rotate: isMenuOpened ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={24} />
              </motion.div>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<PenLine size={16} />} onClick={open}>
              手動入力
            </Menu.Item>
            <Menu.Item leftSection={<History size={16} />} onClick={historyOpen}>
              過去履歴を登録
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Modal opened={opened} onClose={close} title="手動入力" centered>
          {/* ... existing modal ... */}
          <Stack gap="md">
            <DatePickerInput
              label="日付"
              value={newDate}
              onChange={(val) => setNewDate(val as Date | null)}
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

        {/* 過去履歴取得モーダル */}
        <Modal opened={historyOpened} onClose={historyClose} title="過去履歴を取り込む" centered>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              指定した期間のGmail通知を再解析し、不足している取引を取得します。
            </Text>
            <DatePickerInput
              type="range"
              label="期間を選択"
              placeholder="開始日 〜 終了日"
              value={historyRange}
              onChange={(val) => setHistoryRange(val as [Date | null, Date | null])}
              clearable
            />
            <Button 
              fullWidth 
              onClick={handleRequestHistory} 
              loading={isHistoryRequesting}
              mt="md"
              leftSection={<History size={16} />}
            >
              取得リクエストを送信
            </Button>
          </Stack>
        </Modal>
      </PageContainer>
    </Tabs>
  )
}

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  )
}
