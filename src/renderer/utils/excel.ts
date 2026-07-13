import * as XLSX from 'xlsx'
import type { ExcelRow } from '../../shared/types'

// Убирает локальный префикс [$-XXXX] и вторичные секции ;@ из Excel-кода формата
function cleanFormatCode(fmt: string): string {
  return fmt.replace(/\[\$[^\]]*\]/g, '').split(';')[0].trim()
}

function formatDate(date: Date, fmt?: string): string {
  const d = date.getUTCDate()
  const m = date.getUTCMonth() + 1
  const y = date.getUTCFullYear()
  const fallback = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
  if (!fmt) return fallback
  const clean = cleanFormatCode(fmt)
  if (!clean) return fallback
  const result = clean
    .replace(/гггг/gi, String(y)).replace(/гг/gi, String(y).slice(-2))
    .replace(/мм/gi, String(m).padStart(2, '0')).replace(/м(?!м)/gi, String(m))
    .replace(/дд/gi, String(d).padStart(2, '0')).replace(/д(?!д)/gi, String(d))
    .replace(/yyyy/gi, String(y)).replace(/yy/gi, String(y).slice(-2))
    .replace(/mm/gi, String(m).padStart(2, '0')).replace(/m(?!m)/gi, String(m))
    .replace(/dd/gi, String(d).padStart(2, '0')).replace(/d(?!d)/gi, String(d))
  return /\d/.test(result) ? result : fallback
}

export function readExcel(buffer: ArrayLike<number>): { columns: string[]; rows: ExcelRow[] } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { columns: [], rows: [] }

  const ref = sheet['!ref']
  if (!ref) return { columns: [], rows: [] }
  const range = XLSX.utils.decode_range(ref)

  function readCell(r: number, c: number): string | number {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined
    if (!cell || cell.v == null) return ''
    if (cell.t === 'd') return formatDate(cell.v as Date, cell.z)
    return cell.v as string | number
  }

  const columns: string[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    columns.push(String(readCell(range.s.r, c)))
  }

  const rows: ExcelRow[] = []
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row: ExcelRow = {}
    let hasData = false
    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = columns[c - range.s.c]
      if (!key) continue
      const value = readCell(r, c)
      if (value !== '') hasData = true
      row[key] = value
    }
    if (hasData) rows.push(row)
  }

  return { columns: columns.filter(Boolean), rows }
}
