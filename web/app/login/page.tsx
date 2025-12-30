'use client'

import { useState } from 'react'
import { login } from './actions'
import { Card, CardHeader, CardBody, CardFooter, Input, Button } from "@nextui-org/react"
import { LockKeyhole } from 'lucide-react'
import { toast } from "sonner" // トースト通知用

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault() // ブラウザの標準送信をキャンセル
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      // サーバーアクションを呼び出し
      const result = await login(formData)
      
      // エラーが返ってきた場合
      if (result?.error) {
        toast.error("ログイン失敗: " + result.error)
        setLoading(false)
      }
      // 成功時は自動的にリダイレクトされるため、ここでの処理は不要
      
    } catch (error) {
      console.error(error)
      toast.error("予期せぬエラーが発生しました")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
          <div className="p-3 bg-primary/10 rounded-full mb-2">
            <LockKeyhole className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Welcome Back</h1>
          <p className="text-small text-default-500">Flola v2 にログイン</p>
        </CardHeader>
        
        {/* onSubmitイベントを追加 */}
        <form onSubmit={handleSubmit}>
          <CardBody className="gap-4 py-6">
            <Input
              name="email"
              label="Email"
              placeholder="Enter your email"
              variant="bordered"
              type="email"
              isRequired
            />
            <Input
              name="password"
              label="Password"
              placeholder="Enter your password"
              variant="bordered"
              type="password"
              isRequired
            />
          </CardBody>
          <CardFooter className="flex flex-col gap-2 pt-0 pb-6">
            <Button 
              type="submit" 
              className="w-full bg-foreground text-background font-medium shadow-md"
              isLoading={loading} // ローディング表示
            >
              {loading ? "認証中..." : "ログイン"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}