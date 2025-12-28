'use client'

import { useEffect, useState } from 'react'
import { getPendingTransactions, updateTransaction, predictCategories, getCategories } from './actions'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, Wand2 } from 'lucide-react'
import { format } from 'date-fns'

// カテゴリの型定義
type Category = {
  id: number
  name: string
}

export default function Home() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([]) // カテゴリマスタ
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  // データロード
  const loadData = async () => {
    setLoading(true)
    // 取引データとカテゴリマスタを並行して取得
    const [transData, catData] = await Promise.all([
      getPendingTransactions(),
      getCategories()
    ])
    setTransactions(transData || [])
    setCategories(catData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // カテゴリIDから名前を引くヘルパー関数
  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : `ID:${id}`
  }

  // AI自動分類の実行
  const handleAiPredict = async () => {
    setAiLoading(true)
    const descriptions = Array.from(new Set(transactions.map(t => t.description || "")))
    
    if (descriptions.length > 0) {
      const suggestions = await predictCategories(descriptions)
      
      setTransactions(prev => prev.map(t => {
        if (t.description && suggestions[t.description]) {
          return { ...t, category_id: suggestions[t.description], ai_suggested: true }
        }
        return t
      }))
    }
    setAiLoading(false)
  }

  // 承認アクション
  const handleApprove = async (t: any) => {
    if (!t.category_id) {
      alert("カテゴリが決まっていません")
      return
    }

    // 楽観的UI更新（先に消す）
    setTransactions(prev => prev.filter(item => item.id !== t.id))

    await updateTransaction(t.id, {
      status: 'confirmed',
      category_id: t.category_id
    })
  }

  // 除外アクション
  const handleIgnore = async (id: string) => {
    setTransactions(prev => prev.filter(item => item.id !== id))
    await updateTransaction(id, { status: 'ignore' })
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-lg text-slate-800">💰 Flola Inbox</h1>
        <Badge variant="secondary">{transactions.length} 件</Badge>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* アクションバー */}
        {transactions.length > 0 && (
          <Button 
            onClick={handleAiPredict} 
            disabled={aiLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
          >
            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            AIでカテゴリを自動提案
          </Button>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>未承認の取引はありません 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <Card key={t.id} className="overflow-hidden border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start space-y-0">
                  <div>
                    <p className="text-xs text-slate-500">{format(new Date(t.date), 'yyyy/MM/dd')}</p>
                    <CardTitle className="text-base mt-1">{t.description}</CardTitle>
                    <p className="text-xs text-slate-400 mt-1">{t.accounts?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-lg">¥{t.amount.toLocaleString()}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="p-3 pt-2">
                  <div className="flex items-center gap-2">
                    {t.category_id ? (
                      <Badge variant={t.ai_suggested ? "default" : "secondary"} className={t.ai_suggested ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200" : ""}>
                        {t.ai_suggested && "✨ "}{getCategoryName(t.category_id)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">未分類</Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-0 flex border-t bg-slate-50">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none border-r h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => handleIgnore(t.id)}
                  >
                    <X className="h-5 w-5 mr-1" /> 除外
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none h-12 text-blue-600 font-bold hover:bg-blue-50 transition-colors"
                    onClick={() => handleApprove(t)}
                  >
                    <Check className="h-5 w-5 mr-1" /> 承認
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}