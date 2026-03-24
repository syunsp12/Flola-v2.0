'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { ArrowLeft, CalendarDays, Check, FileText, X, ZoomIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { analyzePayrollPdfVercel, getAccountsWithBalance, saveSalarySlip } from '@/app/actions'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'

type PayrollParseResult = {
  month?: string
  type?: string
  snapshot?: string
  details?: Record<string, unknown>
}

type PayrollParseResponse =
  | { success: true; data: PayrollParseResult }
  | { success: false; error: string }

type AccountOption = {
  id: string
  name: string
}

function normalizeDetails(input: Record<string, unknown>) {
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(input)) {
    normalized[key] = Number(value) || 0
  }
  return normalized
}

function getFriendlyPayrollErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'UNKNOWN_ERROR')

  if (message.includes('NO_FILE_PROVIDED')) {
    return 'PDF ファイルを選択してください。'
  }

  if (message.includes('PARSER_SCRIPT_NOT_FOUND')) {
    return '給与明細の解析スクリプトが見つかりません。サーバー設定を確認してください。'
  }
  if (message.includes('PYTHON_NOT_FOUND')) {
    return '給与明細解析に必要な Python 実行環境が見つかりません。'
  }
  if (message.includes('PARSER_EXECUTION_FAILED')) {
    return '給与明細の解析処理に失敗しました。PDF の内容または解析環境を確認してください。'
  }
  if (message.includes('PARSER_OUTPUT_INVALID_JSON')) {
    return '給与明細の解析結果を読み取れませんでした。別の PDF で再度お試しください。'
  }
  if (message.includes('PARSER_EXTRACTION_FAILED')) {
    return 'PDF は読み込めましたが、給与明細として必要な項目を抽出できませんでした。'
  }
  if (message.includes('UNEXPECTED_PAYROLL_ERROR:')) {
    return message.replace('UNEXPECTED_PAYROLL_ERROR:', '予期しない解析エラー: ')
  }
  if (message.includes('UNEXPECTED_PAYROLL_ERROR')) {
    return '給与明細解析中に予期しないエラーが発生しました。'
  }

  return message
}

function formatCurrency(value: number) {
  return `¥ ${value.toLocaleString()}`
}

export default function SalaryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PayrollParseResult | null>(null)
  const [details, setDetails] = useState<Record<string, number>>({})
  const [date, setDate] = useState('')
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [targetAccountId, setTargetAccountId] = useState<string | null>(null)
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false)

  useEffect(() => {
    getAccountsWithBalance()
      .then((data) => setAccounts(data.map((account) => ({ id: account.id, name: account.name }))))
      .catch((error) => {
        console.error(error)
        notifications.show({
          title: '口座の読み込みに失敗しました',
          message: '振込先口座の一覧を取得できませんでした。',
          color: 'red',
        })
      })
  }, [])

  const summary = useMemo(() => {
    const value = (keys: string[], mode: 'sum' | 'max' = 'sum') => {
      const values = keys.map((key) => details[key] || 0)
      return mode === 'max' ? Math.max(0, ...values) : values.reduce((sum, amount) => sum + amount, 0)
    }

    return {
      base_pay: value(['基本給', '本給', '月給'], 'max'),
      overtime_pay: value(['時間外手当', '残業手当', '深夜手当', '休日手当', '時間外勤務手当', '深夜勤務手当']),
      tax: value(['所得税', '住民税', '課税対象額', '控除合計']),
      social_insurance: value(['健康保険', '厚生年金', '雇用保険', '介護保険', '社会保険料']),
      net_pay: value(['差引支給額', '手取り額', '支給合計', '振込金額'], 'max'),
    }
  }, [details])

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }))

  const handleFileUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setLoading(true)
    const toastId = 'salary-analysis'
    notifications.show({
      id: toastId,
      loading: true,
      title: '給与明細を解析しています',
      message: 'PDF の内容を読み取り中です。',
      autoClose: false,
      withCloseButton: false,
    })

    try {
      const data = new FormData()
      data.append('file', file)
      const response = (await analyzePayrollPdfVercel(data)) as PayrollParseResponse
      if (!response.success) {
        throw new Error(response.error)
      }

      const parsed = response.data
      const normalizedDetails = normalizeDetails(parsed.details || {})

      setResult(parsed)
      setDetails(normalizedDetails)
      setDate(parsed.month || '')

      notifications.update({
        id: toastId,
        loading: false,
        title: '解析が完了しました',
        message: '内容を確認して保存できます。',
        color: 'green',
        icon: <Check size={18} />,
        autoClose: 2000,
      })
    } catch (error) {
      notifications.update({
        id: toastId,
        loading: false,
        title: '解析に失敗しました',
        message: getFriendlyPayrollErrorMessage(error),
        color: 'red',
        icon: <X size={18} />,
        autoClose: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!targetAccountId) {
      notifications.show({
        title: '振込先口座を選択してください',
        message: '給与が入金される口座を指定してください。',
        color: 'red',
      })
      return
    }

    setLoading(true)
    try {
      await saveSalarySlip({
        ...summary,
        date,
        to_account_id: targetAccountId,
        details,
      })

      notifications.show({
        title: '保存しました',
        message: '給与明細を収入データとして登録しました。',
        color: 'green',
      })
      router.push('/analyze')
    } catch (error) {
      console.error(error)
      notifications.show({
        title: '保存に失敗しました',
        message: error instanceof Error ? error.message : '給与明細の保存中に不明なエラーが発生しました。',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateDetail = (key: string, value: string | number) => {
    setDetails((prev) => ({ ...prev, [key]: Number(value) || 0 }))
  }

  return (
    <>
      <PageHeader title="給与明細分析" subtitle="PDF を解析して収入データとして登録します">
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
                給与明細の PDF をアップロードすると、支給額や控除額を自動で抽出します。
              </Text>
              <Dropzone
                onDrop={handleFileUpload}
                accept={PDF_MIME_TYPE}
                maxSize={10 * 1024 ** 2}
                loading={loading}
                radius="xl"
                styles={{
                  root: {
                    border: '2px dashed var(--mantine-color-gray-3)',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  },
                }}
              >
                <Stack align="center" gap="sm" py="xl">
                  <Dropzone.Idle>
                    <FileText size={48} color="var(--mantine-color-dimmed)" />
                  </Dropzone.Idle>
                  <Box ta="center">
                    <Text size="lg" fw={700}>
                      PDF ファイルをドロップ
                    </Text>
                    <Text size="sm" c="dimmed" mt={7}>
                      またはクリックしてファイルを選択してください
                    </Text>
                  </Box>
                </Stack>
              </Dropzone>
            </Box>
          </Stack>
        ) : (
          <Stack gap="xl">
            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="xs">
                  <Group justify="space-between" px="xs">
                    <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                      PDF プレビュー
                    </Text>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      leftSection={<ZoomIn size={12} />}
                      onClick={openPreview}
                      disabled={!result.snapshot}
                    >
                      拡大表示
                    </Button>
                  </Group>
                  <Paper
                    radius="28px"
                    withBorder
                    shadow="sm"
                    style={{ overflow: 'hidden', cursor: 'zoom-in' }}
                    onClick={openPreview}
                  >
                    {result.snapshot ? (
                      <Image src={result.snapshot} alt="給与明細プレビュー" />
                    ) : (
                      <Box p="xl" ta="center">
                        <Text c="dimmed" size="sm">
                          この環境ではプレビュー画像は生成せず、テキスト解析のみ行います。
                        </Text>
                      </Box>
                    )}
                  </Paper>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" px="xs">
                    抽出結果
                  </Text>
                  <Paper p="xl" radius="28px" withBorder shadow="sm">
                    <Group justify="space-between" mb="xl">
                      <Text fw={900} size="lg">
                        解析済みデータ
                      </Text>
                      <Badge size="lg" variant="light" color="green">
                        {result.type || '給与明細'}
                      </Badge>
                    </Group>

                    <Stack gap="md">
                      <TextInput
                        label="支給日"
                        placeholder="YYYY-MM-DD"
                        leftSection={<CalendarDays size={16} />}
                        value={date}
                        onChange={(event) => setDate(event.currentTarget.value)}
                      />

                      <Select
                        label="振込先口座"
                        placeholder="給与が入金される口座を選択"
                        data={accountOptions}
                        value={targetAccountId}
                        onChange={setTargetAccountId}
                        required
                        searchable
                      />

                      <SimpleGrid cols={2} spacing="md">
                        <Box p="md" bg="gray.0" style={{ borderRadius: '12px' }}>
                          <Text size="10px" fw={800} c="dimmed">
                            手取り額
                          </Text>
                          <Text fw={900} size="xl">
                            {formatCurrency(summary.net_pay)}
                          </Text>
                        </Box>
                        <Box p="md" bg="indigo.0" style={{ borderRadius: '12px' }}>
                          <Text size="10px" fw={800} c="indigo.6">
                            基本給
                          </Text>
                          <Text fw={900} size="xl">
                            {formatCurrency(summary.base_pay)}
                          </Text>
                        </Box>
                      </SimpleGrid>

                      <Divider label="抽出項目の確認・補正" labelPosition="center" my="sm" />

                      <ScrollArea h={320} offsetScrollbars>
                        <Stack gap="xs">
                          {Object.entries(details).map(([key, value]) => (
                            <Group key={key} justify="space-between" wrap="nowrap" gap="sm">
                              <Text size="xs" fw={700} style={{ flex: 1 }}>
                                {key}
                              </Text>
                              <NumberInput
                                size="xs"
                                w={140}
                                value={value}
                                onChange={(nextValue) => updateDetail(key, nextValue || 0)}
                                hideControls
                                prefix="¥ "
                                styles={{ input: { fontWeight: 700, textAlign: 'right' } }}
                              />
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea>
                    </Stack>

                    <Group grow mt="xl">
                      <Button variant="light" color="gray" onClick={() => setResult(null)} disabled={loading}>
                        やり直す
                      </Button>
                      <Button onClick={handleSave} loading={loading} leftSection={<Check size={18} />} disabled={!targetAccountId}>
                        保存する
                      </Button>
                    </Group>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </PageContainer>

      <Modal opened={previewOpened} onClose={closePreview} fullScreen radius={0} transitionProps={{ transition: 'fade', duration: 200 }}>
        <ScrollArea h="100vh">
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src={result?.snapshot}
              alt="給与明細の全画面プレビュー"
              style={{ maxWidth: '100%', height: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            />
          </Box>
        </ScrollArea>
      </Modal>
    </>
  )
}
