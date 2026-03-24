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
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { ArrowLeft, CalendarDays, Check, FileText, Plus, Trash2, X, ZoomIn } from 'lucide-react'
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

type DetailKind = 'earning' | 'deduction' | 'reference'

const DETAIL_KIND_OPTIONS = [
  { value: 'earning', label: '支給' },
  { value: 'deduction', label: '控除' },
  { value: 'reference', label: '参考' },
]

function inferDetailKind(key: string): DetailKind {
  if (/(税|保険|控除|積立|天引|差引)/.test(key)) {
    return 'deduction'
  }
  if (/(支給|手当|給与|賞与|本給|基本給|総額|振込)/.test(key)) {
    return 'earning'
  }
  return 'reference'
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
  if (message.includes('PAYROLL_PARSE_API_URL_NOT_CONFIGURED')) {
    return '給与明細解析APIのURLが設定されていません。PAYROLL_PARSE_API_URL を確認してください。'
  }
  if (message.includes('PAYROLL_API_FETCH_FAILED:')) {
    return message.replace('PAYROLL_API_FETCH_FAILED:', '給与明細解析APIの呼び出しに失敗しました: ')
  }
  if (message.includes('PAYROLL_API_FETCH_FAILED')) {
    return '給与明細解析APIの呼び出しに失敗しました。'
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

const DETAIL_KIND_ORDER: DetailKind[] = ['earning', 'deduction', 'reference']

const DETAIL_KIND_META: Record<DetailKind, { label: string; color: string; background: string; border: string }> = {
  earning: {
    label: '支給',
    color: 'var(--mantine-color-green-8)',
    background: 'var(--mantine-color-green-0)',
    border: 'var(--mantine-color-green-3)',
  },
  deduction: {
    label: '控除',
    color: 'var(--mantine-color-red-8)',
    background: 'var(--mantine-color-red-0)',
    border: 'var(--mantine-color-red-3)',
  },
  reference: {
    label: '参考',
    color: 'var(--mantine-color-blue-8)',
    background: 'var(--mantine-color-blue-0)',
    border: 'var(--mantine-color-blue-3)',
  },
}

function getNextDetailKind(kind: DetailKind): DetailKind {
  const currentIndex = DETAIL_KIND_ORDER.indexOf(kind)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % DETAIL_KIND_ORDER.length : 0
  return DETAIL_KIND_ORDER[nextIndex]
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
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [newFieldName, setNewFieldName] = useState('')
  const [detailKinds, setDetailKinds] = useState<Record<string, DetailKind>>({})

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

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  const summary = useMemo(() => {
    const value = (keys: string[], mode: 'sum' | 'max' = 'sum') => {
      const values = keys.map((key) => details[key] || 0)
      return mode === 'max' ? Math.max(0, ...values) : values.reduce((sum, amount) => sum + amount, 0)
    }

    const manualEarnings = Object.entries(details).reduce(
      (sum, [key, amount]) => sum + (detailKinds[key] === 'earning' ? amount : 0),
      0
    )
    const manualDeductions = Object.entries(details).reduce(
      (sum, [key, amount]) => sum + (detailKinds[key] === 'deduction' ? amount : 0),
      0
    )

    return {
      base_pay: value(['基本給', '本給', '月給'], 'max'),
      overtime_pay: value(['時間外手当', '残業手当', '深夜手当', '休日手当', '時間外勤務手当', '深夜勤務手当']),
      tax: Math.max(value(['所得税', '住民税', '課税対象額', '控除合計']), manualDeductions),
      social_insurance: value(['健康保険', '厚生年金', '雇用保険', '介護保険', '社会保険料']),
      net_pay: Math.max(value(['差引支給額', '手取り額', '支給合計', '振込金額'], 'max'), manualEarnings - manualDeductions),
    }
  }, [detailKinds, details])

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }))
  const detailEntries = Object.entries(details)

  const handleFileUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }

    setPdfPreviewUrl(URL.createObjectURL(file))
    setUploadedFileName(file.name)
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
      const inferredKinds = Object.fromEntries(
        Object.keys(normalizedDetails).map((key) => [key, inferDetailKind(key)])
      ) as Record<string, DetailKind>

      setResult(parsed)
      setDetails(normalizedDetails)
      setDetailKinds(inferredKinds)
      setDate(parsed.month || '')

      notifications.update({
        id: toastId,
        loading: false,
        title: '解析が完了しました',
        message: '内容を確認して修正後に保存できます。',
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

  const updateDetailKind = (key: string, value: DetailKind) => {
    setDetailKinds((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const cycleDetailKind = (key: string) => {
    const currentKind = detailKinds[key] || 'reference'
    updateDetailKind(key, getNextDetailKind(currentKind))
  }

  const removeDetail = (key: string) => {
    setDetails((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDetailKinds((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const addDetail = () => {
    const key = newFieldName.trim()
    if (!key) {
      notifications.show({ title: '項目名を入力してください', message: '追加する項目名が空です。', color: 'red' })
      return
    }

    if (details[key] !== undefined) {
      notifications.show({ title: '同名の項目が既に存在します', message: '別の項目名を入力してください。', color: 'red' })
      return
    }

    setDetails((prev) => ({ ...prev, [key]: 0 }))
    setDetailKinds((prev) => ({ ...prev, [key]: 'reference' }))
    setNewFieldName('')
  }

  const resetAnalysis = () => {
    setResult(null)
    setDetails({})
    setDate('')
    setTargetAccountId(null)
    setNewFieldName('')
    setDetailKinds({})
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl(null)
    }
  }

  return (
    <>
      <PageHeader title="給与明細分析" subtitle="PDF を解析し、必要に応じて手動修正して保存します">
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
                給与明細の PDF をアップロードすると、支給額や控除額を抽出します。抽出後は手動で項目を編集できます。
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
                      またはクリックして給与明細を選択してください
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
                <Stack gap="xs" style={{ position: 'sticky', top: 88 }}>
                  <Group justify="space-between" px="xs">
                    <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                      PDFプレビュー
                    </Text>
                    <Button variant="subtle" size="compact-xs" leftSection={<ZoomIn size={12} />} onClick={openPreview} disabled={!pdfPreviewUrl}>
                      拡大表示
                    </Button>
                  </Group>
                  <Paper
                    radius="28px"
                    withBorder
                    shadow="sm"
                    style={{ overflow: 'hidden', minHeight: 420 }}
                  >
                    {pdfPreviewUrl ? (
                      <iframe
                        src={pdfPreviewUrl}
                        title={uploadedFileName || '給与明細PDF'}
                        style={{ width: '100%', height: 420, border: 0 }}
                      />
                    ) : (
                      <Box p="xl" ta="center">
                        <Text c="dimmed" size="sm">
                          PDF プレビューは利用できません。
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

                      <Divider label="抽出項目の確認・修正" labelPosition="center" my="sm" />
                      <Text size="xs" c="dimmed">
                        現在は既知ラベル名から支給・控除を推定しています。曖昧な項目は下の区分で手動修正できます。
                      </Text>

                      <Group align="flex-end" grow>
                        <TextInput
                          label="項目を追加"
                          placeholder="例: 通勤手当"
                          value={newFieldName}
                          onChange={(event) => setNewFieldName(event.currentTarget.value)}
                        />
                        <Button leftSection={<Plus size={16} />} onClick={addDetail}>
                          項目追加
                        </Button>
                      </Group>

                      <ScrollArea h={320} offsetScrollbars>
                        <Stack gap="xs">
                          {detailEntries.length > 0 && (
                            <Table withTableBorder withColumnBorders striped highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>項目名</Table.Th>
                                  <Table.Th w={120}>区分</Table.Th>
                                  <Table.Th w={140}>金額</Table.Th>
                                  <Table.Th w={56}></Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {detailEntries.map(([key, value]) => (
                                  <Table.Tr key={key}>
                                    <Table.Td>
                                      <Text size="sm" fw={700}>
                                        {key}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        fullWidth
                                        onClick={() => cycleDetailKind(key)}
                                        styles={{
                                          root: {
                                            color: DETAIL_KIND_META[detailKinds[key] || 'reference'].color,
                                            backgroundColor: DETAIL_KIND_META[detailKinds[key] || 'reference'].background,
                                            border: `1px solid ${DETAIL_KIND_META[detailKinds[key] || 'reference'].border}`,
                                          },
                                        }}
                                      >
                                        {DETAIL_KIND_META[detailKinds[key] || 'reference'].label}
                                      </Button>
                                    </Table.Td>
                                    <Table.Td>
                                      <NumberInput
                                        size="xs"
                                        value={value}
                                        onChange={(nextValue) => updateDetail(key, nextValue || 0)}
                                        hideControls
                                        prefix="¥ "
                                        styles={{ input: { fontWeight: 700, textAlign: 'right' } }}
                                      />
                                    </Table.Td>
                                    <Table.Td>
                                      <ActionIcon variant="light" color="red" onClick={() => removeDetail(key)} aria-label={`${key} を削除`}>
                                        <Trash2 size={16} />
                                      </ActionIcon>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          )}
                          {detailEntries.length === 0 && (
                            <Text size="sm" c="dimmed" ta="center" py="md">
                              抽出項目がありません。必要な項目を手動で追加してください。
                            </Text>
                          )}
                        </Stack>
                      </ScrollArea>
                    </Stack>

                    <Group grow mt="xl">
                      <Button variant="light" color="gray" onClick={resetAnalysis} disabled={loading}>
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
        <Box h="100vh" p="md">
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              title={uploadedFileName || '給与明細PDF'}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <Box p="xl" ta="center">
              <Text c="dimmed">PDF プレビューは利用できません。</Text>
            </Box>
          )}
        </Box>
      </Modal>
    </>
  )
}
