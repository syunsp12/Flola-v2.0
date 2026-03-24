'use client'

import { Badge, Box, Card, Group, Image, Stack, Text, ThemeIcon } from '@mantine/core'
import { format } from 'date-fns'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { getCardBrandLogo, getSmartIconUrl } from '@/lib/utils/icon-helper'

type TransactionAccount = {
  name?: string
  icon_url?: string | null
  card_brand?: string | null
}

type TransactionCategory = {
  name?: string
}

type RecentTransaction = {
  id: string
  type: 'income' | 'expense' | 'transfer'
  description: string
  date: string
  amount: number
  accounts?: TransactionAccount | TransactionAccount[] | null
  categories?: TransactionCategory | TransactionCategory[] | null
}

type DashboardData = {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthlyFlowData: { month: string; income: number; expense: number }[]
  categoryRanking: { name: string; value: number }[]
  currentMonthTotalExpense: number
  recentTransactions: RecentTransaction[]
}

function formatCurrency(value: number) {
  return `¥ ${value.toLocaleString()}`
}

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <Stack gap="lg" pb="xl">
      <Card
        withBorder={false}
        style={{
          background: 'linear-gradient(135deg, var(--mantine-color-indigo-9) 0%, var(--mantine-color-indigo-7) 100%)',
          color: 'white',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between">
            <Group gap="xs" style={{ opacity: 0.9 }}>
              <Wallet size={18} />
              <Text size="sm" fw={600}>
                純資産
              </Text>
            </Group>
          </Group>

          <Text fw={800} lh={1.1} style={{ fontSize: 32, letterSpacing: '-0.5px' }}>
            {formatCurrency(data.netWorth)}
          </Text>

          <Group grow mt="sm">
            <Box>
              <Text size="xs" c="indigo.1" fw={600}>
                資産
              </Text>
              <Text fw={700}>{formatCurrency(data.totalAssets)}</Text>
            </Box>
            <Box pl="md" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
              <Text size="xs" c="red.2" fw={600}>
                負債
              </Text>
              <Text fw={700}>-{formatCurrency(data.totalLiabilities)}</Text>
            </Box>
          </Group>
        </Stack>
      </Card>

      <Card>
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase">
            今月の支出
          </Text>
          <Text fw={700}>合計: {formatCurrency(data.currentMonthTotalExpense)}</Text>
          {data.categoryRanking.length === 0 ? (
            <Text size="sm" c="dimmed">
              今月のカテゴリ別データはまだありません。
            </Text>
          ) : (
            data.categoryRanking.map((category, index) => (
              <Group key={`${category.name}-${index}`} justify="space-between" wrap="nowrap">
                <Group gap={8} style={{ minWidth: 0, flex: 1 }}>
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: `var(--mantine-color-${['indigo', 'cyan', 'teal', 'grape', 'orange'][index % 5]}-6)`,
                    }}
                  />
                  <Text size="sm" lineClamp={1}>
                    {category.name}
                  </Text>
                </Group>
                <Text size="sm" fw={700}>
                  {formatCurrency(category.value)}
                </Text>
              </Group>
            ))
          )}
        </Stack>
      </Card>

      <Card>
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase">
            最近の取引
          </Text>
          <Link href="/inbox?status=all" style={{ textDecoration: 'none' }}>
            <Text size="xs" c="indigo" fw={600}>
              すべて見る
            </Text>
          </Link>
        </Group>

        <Stack gap="sm">
          {data.recentTransactions.length === 0 ? (
            <Text size="sm" c="dimmed">
              最近の取引はまだありません。
            </Text>
          ) : (
            data.recentTransactions.map((transaction) => {
              const account = Array.isArray(transaction.accounts) ? transaction.accounts[0] : transaction.accounts
              const category = Array.isArray(transaction.categories) ? transaction.categories[0] : transaction.categories
              const accountIcon = getSmartIconUrl(account?.name || '', account?.icon_url)
              const brandLogo = getCardBrandLogo(account?.card_brand ?? null)

              return (
                <Group key={transaction.id} justify="space-between" wrap="nowrap" align="flex-start">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Box pos="relative" w={28} h={28}>
                      {accountIcon ? (
                        <Image src={accountIcon} w={28} h={28} radius="xs" alt="account icon" />
                      ) : (
                        <ThemeIcon
                          variant="light"
                          color={transaction.type === 'income' ? 'teal' : 'red'}
                          radius="md"
                          size={28}
                        >
                          {transaction.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </ThemeIcon>
                      )}
                      {brandLogo && (
                        <Box
                          pos="absolute"
                          bottom={-3}
                          right={-3}
                          bg="white"
                          p={1.5}
                          style={{
                            border: '1px solid var(--mantine-color-gray-2)',
                            borderRadius: 2,
                            display: 'flex',
                            boxShadow: 'var(--mantine-shadow-xs)',
                          }}
                        >
                          <Image src={brandLogo} w={12} h={8} fit="contain" alt="card brand" />
                        </Box>
                      )}
                    </Box>

                    <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {transaction.description}
                      </Text>
                      <Group gap={6}>
                        <Text size="xs" c="dimmed">
                          {format(new Date(transaction.date), 'MM/dd')}
                        </Text>
                        <Badge size="xs" variant="dot" color="gray">
                          {category?.name || '未分類'}
                        </Badge>
                      </Group>
                    </Stack>
                  </Group>

                  <Text size="sm" fw={700} c={transaction.type === 'income' ? 'teal' : undefined}>
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </Group>
              )
            })
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
