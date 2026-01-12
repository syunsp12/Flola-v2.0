'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Group, Text, Stack } from "@mantine/core"

type Props = {
  data: {
    date: string
    total: number
  }[]
}

export function AssetChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card withBorder shadow="sm" radius="lg" className="p-4">
        <Card.Section className="border-b p-4">
          <Text fw={600} size="sm">Asset History</Text>
        </Card.Section>
        <Stack justify="center" align="center" className="h-[250px]">
          <Text size="sm" c="dimmed">データがありません</Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Card withBorder shadow="sm" radius="lg" className="p-4">
      <Card.Section className="border-b p-4">
        <Text fw={600} size="sm">Asset History</Text>
      </Card.Section>
      <Card.Section className="h-[250px] p-2">
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
            <Area type="monotone" dataKey="total" stroke="#4C6EF5" fill="#82C91E" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card.Section>
    </Card>
  )
}