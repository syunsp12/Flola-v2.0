'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Text, 
  Stack, 
  Group, 
  ThemeIcon, 
  NumberInput, 
  TextInput, 
  Divider, 
  Box, 
  Paper, 
  rem, 
  ActionIcon, 
  Badge, 
  Grid, 
  SimpleGrid, 
  Image, 
  Modal, 
  ScrollArea,
  Select
} from "@mantine/core"
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import { 
  FileText, 
  Upload, 
  X, 
  Check, 
  ArrowLeft, 
  AlertCircle, 
  CalendarDays,
  ZoomIn,
  Maximize2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { analyzePayrollPdf, saveSalarySlip, getAccountsWithBalance } from '@/app/actions'
import { PageHeader } from '@/components/layout/page-header'
import { PageContainer } from '@/components/layout/page-container'

export default function SalaryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [targetAccountId, setTargetAccountId] = useState<string | null>(null)

  // 口座一覧を取得
  useEffect(() => {
    getAccountsWithBalance().then(setAccounts)
  }, [])

  // 1. 詳細データのステート
  const [details, setDetails] = useState<Record<string, number>>({})
  const [date, setDate] = useState('')

  // 2. 詳細からサマリーを自動計算するロジック
  const summary = useMemo(() => {
    const num = (key: string) => details[key] || 0
    
    const basePayKeys = ['基本給', '本給', '月給']
    const overtimeKeys = ['時間外手当', '残業手当', '深夜手当', '休日手当', '時間外割増', '深夜割増']
    const taxKeys = ['所得税', '住民税', '復興特別所得税', '県民税', '市民税']
    const insuranceKeys = ['健康保険', '厚生年金', '雇用保険', '介護保険', '健康保険料', '厚生年金保険料', '雇用保険料']
    const netPayKeys = ['差引支給額', '差引支給金', '銀行振込(一般)', '振込額', '実支給額']

    return {
      base_pay: basePayKeys.reduce((max, key) => Math.max(max, num(key)), 0),
      overtime_pay: overtimeKeys.reduce((sum, key) => sum + num(key), 0),
      tax: taxKeys.reduce((sum, key) => sum + num(key), 0),
      social_insurance: insuranceKeys.reduce((sum, key) => sum + num(key), 0),
      net_pay: netPayKeys.reduce((max, key) => Math.max(max, num(key)), 0)
    }
  }, [details])

  const handleFileUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setLoading(true)
    const toastId = 'analyzing-toast'
    notifications.show({ id: toastId, loading: true, message: 'PDFを解析中...', autoClose: false, withCloseButton: false })

    try {
      const data = new FormData()
      data.append('file', file)
      const res: any = await analyzePayrollPdf(data)
      
      const rawDetails = res.details || {}
      const numericDetails: Record<string, number> = {}
      Object.entries(rawDetails).forEach(([k, v]) => {
        numericDetails[k] = Number(v) || 0
      })

      setResult(res)
      setDetails(numericDetails)
      setDate(res.month || '')

      notifications.update({ id: toastId, loading: false, message: '解析が完了しました', color: 'green', icon: <Check size={18} />, autoClose: 2000 })
    } catch (e: any) {
      notifications.update({ id: toastId, loading: false, message: e.message || '解析に失敗しました', color: 'red', icon: <X size={18} />, autoClose: 3000 })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!targetAccountId) {
      notifications.show({ message: '入金先口座を選択してください', color: 'red' })
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await saveSalarySlip({
        ...summary,
        date,
        to_account_id: targetAccountId,
        details: details
      })
      notifications.show({ title: 'Success', message: '給与明細を登録しました', color: 'green' })
      router.push('/analyze')
    } catch (e: any) {
      console.error("Save error:", e)
      notifications.show({ title: 'Error', message: '保存に失敗しました', color: 'red' })
    }
    setLoading(false)
  }

  const updateDetail = (key: string, value: number) => {
    setDetails(prev => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <PageHeader title="給与明細解析" subtitle="PDFから項目を自動抽出">
        <Link href="/admin">
          <ActionIcon variant="light" size="2rem">
            <ArrowLeft size={18} />
          </ActionIcon>
        </Link>
      </PageHeader>

      <PageContainer>
        {!result ? (
          <Stack gap="xl">
            <Box>
              <Text size="sm" c="dimmed" mb="md">
                給与明細のPDFをアップロードしてください。
              </Text>
              <Dropzone onDrop={handleFileUpload} accept={PDF_MIME_TYPE} maxSize={5 * 1024 ** 2} loading={loading} radius="xl" styles={{ root: { border: '2px dashed var(--mantine-color-gray-3)', backgroundColor: 'var(--mantine-color-gray-0)' } }}>
                <Stack align="center" gap="sm" py="xl">
                  <Dropzone.Idle><FileText size={50} color="var(--mantine-color-dimmed)" /></Dropzone.Idle>
                  <Box style={{ textAlign: 'center' }}>
                    <Text size="lg" fw={700}>PDFファイルをドロップ</Text>
                    <Text size="sm" c="dimmed" mt={7}>またはクリックして選択</Text>
                  </Box>
                </Stack>
              </Dropzone>
            </Box>
          </Stack>
        ) : (
          <Stack gap="xl" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Grid gutter="xl">
              {/* 左側: PDFスナップショット (拡大機能付き) */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="xs">
                  <Group justify="space-between" px="xs">
                    <Text size="xs" fw={800} c="dimmed" tt="uppercase">PDF Snapshot</Text>
                    <Button variant="subtle" size="compact-xs" leftSection={<ZoomIn size={12} />} onClick={openPreview}>
                      大きく表示
                    </Button>
                  </Group>
                  <Paper radius="28px" withBorder shadow="sm" style={{ overflow: 'hidden', cursor: 'zoom-in' }} onClick={openPreview}>
                    <Image src={result.snapshot} alt="Payroll PDF Snapshot" />
                  </Paper>
                </Stack>
              </Grid.Col>

              {/* 右側: 抽出データ確認・修正 */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs">Extracted Data</Text>
                  <Paper p="xl" radius="28px" withBorder shadow="sm">
                    <Group justify="space-between" mb="xl">
                      <Text fw={900} size="lg">解析結果の確認</Text>
                      <Badge size="lg" variant="light" color="green">{result.type}</Badge>
                    </Group>

                    <Stack gap="md">
                      <TextInput label="支給日 (YYYY-MM-DD)" leftSection={<CalendarDays size={16} />} value={date} onChange={(e) => setDate(e.currentTarget.value)} />
                      
                      <Select
                        label="入金先口座"
                        placeholder="給与が振り込まれる口座を選択"
                        data={accounts.map(a => ({ value: a.id, label: a.name }))}
                        value={targetAccountId}
                        onChange={setTargetAccountId}
                        required
                        searchable
                      />

                      <SimpleGrid cols={2} spacing="md">
                        <Box p="md" bg="gray.0" style={{ borderRadius: '12px' }}>
                          <Text size="10px" fw={800} c="dimmed">手取り額</Text>
                          <Text fw={900} size="xl">¥{summary.net_pay.toLocaleString()}</Text>
                        </Box>
                        <Box p="md" bg="indigo.0" style={{ borderRadius: '12px' }}>
                          <Text size="10px" fw={800} c="indigo.6">基本給</Text>
                          <Text fw={900} size="xl">¥{summary.base_pay.toLocaleString()}</Text>
                        </Box>
                      </SimpleGrid>
                      <Divider label="全項目を微調整" labelPosition="center" my="sm" />
                      <ScrollArea h={300} offsetScrollbars>
                        <Stack gap="xs">
                          {Object.entries(details).map(([key, val]) => (
                            <Group key={key} justify="space-between" wrap="nowrap" gap="sm">
                              <Text size="xs" fw={700} style={{ flex: 1 }}>{key}</Text>
                              <NumberInput size="xs" w={120} value={val} onChange={(newVal) => updateDetail(key, Number(newVal))} hideControls prefix="¥" styles={{ input: { fontWeight: 700, textAlign: 'right' } }} />
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea>
                    </Stack>

                    <Group grow mt="xl">
                      <Button 
                        variant="light" 
                        color="gray" 
                        onClick={() => setResult(null)} 
                        radius="md"
                        disabled={loading}
                      >
                        やり直す
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        loading={loading} 
                        radius="md" 
                        leftSection={<Check size={18} />}
                        color={!targetAccountId ? 'gray' : 'indigo'}
                        title={!targetAccountId ? '入金先口座を選択してください' : ''}
                      >
                        {targetAccountId ? '確定して保存' : '口座を選択してください'}
                      </Button>
                    </Group>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </PageContainer>

      {/* 拡大プレビュー用モーダル */}
      <Modal opened={previewOpened} onClose={closePreview} fullScreen radius={0} transitionProps={{ transition: 'fade', duration: 200 }}>
        <ScrollArea h="100vh">
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Image src={result?.snapshot} alt="Full Preview" style={{ maxWidth: '100%', height: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} />
          </Box>
        </ScrollArea>
      </Modal>
    </>
  )
}