'use client'

import { useEffect, useState } from 'react'
import { getTransactions, updateTransaction, predictCategories, getCategories } from '@/app/actions'
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Spinner, Select, SelectItem, Input } from "@nextui-org/react"
import { Check, X, Wand2, CreditCard, CalendarDays, Search } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { toast } from "sonner"

type Category = { id: number; name: string }

export default function InboxPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [transData, catData] = await Promise.all([
        getTransactions({ 
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        categories.length > 0 ? Promise.resolve(categories) : getCategories()
      ])
      
      setTransactions(transData || [])
      if (catData.length > 0) setCategories(catData)
    } catch (e) {
      toast.error("データの取得に失敗しました")
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
      toast.success("AI提案を適用しました")
    } else {
      toast.info("対象となるデータがありません")
    }
    setAiLoading(false)
  }

  const handleApprove = async (t: any) => {
    if (!t.category_id) {
      toast.error("カテゴリを選択してください")
      return
    }
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== t.id))
    } else {
      setTransactions(prev => prev.map(item => item.id === t.id ? {...item, status: 'confirmed'} : item))
    }

    await updateTransaction(t.id, { status: 'confirmed', category_id: t.category_id })
    toast.success("承認しました")
  }

  const handleIgnore = async (id: string) => {
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== id))
    }
    await updateTransaction(id, { status: 'ignore' })
    toast.info("除外しました")
  }

  const handleCategoryChange = (transactionId: string, newCategoryId: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, category_id: Number(newCategoryId), ai_suggested: false } : t
    ))
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* フィルタリングヘッダー */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-divider px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold">Inbox</h1>
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat">{transactions.length}件</Chip>
              <Button size="sm" isIconOnly variant="light" onPress={loadData}><Search className="w-4 h-4"/></Button>
            </div>
          </div>
          
          {/* 検索条件エリア */}
          <div className="flex gap-2 items-center">
             <Select 
              size="sm"
              className="max-w-[140px]"
              defaultSelectedKeys={[statusFilter]}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter status"
            >
              <SelectItem key="pending" value="pending">未承認のみ</SelectItem>
              <SelectItem key="all" value="all">すべての履歴</SelectItem>
            </Select>
            <div className="flex-1">
              <Input 
                type="date" 
                size="sm"
                value={startDate}
                onValueChange={setStartDate}
                aria-label="Start date"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {statusFilter === 'pending' && transactions.length > 0 && (
          <Button 
            onPress={handleAiPredict} 
            isLoading={aiLoading}
            className="w-full bg-foreground text-background font-medium shadow-md mb-2"
            startContent={!aiLoading && <Wand2 className="w-4 h-4" />}
          >
            AI Categorize
          </Button>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-default-400">
            <p className="text-sm">データが見つかりません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((t) => (
              <Card key={t.id} className={`w-full border ${t.status === 'confirmed' ? 'opacity-60 bg-default-50' : 'shadow-sm border-divider'}`}>
                {t.status === 'confirmed' && (
                  <div className="absolute top-2 right-2 z-10">
                    <Chip size="sm" color="success" variant="flat">Approved</Chip>
                  </div>
                )}

                <CardHeader className="flex justify-between items-start pb-0 pt-4 px-4">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-tiny text-default-400">
                        <CalendarDays className="w-3 h-3 mr-1" />
                        {format(new Date(t.date), 'yyyy/MM/dd')}
                      </div>
                      <span className="text-lg font-bold tracking-tight">
                        ¥{t.amount.toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-medium font-semibold line-clamp-1">{t.description}</h3>
                    <div className="flex items-center text-tiny text-default-500">
                      <CreditCard className="w-3 h-3 mr-1" />
                      {t.accounts?.name}
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody className="py-3 px-4">
                  {/* NextUI Selectによるカテゴリ選択 */}
                  <Select
                    aria-label="Select Category"
                    placeholder="カテゴリを選択..."
                    selectedKeys={t.category_id ? [t.category_id.toString()] : []}
                    onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                    isDisabled={t.status === 'confirmed'}
                    variant="bordered"
                    size="sm"
                    // ▼ 修正: ラベルを外に出して重なりを防ぐ
                    labelPlacement="outside"
                    // ▼ 修正: ポップアップの背景色と境界線を明示して透過を防ぐ
                    popoverProps={{
                      classNames: {
                        content: "bg-background border border-default-200 shadow-lg"
                      }
                    }}
                    classNames={{
                      trigger: `min-h-[40px] bg-background ${!t.category_id ? 'border-danger text-danger' : ''}`,
                      value: "text-small font-medium",
                      innerWrapper: "gap-3", // アイコンとテキストの間隔
                    }}
                    // ▼ 修正: AIアイコンがある場合の表示調整
                    startContent={
                      t.ai_suggested ? <Wand2 className="w-3 h-3 text-purple-500 shrink-0" /> : undefined
                    }
                  >
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} textValue={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </Select>
                </CardBody>
                
                {t.status === 'pending' && (
                  <>
                    <div className="h-px w-full bg-divider"></div>
                    <CardFooter className="p-0 flex h-12">
                      <Button 
                        variant="light" 
                        radius="none" 
                        className="flex-1 h-full text-default-500 data-[hover=true]:text-danger"
                        onPress={() => handleIgnore(t.id)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                      <div className="w-px h-full bg-divider"></div>
                      <Button 
                        variant="light" 
                        radius="none" 
                        className="flex-1 h-full font-semibold text-primary data-[hover=true]:bg-primary/10"
                        onPress={() => handleApprove(t)}
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}