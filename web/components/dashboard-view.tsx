'use client'

import Link from 'next/link'
import { Card, Text, Group, SimpleGrid, ThemeIcon, Stack, RingProgress, Paper, Center, Table, Badge, Grid } from "@mantine/core"
import { Wallet, TrendingUp, TrendingDown, CreditCard, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'

type DashboardData = {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthlyFlowData: { month: string; income: number; expense: number }[]
  categoryRanking: { name: string; value: number }[]
  currentMonthTotalExpense: number
  recentTransactions: any[]
}

export function DashboardView({ data }: { data: DashboardData }) {
  // チャート用のカスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="xs" shadow="md" withBorder>
          <Text size="xs" fw={700} mb={4}>{label}</Text>
          <Stack gap={2}>
            <Group gap="xs">
              <div style={{ width: 8, height: 8, backgroundColor: 'var(--mantine-color-teal-5)', borderRadius: '50%' }} />
              <Text size="xs" c="dimmed">Income: ¥{payload[0].value.toLocaleString()}</Text>
            </Group>
            <Group gap="xs">
              <div style={{ width: 8, height: 8, backgroundColor: 'var(--mantine-color-red-5)', borderRadius: '50%' }} />
              <Text size="xs" c="dimmed">Expense: ¥{payload[1].value.toLocaleString()}</Text>
            </Group>
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Stack gap="lg" pb="xl">
      {/* 1. 純資産サマリー */}
      <Card 
        radius="md" 
        p="lg" 
        style={{ 
          background: 'linear-gradient(135deg, var(--mantine-color-indigo-9) 0%, var(--mantine-color-indigo-7) 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs" style={{ opacity: 0.9 }}>
              <Wallet size={18} />
              <Text size="sm" fw={600}>Net Worth</Text>
            </Group>
          </Group>
          
          <Text size={32} fw={800} lh={1.1} style={{ letterSpacing: '-0.5px' }}>
            ¥ {data.netWorth.toLocaleString()}
          </Text>

          <Grid mt="sm">
            <Grid.Col span={6}>
              <Stack gap={0}>
                <Text size="xs" c="indigo.1" fw={600}>Assets</Text>
                <Text fw={700}>¥ {data.totalAssets.toLocaleString()}</Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={6} style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <Stack gap={0} pl="xs">
                <Text size="xs" c="red.2" fw={600}>Liabilities</Text>
                <Text fw={700}>-¥ {data.totalLiabilities.toLocaleString()}</Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      {/* 2. 収支トレンド (Bar Chart) */}
      <div>
        <Text size="sm" fw={700} mb="sm" c="dimmed" tt="uppercase">Cash Flow Trend</Text>
        <Paper p="md" radius="md" withBorder h={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyFlowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 10000}万`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="income" fill="var(--mantine-color-teal-5)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" fill="var(--mantine-color-red-5)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </div>

      {/* 3. カテゴリ内訳 & ランキング */}
      <div>
        <Text size="sm" fw={700} mb="sm" c="dimmed" tt="uppercase">Monthly Spending</Text>
        <Card radius="md" p="md" withBorder>
          <Group align="flex-start" justify="space-between">
            {/* 左側: リングチャート */}
            <Stack align="center" gap={0}>
              <RingProgress
                size={140}
                thickness={12}
                roundCaps
                label={
                  <Text size="xs" ta="center" fw={700}>
                    Total<br/>
                    <Text span size="lg">¥{(data.currentMonthTotalExpense/10000).toFixed(1)}万</Text>
                  </Text>
                }
                sections={data.categoryRanking.map((cat, index) => ({
                  value: (cat.value / data.currentMonthTotalExpense) * 100,
                  color: ['indigo', 'cyan', 'teal', 'grape', 'orange'][index % 5]
                }))}
              />
            </Stack>

            {/* 右側: ランキングリスト */}
            <Stack gap="xs" style={{ flex: 1 }}>
              {data.categoryRanking.map((cat, index) => (
                <Group key={cat.name} justify="space-between" wrap="nowrap">
                  <Group gap={6}>
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: `var(--mantine-color-${['indigo', 'cyan', 'teal', 'grape', 'orange'][index % 5]}-6)` 
                    }} />
                    <Text size="xs" lineClamp={1} fw={500}>{cat.name}</Text>
                  </Group>
                  <Text size="xs" fw={700}>¥{cat.value.toLocaleString()}</Text>
                </Group>
              ))}
              {data.categoryRanking.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="lg">データがありません</Text>
              )}
            </Stack>
          </Group>
        </Card>
      </div>

      {/* 4. 最近の取引 */}
      <div>
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase">Recent Activity</Text>
          <Link href="/inbox?status=all" style={{ textDecoration: 'none' }}>
            <Group gap={4} style={{ cursor: 'pointer' }}>
              <Text size="xs" c="indigo" fw={600}>View All</Text>
              <ArrowRight size={12} color="var(--mantine-color-indigo-6)" />
            </Group>
          </Link>
        </Group>
        
        <Card radius="md" p={0} withBorder>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Tbody>
              {data.recentTransactions.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td width={40} pl="md">
                    <ThemeIcon 
                      variant="light" 
                      color={t.type === 'income' ? 'teal' : 'red'} 
                      radius="xl"
                      size="md"
                    >
                      {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </ThemeIcon>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} lineClamp={1}>{t.description}</Text>
                    <Group gap={6}>
                      <Text size="xs" c="dimmed">{format(new Date(t.date), 'MM/dd')}</Text>
                      <Badge size="xs" variant="dot" color="gray">{t.categories?.name || 'Uncategorized'}</Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" pr="md">
                     <Text size="sm" fw={700} c={t.type === 'income' ? 'teal' : undefined}>
                       {t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}
                     </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {data.recentTransactions.length === 0 && (
                 <Table.Tr>
                   <Table.Td colSpan={3} ta="center" c="dimmed" py="xl">
                     取引履歴がありません
                   </Table.Td>
                 </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </div>

    </Stack>
  )
}
