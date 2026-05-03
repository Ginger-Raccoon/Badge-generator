import * as XLSX from 'xlsx'

export function readExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { columns, rows }
}
