import Tesseract from 'tesseract.js'

export interface ParsedAssignment {
  title?: string
  dueDate?: string
  description?: string
  externalLink?: string
}

export async function recognizeImage(file: File): Promise<string> {
  const { data } = await Tesseract.recognize(file, 'kor+eng', {
    logger: () => {},
  })
  return data.text
}

function extractUrl(text: string): string | undefined {
  const urlPattern = /https?:\/\/[^\s,)}\]]+/i
  const match = text.match(urlPattern)
  return match?.[0]
}

function extractDueDate(text: string): string | undefined {
  // "2026-04-10 23시59분" or "2026-04-10 23:59"
  const isoLike = text.match(
    /(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})\s*(\d{1,2})\s*[시:]\s*(\d{1,2})\s*분?/,
  )
  if (isoLike) {
    const [, y, m, d, h, min] = isoLike
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  // "4월 10일 23:59" style
  const korDate = text.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(\d{1,2})\s*[시:]\s*(\d{1,2})\s*분?/,
  )
  if (korDate) {
    const currentYear = new Date().getFullYear()
    const [, m, d, h, min] = korDate
    return `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  return undefined
}

function extractTitle(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    const titleMatch = line.match(/제\s*목\s+(.+)/i)
    if (titleMatch) {
      return titleMatch[1].trim()
    }
  }

  return undefined
}

function extractDescription(text: string): string | undefined {
  const lines = text.split('\n')
  let capturing = false
  const descLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (/내용\s*[/\/]\s*주의\s*사항|내용\/주의사항/i.test(trimmed)) {
      capturing = true
      continue
    }

    if (capturing) {
      if (/^제출\s*양식|^제출양식|^첨부\s*파일|^첨부파일/i.test(trimmed)) {
        break
      }
      if (trimmed) {
        descLines.push(trimmed)
      }
    }
  }

  if (descLines.length > 0) {
    return descLines.join('\n')
  }

  return undefined
}

export function parseAssignmentText(text: string): ParsedAssignment {
  const result: ParsedAssignment = {}

  result.title = extractTitle(text)

  const dueDates: string[] = []
  const datePattern =
    /(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})\s*(\d{1,2})\s*[시:]\s*(\d{1,2})\s*분?/g
  let match: RegExpExecArray | null
  while ((match = datePattern.exec(text)) !== null) {
    const [, y, m, d, h, min] = match
    dueDates.push(
      `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`,
    )
  }
  // Use the last date (end of submission period)
  if (dueDates.length > 0) {
    result.dueDate = dueDates[dueDates.length - 1]
  } else {
    result.dueDate = extractDueDate(text)
  }

  result.externalLink = extractUrl(text)
  result.description = extractDescription(text)

  return result
}
