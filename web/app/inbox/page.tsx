'use client'

import { useEffect, useState } from 'react'
import { getTransactions, updateTransaction, predictCategories, getCategories } from '@/app/actions'
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Spinner, Select, SelectItem, Input } from "@nextui-org/react"
import { Check, X, Wand2, CreditCard, CalendarDays, Filter, Search } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { toast } from "sonner"

type Category = { id: number; name: string }

export default function InboxPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  // フィルタ状態
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd')) // デフォルト1ヶ月前
  const [endDate, setEndDate] = useState("") // 空なら指定なし

  // データロード関数
  const loadData = async () => {
    setLoading(true)
    try {
      // カテゴリマスタと取引データを取得
      const [transData, catData] = await Promise.all([
        getTransactions({ 
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        // カテゴリは初回のみ取得でも良いがシンプルにするため毎回確認
        categories.length > 0 ? Promise.resolve(categories) : getCategories()
      ])
      
      setTransactions(transData || [])
      if (catData.length > 0) setCategories(catData)
    } catch (e) {
      toast.error("データの取得に失敗しました")
    }
    setLoading(false)
  }

  // 初回ロード & フィルタ変更時ロード
  useEffect(() => {
    loadData()
  }, []) // 初回のみ。フィルタ変更は「検索」ボタンで行う運用にする

  // AI推論
  const handleAiPredict = async () => {
    setAiLoading(true)
    // 未承認かつカテゴリ未設定のものを対象にする
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

  // 承認処理
  const handleApprove = async (t: any) => {
    if (!t.category_id) {
      toast.error("カテゴリを選択してください")
      return
    }
    // 画面から消す（pending表示時のみ）
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== t.id))
    } else {
      // 全表示時はステータス見た目を変える
      setTransactions(prev => prev.map(item => item.id === t.id ? {...item, status: 'confirmed'} : item))
    }

    await updateTransaction(t.id, { status: 'confirmed', category_id: t.category_id })
    toast.success("承認しました")
  }

  // 除外処理
  const handleIgnore = async (id: string) => {
    if (statusFilter === 'pending') {
      setTransactions(prev => prev.filter(item => item.id !== id))
    }
    await updateTransaction(id, { status: 'ignore' })
    toast.info("除外しました")
  }

  // カテゴリ手動変更
  const handleCategoryChange = (transactionId: string, newCategoryId: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, category_id: Number(newCategoryId), ai_suggested: false } : t
    ))
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* フィルタリングヘッダー */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-divider px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold">Inbox</h1>
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat">{transactions.length}件</Chip>
              <Button size="sm" isIconOnly variant="light" onPress={loadData}><Search className="w-4 h-4"/></Button>
            </div>
          </div>
          
          {/* 検索条件エリア */}
          <div className="grid grid-cols-2 gap-2 text-small">
             <select 
              className="bg-default-100 rounded-md px-2 py-1 text-small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="pending">未承認のみ</option>
              <option value="all">すべての履歴</option>
            </select>
            <div className="flex gap-1">
              <input 
                type="date" 
                className="bg-default-100 rounded-md px-2 py-1 w-full text-small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* AIボタン (未承認表示時のみ) */}
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
                {/* 承認済みバッジ */}
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
                  {/* カテゴリ選択プルダウン (スマホネイティブUIを使用) */}
                  <div className="relative">
                    <select
                      className={`
                        w-full appearance-none bg-default-100 border-none rounded-lg py-2 pl-3 pr-8 text-small font-medium
                        focus:ring-2 focus:ring-primary focus:outline-none transition-colors
                        ${!t.category_id ? 'text-danger bg-danger/10' : 'text-foreground'}
                      `}
                      value={t.category_id || ""}
                      onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                      disabled={t.status === 'confirmed'} // 承認済みは編集不可（必要なら外す）
                    >
                      <option value="" disabled>カテゴリを選択...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {/* アイコン装飾 */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-default-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                    {/* AI提案マーク */}
                    {t.ai_suggested && (
                      <div className="absolute -top-2 -right-1">
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                      </div>
                    )}
                  </div>
                </CardBody>

                {/* アクションボタン (未承認時のみ表示) */}
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