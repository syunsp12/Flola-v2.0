'use client'

import { useEffect, useState } from 'react'
import { getAccountsWithBalance, updateAssetBalance } from '@/app/actions'
import { 
  Card, 
  Group, 
  Text, 
  ActionIcon, 
  Stack, 
  ThemeIcon, 
  Modal, 
  Button, 
  NumberInput, 
  Badge,
  Loader
} from "@mantine/core"
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Landmark, Wallet, CreditCard, RefreshCw, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

export default function AssetsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [opened, { open, close }] = useDisclosure(false)
  
  // 編集用ステート
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [inputAmount, setInputAmount] = useState<number | string>("")

  const loadData = async () => {
    setLoading(true)
    const data = await getAccountsWithBalance()
    setAccounts(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // モーダルを開く
  const handleEdit = (account: any) => {
    setSelectedAccount(account)
    setInputAmount(account.current_amount)
    open()
  }

  // 保存処理
  const handleSave = async () => {
    if (!selectedAccount) return
    
    try {
      const amount = Number(inputAmount)
      if (isNaN(amount)) {
        notifications.show({ message: '数値を入力してください', color: 'red' })
        return
      }

      // 今日の日付で保存
      const today = format(new Date(), 'yyyy-MM-dd')
      
      await updateAssetBalance(selectedAccount.id, amount, today)
      
      notifications.show({ message: '残高を更新しました', color: 'green' })
      loadData() // リロード
      close()
    } catch (e) {
      notifications.show({ message: '更新に失敗しました', color: 'red' })
    }
  }

  // アイコン選択ロジック
  const getIcon = (type: string) => {
    switch(type) {
      case 'bank': return <Landmark size={20} />
      case 'credit_card': return <CreditCard size={20} />
      default: return <Wallet size={20} />
    }
  }

  return (
    <>
      <PageHeader
        title="Assets"
        children={
          <ActionIcon variant="light" size="lg" onClick={loadData}>
            <RefreshCw size={18} />
          </ActionIcon>
        }
      />

      <PageContainer>
        {loading ? (
          <Group justify="center" py="xl"><Loader type="dots" /></Group>
        ) : (
          <Stack gap="sm">
            {accounts.map((acc) => (
              <Card 
                key={acc.id} 
                padding="md" 
                radius="md" 
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleEdit(acc)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <ThemeIcon 
                      size="xl" 
                      radius="md" 
                      variant="light" 
                      color={acc.is_liability ? 'red' : 'indigo'}
                    >
                      {getIcon(acc.type)}
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={500} size="sm">{acc.name}</Text>
                      <Text size="xs" c="dimmed">
                        {acc.last_updated ? format(new Date(acc.last_updated), 'yyyy/MM/dd') : '未更新'}
                      </Text>
                    </Stack>
                  </Group>
                  
                  <Group gap="xs">
                    <Text fw={700} size="lg" c={acc.is_liability ? 'red' : undefined}>
                      ¥ {acc.current_amount.toLocaleString()}
                    </Text>
                    <ChevronRight size={16} color="var(--mantine-color-gray-5)" />
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}

        {/* 編集モーダル */}
        <Modal 
          opened={opened} 
          onClose={close} 
          title={
            <Stack gap={0}>
              <Text fw={700}>残高更新</Text>
              <Text size="xs" c="dimmed">{selectedAccount?.name}</Text>
            </Stack>
          }
          centered
        >
          <Stack gap="md" py="xs">
             <NumberInput
               label="現在残高"
               description={`※ 本日の日付 (${format(new Date(), 'yyyy/MM/dd')}) で記録されます`}
               placeholder="0"
               leftSection="¥"
               value={inputAmount}
               onChange={setInputAmount}
               hideControls
               size="lg"
               autoFocus
             />
             <Group justify="flex-end" mt="md">
               <Button variant="default" onClick={close}>キャンセル</Button>
               <Button onClick={handleSave}>保存する</Button>
             </Group>
          </Stack>
        </Modal>
      </PageContainer>
    </>
  )
}
