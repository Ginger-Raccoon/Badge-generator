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
