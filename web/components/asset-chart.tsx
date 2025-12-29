'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
// 【修正】 CardBody を使い、CardContent と CardTitle を削除
import { Card, CardBody, CardHeader } from "@nextui-org/react"

type Props = {
  data: {
    date: string
    total: number
  }[]
}

export function AssetChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm border border-divider">
        <CardHeader>
          <h3 className="text-medium font-semibold tracking-tight">Asset History</h3>
        </CardHeader>
        <CardBody className="h-[250px] flex items-center justify-center">
          <p className="text-small text-default-400">データがありません</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border border-divider">
      <CardHeader>
        {/* 【修正】 CardTitle を h3 タグに変更 */}
        <h3 className="text-medium font-semibold tracking-tight">Asset History</h3>
      </CardHeader>
      {/* 【修正】 CardContent を CardBody に変更 */}
      <CardBody className="h-[250px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(str) => {
                try {
                  const date = new Date(str)
                  return `${date.getMonth() + 1}月`
                } catch {
                  return str
                }
              }}
            />
            <YAxis
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `¥${(val / 10000).toLocaleString()}万`}
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, "Net Worth"]}
            />
            <Area type="monotone" dataKey="total" stroke="#006FEE" fill="#60A5FA" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}