import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { generatePdf } from '../../src/renderer/utils/generator'
import type { ExcelRow } from '../../src/shared/types'

// Минимальный валидный 1×1 PNG для тестов
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjkB6QAAAABJRU5ErkJggg==',
  'base64'
)

function loadFont(name: string) {
  return Array.from(readFileSync(join(process.cwd(), 'public', 'fonts', name)))
}

const baseArgs = {
  imageBytes: PNG_1x1,
  psdWidth: 595,
  psdHeight: 842,
  dpi: 72,
}

describe('generatePdf', () => {
  test('возвращает непустой Uint8Array', async () => {
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 100, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }]

    const result = await generatePdf({ ...baseArgs, fontBytes, zones, rows })

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  test('количество страниц равно количеству строк Excel', async () => {
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 100, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }, { Имя: 'Пётр' }]

    const result = await generatePdf({ ...baseArgs, fontBytes, zones, rows })
    const doc = await PDFDocument.load(result)

    expect(doc.getPageCount()).toBe(3)
  })

  test('пустые ячейки не вызывают ошибку', async () => {
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 100, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows: ExcelRow[] = [{ Имя: '' }, {}]

    await expect(generatePdf({ ...baseArgs, fontBytes, zones, rows })).resolves.toBeDefined()
  })

  test('pageLayout группирует несколько бейджей на одной странице', async () => {
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 100, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }, { Имя: 'Пётр' }, { Имя: 'Олег' }, { Имя: 'Юля' }]
    const pageLayout = {
      pageFormat: 'A4' as const,
      customWidthMm: null,
      customHeightMm: null,
      columns: 2,
      rows: 2,
      marginMm: 10,
      gapMm: 5,
      cropMarks: false,
    }

    const result = await generatePdf({ ...baseArgs, fontBytes, zones, rows, pageLayout })
    const doc = await PDFDocument.load(result)

    // 5 бейджей по 4 на страницу => 2 страницы
    expect(doc.getPageCount()).toBe(2)
    const { width, height } = doc.getPage(0).getSize()
    // A4 в points (72/25.4 на мм)
    expect(width).toBeCloseTo(210 * 72 / 25.4, 1)
    expect(height).toBeCloseTo(297 * 72 / 25.4, 1)
  })

  test('кастомные шрифты встраиваются и применяются к зонам', async () => {
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
      custom: [{ name: 'MyCustom', bytes: loadFont('Roboto-Regular.ttf') }],
    }
    const zones = [{
      id: '1', x: 100, y: 100, width: 200, height: 20,
      column: 'Имя', font: 'MyCustom', fontSize: 12,
    }]
    const rows = [{ Имя: 'Тест' }]

    const result = await generatePdf({ ...baseArgs, fontBytes, zones, rows })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })
})
