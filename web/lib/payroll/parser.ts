import { PDFParse } from 'pdf-parse'

type PayrollParseResult = {
  month?: string
  type?: string
  snapshot?: string
  details?: Record<string, string>
}

const MONTH_PATTERN = /(20\d{2})\s*年\s*([01]?\d)\s*月/
const INLINE_NUMBER_PATTERN = /([^:：\n]+?)\s*[:：]\s*([+-]?[0-9][0-9,]*(?:\.\d+)?)/
const TRAILING_NUMBER_PATTERN = /^(.+?)(?:[:：\s]+)([+-]?[0-9][0-9,]*(?:\.\d+)?)$/
const NUMBER_ONLY_PATTERN = /^[+-]?[0-9][0-9,]*(?:\.\d+)?$/

const NOISE_LABELS = new Set([
  '支給',
  '控除',
  '勤怠',
  '備考',
  '摘要',
  '所属',
  '社員番号',
  '氏名',
  '明細',
])

function normalizeText(value: string) {
  return value.normalize('NFKC').replace(/\u3000/g, ' ').replace(/¥/g, '').trim()
}

function cleanNumber(value: string) {
  return normalizeText(value).replace(/,/g, '')
}

function cleanLabel(value: string) {
  return normalizeText(value).replace(/\s+/g, ' ').replace(/^[:：\-\s]+|[:：\-\s]+$/g, '')
}

function isValidLabel(label: string) {
  return Boolean(label) && label.length <= 40 && !NUMBER_ONLY_PATTERN.test(label) && !NOISE_LABELS.has(label)
}

function classifySlipType(fileName: string) {
  return fileName.toUpperCase().startsWith('SYO') ? '賞与' : '給与'
}

function extractMonth(text: string) {
  const match = MONTH_PATTERN.exec(normalizeText(text))
  if (!match) {
    return undefined
  }

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) {
    return undefined
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`
}

function extractDetails(text: string) {
  const details: Record<string, string> = {}
  let pendingLabel: string | null = null

  for (const rawLine of text.split('\n')) {
    const line = normalizeText(rawLine)
    if (!line) {
      continue
    }

    if (pendingLabel && NUMBER_ONLY_PATTERN.test(line)) {
      details[pendingLabel] = cleanNumber(line)
      pendingLabel = null
      continue
    }

    for (const match of line.matchAll(new RegExp(INLINE_NUMBER_PATTERN, 'g'))) {
      const label = cleanLabel(match[1])
      const number = cleanNumber(match[2])
      if (isValidLabel(label)) {
        details[label] = number
      }
    }

    const trailing = line.match(TRAILING_NUMBER_PATTERN)
    if (trailing) {
      const label = cleanLabel(trailing[1])
      const number = cleanNumber(trailing[2])
      if (isValidLabel(label)) {
        details[label] = number
        pendingLabel = null
        continue
      }
    }

    if (line.endsWith(':') || line.endsWith('：')) {
      const label = cleanLabel(line.slice(0, -1))
      pendingLabel = isValidLabel(label) ? label : null
      continue
    }

    pendingLabel = null
  }

  return details
}

export async function parsePayrollPdf(buffer: Buffer, fileName: string): Promise<PayrollParseResult> {
  const parser = new PDFParse({ data: buffer })

  try {
    const parsed = await parser.getText()
    const text = parsed.text || ''
    const details = extractDetails(text)

    if (Object.keys(details).length === 0) {
      throw new Error('PARSER_EXTRACTION_FAILED')
    }

    return {
      month: extractMonth(text),
      type: classifySlipType(fileName),
      details,
    }
  } finally {
    await parser.destroy()
  }
}
