'use client'

import { useEffect, useState } from 'react'
import { getAssetHistory, getSalaryHistory, getAccountsWithBalance } from '@/app/actions'
import { Loader, Group, Stack } from "@mantine/core"
import { notifications } from '@mantine/notifications'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'
import Assets from '@/components/Assets'

export default function AnalyzePage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [assetHistory, setAssetHistory] = useState<any[]>([])
  const [salaryHistory, setSalaryHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [accData, historyData, salaryData] = await Promise.all([
        getAccountsWithBalance(),
        getAssetHistory(),
        getSalaryHistory()
      ])
      setAccounts(accData)
      setAssetHistory(historyData)
      setSalaryHistory(salaryData)
    } catch (e) {
      notifications.show({ message: 'データの取得に失敗しました', color: 'red' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <>
      <PageHeader title="Analysis" subtitle="Time-series Reports" />
      <PageContainer>
        {loading ? (
          <Group justify="center" py="xl"><Loader type="dots" /></Group>
        ) : (
          <Assets 
            accounts={accounts.map(acc => ({
              ...acc,
              balance: acc.current_amount
            }))}
            monthlyBalances={assetHistory}
            salarySlips={salaryHistory}
            onAddSalarySlip={() => {}} 
            // 分析専用ページのため、編集機能は渡さない（または閲覧のみにする）
            isReadOnly={true}
          />
        )}
      </PageContainer>
    </>
  )
}
