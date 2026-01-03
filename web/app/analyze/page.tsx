'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAssetHistory, getSalaryHistory, getAccountsWithBalance, getAssetGroups } from '@/app/actions'
import { Group, Stack, Skeleton, Button, Text, Paper, Center, ThemeIcon } from "@mantine/core"
import { notifications } from '@mantine/notifications'
import { RefreshCw, Database, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import Assets from '@/components/Assets'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AnalyzePage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [assetHistory, setAssetHistory] = useState<any[]>([])
  const [salaryHistory, setSalaryHistory] = useState<any[]>([])
  const [assetGroups, setAssetGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accData, historyData, salaryData, agData] = await Promise.all([
        getAccountsWithBalance(),
        getAssetHistory(),
        getSalaryHistory(),
        getAssetGroups()
      ])
      setAccounts(accData || [])
      setAssetHistory(historyData || [])
      setSalaryHistory(salaryData || [])
      setAssetGroups(agData || [])
    } catch (e) {
      console.error(e)
      notifications.show({ message: 'データの取得に失敗しました', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // データが全くない場合のガイド表示
  const hasData = accounts.length > 0 || assetHistory.length > 0 || salaryHistory.length > 0;

  return (
    <>
      <PageHeader 
        title="Analysis" 
        subtitle="Time-series Reports"
      >
        <Button 
          variant="light" 
          leftSection={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />}
          onClick={loadData}
          disabled={loading}
        >
          更新
        </Button>
      </PageHeader>

      <PageContainer>
        {loading ? (
          // ローディング・スケルトン
          <Stack gap="xl">
            <Group grow>
              <Skeleton height={50} radius="md" />
              <Skeleton height={50} radius="md" />
            </Group>
            <Skeleton height={180} radius="xl" />
            <Group grow>
              <Skeleton height={100} radius="lg" />
              <Skeleton height={100} radius="lg" />
            </Group>
            <Skeleton height={300} radius="xl" />
          </Stack>
        ) : !hasData ? (
          // データなし時のガイド (Empty State)
          <Center py={60}>
            <Stack align="center" gap="lg" style={{ maxWidth: 400, textAlign: 'center' }}>
              <ThemeIcon size={80} radius="100%" variant="light" color="gray">
                <Database size={40} />
              </ThemeIcon>
              <Stack gap="xs">
                <Text size="xl" fw={900}>データが見つかりません</Text>
                <Text c="dimmed" size="sm">
                  まだ資産や給与のデータが登録されていません。<br />
                  まずは外部サービスの同期や、給与明細のアップロードを行ってください。
                </Text>
              </Stack>
              <Group>
                <Button component={Link} href="/admin" variant="filled" color="indigo" rightSection={<ArrowRight size={16} />}>
                  同期・設定へ移動
                </Button>
              </Group>
            </Stack>
          </Center>
        ) : (
          // メインコンテンツ
          <Assets 
            accounts={accounts.map(acc => ({
              ...acc,
              balance: acc.current_amount
            }))}
            monthlyBalances={assetHistory}
            salarySlips={salaryHistory}
            assetGroups={assetGroups}
            onAddSalarySlip={() => {}} 
            isReadOnly={true}
          />
        )}
      </PageContainer>
    </>
  )
}