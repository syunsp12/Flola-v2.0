'use client'

import { useEffect, useState } from 'react'
import { getJobStatuses, getSystemLogs, getCategories, createCategory, updateCategory, deleteCategory } from '@/app/actions'
import { Card, CardBody, Button, Chip, Tabs, Tab, ScrollShadow, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure, Textarea, RadioGroup, Radio, cn } from "@nextui-org/react"
import { Activity, FileText, RefreshCw, Server, AlertCircle, CheckCircle2, Clock, Tag, Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from "sonner"

// --- 型定義 ---
type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  keywords: string[] | null
}

// --- モダンなラジオボタン用コンポーネント ---
export const CustomRadio = (props: any) => {
  const {children, ...otherProps} = props

  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
          "inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between",
          "flex-row-reverse max-w-[300px] cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent",
          "data-[selected=true]:border-primary"
        ),
      }}
    >
      {children}
    </Radio>
  )
}

export default function AdminPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // カテゴリ編集モーダル用
  const {isOpen, onOpen, onOpenChange} = useDisclosure()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // フォームステート
  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<'income' | 'expense'>("expense")
  const [catKeywords, setCatKeywords] = useState("")

  const loadData = async () => {
    setLoading(true)
    const [jobsData, logsData, catsData] = await Promise.all([
      getJobStatuses(),
      getSystemLogs(),
      getCategories()
    ])
    setJobs(jobsData || [])
    setLogs(logsData || [])
    setCategories(catsData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // モーダルオープン時の処理
  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCatName(category.name)
      setCatType(category.type)
      setCatKeywords(category.keywords?.join(", ") || "")
    } else {
      setEditingCategory(null)
      setCatName("")
      setCatType("expense")
      setCatKeywords("")
    }
    onOpen()
  }

  // 保存処理
  const handleSaveCategory = async (onClose: () => void) => {
    if (!catName) {
      toast.error("カテゴリ名は必須です")
      return
    }
    
    // キーワードを配列に変換
    const keywordsArray = catKeywords.split(",").map(k => k.trim()).filter(k => k !== "")

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, catName, catType, keywordsArray)
        toast.success("カテゴリを更新しました")
      } else {
        await createCategory(catName, catType, keywordsArray)
        toast.success("カテゴリを作成しました")
      }
      loadData()
      onClose()
    } catch (e: any) {
      toast.error(e.message || "エラーが発生しました")
    }
  }

  // 削除処理
  const handleDeleteCategory = async (id: number) => {
    if (!confirm("本当に削除しますか？使用中のカテゴリは削除できません。")) return
    try {
      await deleteCategory(id)
      toast.success("削除しました")
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ステータス表示ヘルパー
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'success': return { icon: <CheckCircle2 className="w-4 h-4" />, color: "success" as const }
      case 'failed': return { icon: <AlertCircle className="w-4 h-4" />, color: "danger" as const }
      case 'running': return { icon: <Activity className="w-4 h-4 animate-pulse" />, color: "primary" as const }
      default: return { icon: <Clock className="w-4 h-4" />, color: "default" as const }
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-divider px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Admin</h1>
        <Button size="sm" variant="light" isIconOnly onPress={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 max-w-md mx-auto">
        <Tabs aria-label="Admin Options" className="w-full" fullWidth>
          
          {/* --- カテゴリ管理タブ --- */}
          <Tab key="categories" title={
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4" />
              <span>Categories</span>
            </div>
          }>
            <div className="mt-4 space-y-4 pb-20">
              <Button 
                className="w-full bg-foreground text-background font-medium shadow-md" 
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => handleOpenModal()}
              >
                新規カテゴリ追加
              </Button>

              <ScrollShadow className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <Card key={cat.id} className="shadow-sm border border-divider">
                      <CardBody className="p-3 flex flex-row justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{cat.name}</span>
                            <Chip size="sm" variant="flat" color={cat.type === 'expense' ? "danger" : "success"}>
                              {cat.type === 'expense' ? '支出' : '収入'}
                            </Chip>
                          </div>
                          <p className="text-tiny text-default-400 mt-1 line-clamp-1">
                            {cat.keywords?.join(", ")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenModal(cat)}>
                            <Pencil className="w-4 h-4 text-default-500" />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </ScrollShadow>
            </div>
          </Tab>

          {/* --- ジョブ監視タブ --- */}
          <Tab key="jobs" title={
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Jobs</span>
            </div>
          }>
            <div className="space-y-3 mt-4">
              {loading ? <div className="flex justify-center py-10"><Spinner /></div> : 
               jobs.map((job) => {
                 const { icon, color } = getStatusInfo(job.last_status)
                 return (
                   <Card key={job.job_id} className="border border-divider shadow-sm">
                     <CardBody className="p-4">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-col">
                           <span className="font-bold text-medium">{job.job_id}</span>
                           <span className="text-tiny text-default-400">Last Run</span>
                         </div>
                         <Chip startContent={icon} color={color} size="sm" variant="flat" className="capitalize">
                           {job.last_status}
                         </Chip>
                       </div>
                       <div className="flex justify-between items-end">
                         <span className="text-small font-mono text-default-600">
                           {job.last_run_at ? format(new Date(job.last_run_at), 'MM/dd HH:mm') : 'Never'}
                         </span>
                       </div>
                       {job.message && (
                         <div className="mt-3 p-2 bg-default-100 rounded-md text-tiny font-mono text-default-600 truncate">
                           {job.message}
                         </div>
                       )}
                     </CardBody>
                   </Card>
                 )
               })
              }
            </div>
          </Tab>

          {/* --- ログ閲覧タブ --- */}
          <Tab key="logs" title={
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Logs</span>
            </div>
          }>
            <ScrollShadow className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-2 pb-20">
                {logs.map((log) => (
                   <div key={log.id} className="flex gap-3 p-3 border-b border-divider last:border-none">
                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                       log.level === 'error' ? 'bg-danger' : 
                       log.level === 'warning' ? 'bg-warning' : 'bg-primary'
                     }`} />
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-tiny font-bold text-default-600">{log.source}</span>
                         <span className="text-[10px] text-default-400 font-mono">
                           {format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}
                         </span>
                       </div>
                       <p className="text-small text-foreground break-words leading-snug">
                         {log.message}
                       </p>
                     </div>
                   </div>
                 ))
                }
              </div>
            </ScrollShadow>
          </Tab>
        </Tabs>
      </div>

      {/* カテゴリ編集モーダル */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        placement="center" 
        backdrop="blur" 
        classNames={{base: "m-4"}}
      >
        <ModalContent className="bg-background border border-default-200 shadow-xl">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-divider">
                カテゴリ{editingCategory ? '編集' : '追加'}
              </ModalHeader>
              
              <ModalBody className="py-6">
                <div className="space-y-6">
                  
                  {/* カテゴリ名 */}
                  <div className="space-y-2">
                    <label className="text-small font-bold text-foreground">カテゴリ名</label>
                    <Input
                      placeholder="例: 食費"
                      variant="bordered"
                      size="lg"
                      value={catName}
                      onValueChange={setCatName}
                      classNames={{ input: "text-medium" }}
                    />
                  </div>

                  {/* 収支タイプ (モダンなカード型ラジオボタン) */}
                  <div className="space-y-2">
                    <label className="text-small font-bold text-foreground">収支タイプ</label>
                    <RadioGroup
                      orientation="horizontal"
                      value={catType}
                      onValueChange={(val) => setCatType(val as 'income' | 'expense')}
                      classNames={{ wrapper: "gap-3" }}
                    >
                      <CustomRadio value="expense" description="お金が出ていく取引" color="danger">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="w-5 h-5 text-danger" />
                          <span className="text-danger font-bold">支出 (Expense)</span>
                        </div>
                      </CustomRadio>
                      <CustomRadio value="income" description="お金が入ってくる取引" color="success">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="w-5 h-5 text-success" />
                          <span className="text-success font-bold">収入 (Income)</span>
                        </div>
                      </CustomRadio>
                    </RadioGroup>
                  </div>

                  {/* AI用キーワード */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <label className="text-small font-bold text-foreground">AI用キーワード</label>
                      <span className="text-tiny text-default-400">カンマ(,)区切り</span>
                    </div>
                    <Textarea
                      placeholder="スーパー, コンビニ, マクドナルド"
                      variant="bordered"
                      size="lg"
                      minRows={3}
                      value={catKeywords}
                      onValueChange={setCatKeywords}
                      classNames={{ input: "text-medium leading-relaxed" }}
                    />
                    <p className="text-tiny text-default-400 px-1">
                      ※ ここに入力した単語が含まれると、AIがこのカテゴリを優先的に提案します。
                    </p>
                  </div>

                </div>
              </ModalBody>

              <ModalFooter className="border-t border-divider">
                <Button color="danger" variant="light" onPress={onClose}>
                  キャンセル
                </Button>
                <Button className="bg-foreground text-background font-medium shadow-md" onPress={() => handleSaveCategory(onClose)}>
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  )
}