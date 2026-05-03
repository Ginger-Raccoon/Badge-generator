import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { generatePdf } from '../../src/renderer/utils/generator.js'

async function makeTemplatePdf() {
  const doc = await PDFDocument.create()
  doc.addPage([595, 842])
  return doc.save()
}

function loadFont(name) {
  return Array.from(readFileSync(join(process.cwd(), 'public', 'fonts', name)))
}

describe('generatePdf', () => {
  test('возвращает непустой Uint8Array', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }]

    const result = await generatePdf({ templateBytes, fontBytes, zones, rows })

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  test('количество страниц равно количеству строк Excel', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }, { Имя: 'Пётр' }]

    const result = await generatePdf({ templateBytes, fontBytes, zones, rows })
    const doc = await PDFDocument.load(result)

    expect(doc.getPageCount()).toBe(3)
  })

  test('пустые ячейки не вызывают ошибку', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: '' }, { }]

    await expect(generatePdf({ templateBytes, fontBytes, zones, rows })).resolves.toBeDefined()
  })
})
