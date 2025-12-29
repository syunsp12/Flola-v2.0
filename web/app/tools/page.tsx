'use client'

import Link from 'next/link'
import { Card, CardBody } from "@nextui-org/react"
import { FileText, TrendingUp, Building2 } from 'lucide-react'

export default function ToolsPage() {
  const tools = [
    {
      title: "給与明細分析",
      desc: "PDFをアップロードして収入登録",
      icon: FileText,
      href: "/tools/salary",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "年金・iDeCo (準備中)",
      desc: "資産状況の確認",
      icon: Building2,
      href: "#",
      color: "text-gray-400",
      bg: "bg-gray-100"
    },
    {
      title: "持株会 (準備中)",
      desc: "拠出・評価額の確認",
      icon: TrendingUp,
      href: "#",
      color: "text-gray-400",
      bg: "bg-gray-100"
    }
  ]

  return (
    <main className="min-h-screen bg-background pb-20 p-6">
      <h1 className="text-2xl font-bold mb-6">Tools</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {tools.map((tool, i) => (
          <Link key={i} href={tool.href} className="block">
            <Card isPressable className="w-full shadow-sm border border-divider">
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <div className={`p-3 rounded-xl ${tool.bg} ${tool.color}`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold">{tool.title}</span>
                  <span className="text-small text-default-500">{tool.desc}</span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}