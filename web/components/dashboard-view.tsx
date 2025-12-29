'use client'

import { Card, CardBody } from "@nextui-org/react"
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  totalAssets: number
  totalExpense: number
}

export function DashboardView({ totalAssets, totalExpense }: Props) {
  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Dashboard</h1>
      <p className="text-small text-default-500 mb-6">Financial Overview</p>

      {/* 総資産カード */}
      <Card className="bg-foreground text-background shadow-lg mb-6">
        <CardBody className="p-6">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Wallet className="w-4 h-4" />
            <span className="text-small font-medium">Total Assets</span>
          </div>
          <div className="text-4xl font-bold tracking-tighter">
            ¥ {totalAssets.toLocaleString()}
          </div>
        </CardBody>
      </Card>

      {/* サブカード */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border border-divider">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-2 text-default-500">
              <TrendingDown className="w-4 h-4" />
              <span className="text-tiny font-medium uppercase">Expenses</span>
            </div>
            <div className="text-xl font-bold">
              ¥ {totalExpense.toLocaleString()}
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-divider">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-2 text-default-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-tiny font-medium uppercase">Income</span>
            </div>
            <div className="text-xl font-bold text-default-400">
              ¥ -
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}