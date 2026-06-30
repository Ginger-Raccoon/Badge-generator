import * as XLSX from 'xlsx'
import type { ExcelRow } from '../../shared/types'

export function readExcel(buffer: ArrayLike<number>): { columns: string[]; rows: ExcelRow[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { columns: [], rows: [] }
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' })
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { columns, rows }
}
