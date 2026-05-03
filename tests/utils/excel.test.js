import * as XLSX from 'xlsx'
import { readExcel } from '../../src/renderer/utils/excel.js'

function makeExcelBuffer(rows) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

describe('readExcel', () => {
  test('возвращает заголовки столбцов', () => {
    const buffer = makeExcelBuffer([
      { Имя: 'Иван', Фамилия: 'Петров' },
      { Имя: 'Анна', Фамилия: 'Сидорова' },
    ])
    const { columns } = readExcel(buffer)
    expect(columns).toEqual(['Имя', 'Фамилия'])
  })

  test('возвращает строки данных', () => {
    const buffer = makeExcelBuffer([
      { Имя: 'Иван', Фамилия: 'Петров' },
      { Имя: 'Анна', Фамилия: 'Сидорова' },
    ])
    const { rows } = readExcel(buffer)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ Имя: 'Иван', Фамилия: 'Петров' })
    expect(rows[1]).toEqual({ Имя: 'Анна', Фамилия: 'Сидорова' })
  })

  test('пустой файл возвращает пустые columns и rows', () => {
    const buffer = makeExcelBuffer([])
    const { columns, rows } = readExcel(buffer)
    expect(columns).toEqual([])
    expect(rows).toEqual([])
  })
})
