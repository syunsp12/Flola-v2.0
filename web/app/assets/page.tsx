'use client'

import { useEffect, useState } from 'react'
import { getAccountsWithBalance, updateAssetBalance } from '@/app/actions'
import { Card, CardHeader, CardBody, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure, Spinner } from "@nextui-org/react"
import { Landmark, Wallet, CreditCard, RefreshCw, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from "sonner"

export default function AssetsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const {isOpen, onOpen, onOpenChange} = useDisclosure()
  
  // 編集用ステート
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [inputAmount, setInputAmount] = useState("")

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
    setInputAmount(account.current_amount.toString())
    onOpen()
  }

  // 保存処理
  const handleSave = async (onClose: () => void) => {
    if (!selectedAccount) return
    
    try {
      const amount = parseInt(inputAmount)
      if (isNaN(amount)) {
        toast.error("数値を入力してください")
        return
      }

      // 今日の日付で保存
      const today = format(new Date(), 'yyyy-MM-dd')
      
      await updateAssetBalance(selectedAccount.id, amount, today)
      
      toast.success("残高を更新しました")
      loadData() // リロード
      onClose()
    } catch (e) {
      toast.error("更新に失敗しました")
    }
  }

  // アイコン選択ロジック
  const getIcon = (type: string) => {
    switch(type) {
      case 'bank': return <Landmark className="w-5 h-5" />
      case 'credit_card': return <CreditCard className="w-5 h-5" />
      default: return <Wallet className="w-5 h-5" />
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-divider px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Assets</h1>
        <Button size="sm" variant="light" isIconOnly onPress={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          accounts.map((acc) => (
            <Card 
              key={acc.id} 
              isPressable 
              onPress={() => handleEdit(acc)}
              className="w-full shadow-sm border border-divider bg-content1"
            >
              <CardBody className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-medium ${acc.is_liability ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                    {getIcon(acc.type)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-medium font-medium">{acc.name}</span>
                    <span className="text-tiny text-default-400">
                      {acc.last_updated ? format(new Date(acc.last_updated), 'yyyy/MM/dd') : '未更新'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-large font-bold ${acc.is_liability ? 'text-danger' : 'text-foreground'}`}>
                    ¥ {acc.current_amount.toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-default-300" />
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

{/* 編集モーダル */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        placement="center"
        backdrop="blur"
        // モーダルの位置を少し上に調整し、スマホでのキーボード表示時に隠れにくくする
        classNames={{
          base: "m-4",
        }}
      >
        <ModalContent className="bg-background border border-default-200 shadow-xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-0">
                <span className="text-large font-bold">残高更新</span>
                <span className="text-small font-normal text-default-500">{selectedAccount?.name}</span>
              </ModalHeader>
              
              <ModalBody className="py-6">
                            <div className="space-y-1.5"> {/* ラベルと入力欄の隙間を調整 */}
                            <label className="text-small font-medium text-foreground">現在残高</label>
                            <Input
                                autoFocus
                                // label="現在残高"  <-- ここを削除
                                // labelPlacement="outside" <-- ここも削除
                                placeholder="0"
                                variant="bordered"
                                size="lg"
                                type="number"
                                value={inputAmount}
                                onValueChange={setInputAmount}
                                startContent={
                                <div className="pointer-events-none flex items-center">
                                    <span className="text-default-400 text-medium">¥</span>
                                </div>
                                }
                                description={`※ 本日の日付 (${format(new Date(), 'yyyy/MM/dd')}) で記録されます`}
                            />
</div>
              </ModalBody>

              <ModalFooter className="pt-0">
                <Button color="danger" variant="light" onPress={onClose}>
                  キャンセル
                </Button>
                <Button 
                  className="bg-foreground text-background font-medium shadow-md" 
                  onPress={() => handleSave(onClose)}
                >
                  保存する
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  )
}