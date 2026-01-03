'use client'

import { useEffect, useState } from 'react'
import { 
  getAccountsWithBalance, 
  updateAssetBalance, 
  createAccount, 
  updateAccount, 
  deleteAccount,
  getAssetHistory,
  getSalaryHistory,
  getAssetGroups
} from '@/app/actions'
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
  Loader,
  Menu,
  TextInput,
  Select,
  Checkbox,
  Image,
  Box,
  rem,
  Divider
} from "@mantine/core"
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { Landmark, Wallet, CreditCard, RefreshCw, Plus, Trash2, MoreVertical, Settings2, Upload, ImageIcon, X, Image as LucideImage } from 'lucide-react'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { getSmartIconUrl, getCardBrandLogo } from '@/lib/utils/icon-helper'
import { LOGO_MASTER } from '@/lib/constants/logos'
import Assets from '@/components/Assets'

// 各口座カードのコンポーネント
function AccountCard({ acc, getIcon, onEdit, onEditAccount, onDeleteAccount }: any) {
  const [imageError, setImageError] = useState(false);
  const iconUrl = getSmartIconUrl(acc.name, acc.icon_url);
  const brandLogo = getCardBrandLogo(acc.card_brand);
  
  // 資産グループ名を取得（リレーション先から）
  const groupName = acc.asset_groups?.name || acc.type;

  return (
    <Card 
      padding="md" 
      radius="md" 
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => onEdit(acc)}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
          <Box pos="relative">
            {(iconUrl && !imageError) ? (
              <Image
                src={iconUrl}
                alt=""
                w={40}
                h={40}
                radius="md"
                onError={() => setImageError(true)}
              />
            ) : (
              <ThemeIcon 
                size="2.5rem" 
                radius="md" 
                variant="light" 
                color={acc.is_liability ? 'red' : 'indigo'}
              >
                {getIcon(acc.type)}
              </ThemeIcon>
            )}

            {brandLogo && (
              <Box 
                pos="absolute" 
                bottom={-3} 
                right={-3} 
                bg="white" 
                p={1.5} 
                style={{ 
                  border: '1px solid var(--mantine-color-gray-2)',
                  borderRadius: rem(2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--mantine-shadow-xs)' 
                }}
              >
                <Image 
                  src={brandLogo} 
                  w={12} 
                  h={8} 
                  fit="contain" 
                  alt="brand" 
                />
              </Box>
            )}
          </Box>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap={6}>
              <Text fw={700} size="sm" truncate>{acc.name}</Text>
              <Badge size="9px" variant="dot" color={acc.asset_groups?.color || 'gray'}>
                {groupName}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {acc.last_updated ? format(new Date(acc.last_updated), 'yyyy/MM/dd') : '未更新'}
            </Text>
          </Stack>
        </Group>
        
        <Group gap="xs" wrap="nowrap">
          <Text fw={800} style={{ fontSize: '1.1rem' }} c={acc.is_liability ? 'red' : undefined}>
            ¥ {acc.current_amount.toLocaleString()}
          </Text>
          
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon 
                variant="subtle" 
                color="gray" 
                size="2rem"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Label>管理</Menu.Label>
              <Menu.Item 
                leftSection={<Settings2 size={14} />} 
                onClick={() => onEditAccount(acc)}
              >
                口座設定を変更
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                color="red" 
                leftSection={<Trash2 size={14} />}
                onClick={() => onDeleteAccount(acc.id)}
              >
                口座を削除
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Card>
  );
}

export default function AssetsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [assetGroups, setAssetGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [opened, { open, close }] = useDisclosure(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [inputAmount, setInputAmount] = useState<number | string>("")

  const [accOpened, { open: accOpen, close: accClose }] = useDisclosure(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [accName, setAccName] = useState("")
  const [accType, setAccType] = useState("bank")
  const [accIsLiability, setAccIsLiability] = useState(false)
  const [accIconUrl, setAccIconUrl] = useState("")
  const [accCardBrand, setAccCardBrand] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [accData, agData] = await Promise.all([
        getAccountsWithBalance(),
        getAssetGroups()
      ])
      setAccounts(accData)
      setAssetGroups(agData)
    } catch (e) {
      console.error("Assets load error:", e)
      notifications.show({ message: 'データの取得に失敗しました。ブラウザのコンソールを確認してください。', color: 'red' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 残高更新モーダルを開く
  const handleEditBalance = (account: any) => {
    setSelectedAccount(account)
    setInputAmount(account.current_amount)
    open()
  }

  // 口座管理モーダルを開く (新規/編集)
  const handleOpenAccModal = (account?: any) => {
    if (account) {
      setEditingAccount(account)
      setAccName(account.name)
      setAccType(account.type)
      setAccIsLiability(account.is_liability)
      setAccIconUrl(account.icon_url || "")
      setAccCardBrand(account.card_brand || null)
    } else {
      setEditingAccount(null)
      setAccName("")
      setAccType("bank")
      setAccIsLiability(false)
      setAccIconUrl("")
      setAccCardBrand(null)
    }
    accOpen()
  }

  // 残高の保存
  const handleSaveBalance = async () => {
    if (!selectedAccount) return
    try {
      await updateAssetBalance(selectedAccount.id, Number(inputAmount), format(new Date(), 'yyyy-MM-dd'))
      notifications.show({ message: '残高を更新しました', color: 'green' })
      loadData()
      close()
    } catch (e) {
      notifications.show({ message: '更新に失敗しました', color: 'red' })
    }
  }

  // 口座情報の保存
  const handleSaveAccount = async () => {
    if (!accName) return
    try {
      const data = { 
        name: accName, 
        type: accType, 
        is_liability: accIsLiability,
        icon_url: accIconUrl || null,
        card_brand: accCardBrand || null
      }
      if (editingAccount) {
        await updateAccount(editingAccount.id, data)
        notifications.show({ message: '口座情報を更新しました', color: 'green' })
      } else {
        await createAccount(data)
        notifications.show({ message: '新しい口座を作成しました', color: 'green' })
      }
      loadData()
      accClose()
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("この口座を削除しますか？関連する取引がある場合は削除できません。")) return
    try {
      await deleteAccount(id)
      notifications.show({ message: '削除しました', color: 'gray' })
      loadData()
    } catch (e: any) {
      notifications.show({ message: e.message, color: 'red' })
    }
  }

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
          <>
            <ActionIcon variant="light" size="2rem" onClick={() => handleOpenAccModal()}>
              <Plus size={18} />
            </ActionIcon>
            <ActionIcon variant="light" size="2rem" onClick={loadData}>
              <RefreshCw size={18} />
            </ActionIcon>
          </>
        }
      />

      <PageContainer>
        {loading ? (
          <Group justify="center" py="xl"><Loader type="dots" /></Group>
        ) : (
          <Stack gap="sm">
            {accounts.map((acc) => (
              <AccountCard 
                key={acc.id} 
                acc={acc} 
                getIcon={getIcon} 
                onEdit={handleEditBalance} 
                onEditAccount={handleOpenAccModal}
                onDeleteAccount={handleDeleteAccount}
              />
            ))}
          </Stack>
        )}

        <Modal opened={opened} onClose={close} centered radius="lg" title={
          <Stack gap={0}>
            <Text fw={800}>残高を更新</Text>
            <Text size="xs" c="dimmed">{selectedAccount?.name}</Text>
          </Stack>
        }>
          <Stack gap="md" py="xs">
             <NumberInput
               label="現在の正確な残高を入力"
               placeholder="0"
               leftSection="¥"
               value={inputAmount}
               onChange={setInputAmount}
               hideControls
               size="lg"
               autoFocus
             />
             <Button fullWidth size="md" onClick={handleSaveBalance} radius="md">
               保存する
             </Button>
          </Stack>
        </Modal>

        <Modal opened={accOpened} onClose={accClose} centered radius="lg" title={
          <Text fw={800}>口座の{editingAccount ? '設定変更' : '新規登録'}</Text>
        }>
          <Stack gap="md">
            <TextInput
              label="口座名"
              placeholder="例: 三井住友銀行"
              value={accName}
              onChange={(e) => setAccName(e.currentTarget.value)}
              required
            />
            <Select
              label="種類"
              placeholder="選択してください"
              data={assetGroups.map(ag => ({ value: ag.id, label: ag.name }))}
              value={accType}
              onChange={(val) => setAccType(val || 'bank')}
            />
            <Checkbox
              label="この口座を負債として扱う"
              description="残高をマイナス資産として計算します"
              checked={accIsLiability}
              onChange={(e) => setAccIsLiability(e.currentTarget.checked)}
            />

            <Divider label="ロゴ・アイコン設定" labelPosition="center" my="sm" />

            <Group gap="md" align="center">
              <Image 
                src={accIconUrl || getSmartIconUrl(accName || "")} 
                w={50} h={50} 
                radius="md" 
                fallbackSrc="https://placehold.co/50x50?text=?"
              />
              <Box>
                <Text fw={700} size="sm">表示プレビュー</Text>
                <Text size="xs" c="dimmed">現在のアイコンまたは自動推測</Text>
              </Box>
            </Group>

            <Dropzone
              onDrop={(files) => {
                const file = files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                  setAccIconUrl(event.target?.result as string);
                };
                reader.readAsDataURL(file);
              }}
              onReject={() => notifications.show({ message: '無効なファイルです', color: 'red' })}
              maxSize={3 * 1024 ** 2}
              accept={IMAGE_MIME_TYPE}
              radius="md"
              useFsAccessApi={false}
            >
              <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <Upload size={30} color="var(--mantine-color-blue-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <X size={30} color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <LucideImage size={30} color="var(--mantine-color-dimmed)" />
                </Dropzone.Idle>

                <div>
                  <Text size="xs" inline>画像をドラッグ＆ドロップ</Text>
                  <Text size="xs" c="dimmed" inline mt={4}>
                    またはクリックして選択 (3MBまで)
                  </Text>
                </div>
              </Group>
            </Dropzone>
            
            <TextInput
              label="または ロゴURL を直接入力"
              placeholder="https://.../logo.png"
              value={accIconUrl}
              onChange={(e) => setAccIconUrl(e.currentTarget.value)}
              size="xs"
            />

            {/* クレジットカード時のみブランド選択を表示 */}
            {accType === 'credit_card' && (
              <Select
                label="カードブランド"
                placeholder="選択してください"
                data={[
                  { value: 'visa', label: 'VISA' },
                  { value: 'mastercard', label: 'Mastercard' },
                  { value: 'jcb', label: 'JCB' },
                  { value: 'amex', label: 'American Express' },
                  { value: 'diners', label: 'Diners Club' },
                ]}
                value={accCardBrand}
                onChange={setAccCardBrand}
                clearable
                size="xs"
              />
            )}

            <Button fullWidth mt="md" onClick={handleSaveAccount}>
              {editingAccount ? '変更を保存' : '口座を作成'}
            </Button>
          </Stack>
        </Modal>
      </PageContainer>
    </>
  )
}
