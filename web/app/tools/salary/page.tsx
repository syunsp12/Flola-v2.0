'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody, Button, Input, Divider, Spinner } from "@nextui-org/react"
import { UploadCloud, CheckCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"

export default function SalaryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // ファイルアップロード＆解析
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', e.target.files[0])

    try {
      const res = await fetch('/api/analyze/salary', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Analysis failed')
      
      const data = await res.json()
      setResult(data)
      toast.success("解析完了")
    } catch (err) {
      toast.error("解析に失敗しました")
    }
    setLoading(false)
  }

  // DB保存
  const handleSave = async () => {
    if (!result) return
    setLoading(true)

    try {
      // 1. 収入トランザクション作成
      // 口座ID取得 (三井住友銀行と仮定。本来は選択式)
      const { data: account } = await supabase.from('accounts').select('id').eq('name', '三井住友銀行').single()
      const { data: category } = await supabase.from('categories').select('id').eq('name', '給与').single()

      if (!account || !category) throw new Error("Account/Category not found")

      const { data: trans, error: transError } = await supabase
        .from('transactions')
        .insert({
          date: result.date,
          amount: result.total_payment,
          description: '給与振込',
          type: 'income',
          to_account_id: account.id,
          category_id: category.id,
          status: 'confirmed',
          source: 'salary_pdf'
        })
        .select()
        .single()

      if (transError) throw transError

      // 2. 詳細(salary_slips)保存
      await supabase.from('salary_slips').insert({
        transaction_id: trans.id,
        base_pay: result.base_pay,
        overtime_pay: result.overtime_pay,
        tax_total: result.tax,
        insurance_total: result.social_insurance,
        details: result
      })

      // 3. 持株会振替 (あれば)
      if (result.stock_deduction > 0) {
        // 持株会口座ID取得
        const { data: stockAcc } = await supabase.from('accounts').select('id').eq('name', '野村持株会').single()
        
        if (stockAcc) {
          // 振替レコード作成 (給与天引き分を移動)
          await supabase.from('transactions').insert({
            date: result.date,
            amount: result.stock_deduction,
            description: '持株会拠出 (天引き)',
            type: 'transfer',
            from_account_id: null, // 外部からの移動扱いにしたいが、厳格モデルでは一旦NULLか、仮想口座を使う
            // 簡易的に「収入」として計上せずに直接資産が増える形にするか、
            // 「給与(額面)」を収入にしてから「天引き」を支出/振替にするか。
            // ここではシンプルに「手取りとは別に入ってきた資産」として記録するため
            // 特殊なIncomeとして登録するか、別途調整が必要。
            // 今回は「振替先だけある特殊レコード」として登録
            to_account_id: stockAcc.id,
            status: 'confirmed',
            source: 'salary_deduction'
          })
        }
      }

      toast.success("登録しました")
      router.push('/')
    } catch (e) {
      console.error(e)
      toast.error("保存に失敗しました")
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/tools">
          <Button isIconOnly variant="light" size="sm"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-xl font-bold">給与明細登録</h1>
      </div>

      {!result ? (
        <Card className="h-64 border-2 border-dashed border-default-300 shadow-none bg-default-50">
          <CardBody className="flex flex-col items-center justify-center gap-4 text-default-500">
            {loading ? (
              <Spinner label="解析中..." size="lg" />
            ) : (
              <>
                <UploadCloud className="w-12 h-12" />
                <p className="text-sm">PDFファイルをアップロード</p>
                <input 
                  type="file" 
                  accept="application/pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="flex gap-3 bg-content2">
              <CheckCircle className="w-6 h-6 text-success" />
              <div className="flex flex-col">
                <p className="text-md font-bold">解析結果</p>
                <p className="text-small text-default-500">{result.date}</p>
              </div>
            </CardHeader>
            <Divider/>
            <CardBody className="space-y-4">
              <Input label="支給日" value={result.date} variant="bordered" readOnly />
              <Input label="手取り振込額" value={result.total_payment?.toLocaleString()} variant="bordered" startContent="¥" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="基本給" value={result.base_pay?.toLocaleString()} variant="bordered" size="sm" />
                <Input label="残業代" value={result.overtime_pay?.toLocaleString()} variant="bordered" size="sm" />
              </div>
              <Input label="持株会拠出" value={result.stock_deduction?.toLocaleString() || "0"} variant="bordered" color="primary" />
            </CardBody>
          </Card>

          <Button 
            size="lg" 
            className="w-full bg-foreground text-background font-bold shadow-lg"
            isLoading={loading}
            onPress={handleSave}
          >
            確定して登録
          </Button>
          
          <Button variant="light" className="w-full text-danger" onPress={() => setResult(null)}>
            やり直す
          </Button>
        </div>
      )}
    </main>
  )
}