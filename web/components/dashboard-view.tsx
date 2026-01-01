'use client'

import { Card, Text, Group, SimpleGrid, ThemeIcon, Stack } from "@mantine/core"
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  totalAssets: number
  totalExpense: number
}

export function DashboardView({ totalAssets, totalExpense }: Props) {
  return (
    <>
      {/* 総資産カード */}
      <Card 
        radius="md" 
        p="lg" 
        mb="md" 
        style={{ 
          background: 'linear-gradient(135deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-6) 100%)',
          color: 'white',
          border: 'none'
        }}
      >
        <Stack gap="xs">
          <Group gap="xs" style={{ opacity: 0.8 }}>
            <Wallet size={16} />
            <Text size="sm" fw={500}>Total Assets</Text>
          </Group>
          <Text fz={36} fw={700} lh={1} style={{ letterSpacing: '-1px' }}>
            ¥ {totalAssets.toLocaleString()}
          </Text>
        </Stack>
      </Card>

      {/* サブカード */}
      <SimpleGrid cols={2} spacing="md">
        <Card radius="md" p="md" withBorder>
          <Stack gap="xs">
            <Group gap="xs">
              <ThemeIcon variant="light" color="red" size="sm">
                <TrendingDown size={14} />
              </ThemeIcon>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Expenses</Text>
            </Group>
            <Text size="xl" fw={700}>
              ¥ {totalExpense.toLocaleString()}
            </Text>
          </Stack>
        </Card>

        <Card radius="md" p="md" withBorder>
          <Stack gap="xs">
            <Group gap="xs">
              <ThemeIcon variant="light" color="green" size="sm">
                <TrendingUp size={14} />
              </ThemeIcon>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Income</Text>
            </Group>
            <Text size="xl" fw={700} c="dimmed">
              ¥ -
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>
    </>
  )
}