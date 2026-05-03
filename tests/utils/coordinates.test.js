import { canvasToPdf, pdfToCanvas } from '../../src/renderer/utils/coordinates.js'

const canvasSize = { width: 900, height: 1200 }
const pdfSize = { width: 595, height: 842 }

describe('canvasToPdf', () => {
  test('конвертирует верхний левый угол холста в PDF-координаты', () => {
    const zone = { x: 0, y: 0, width: 90, height: 12 }
    const result = canvasToPdf(zone, canvasSize, pdfSize)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(842 - 12 * (842 / 1200))
    expect(result.width).toBeCloseTo(90 * (595 / 900))
    expect(result.height).toBeCloseTo(12 * (842 / 1200))
  })

  test('конвертирует произвольную зону', () => {
    const zone = { x: 450, y: 600, width: 180, height: 24 }
    const result = canvasToPdf(zone, canvasSize, pdfSize)
    const scaleX = 595 / 900
    const scaleY = 842 / 1200
    expect(result.x).toBeCloseTo(450 * scaleX)
    expect(result.y).toBeCloseTo(842 - (600 + 24) * scaleY)
    expect(result.width).toBeCloseTo(180 * scaleX)
    expect(result.height).toBeCloseTo(24 * scaleY)
  })
})

describe('pdfToCanvas', () => {
  test('обратная конвертация из PDF-координат в холст', () => {
    const zone = { x: 100, y: 400, width: 200, height: 20 }
    const scaleX = 900 / 595
    const scaleY = 1200 / 842
    const result = pdfToCanvas(zone, canvasSize, pdfSize)
    expect(result.x).toBeCloseTo(100 * scaleX)
    expect(result.y).toBeCloseTo((842 - 400 - 20) * scaleY)
    expect(result.width).toBeCloseTo(200 * scaleX)
    expect(result.height).toBeCloseTo(20 * scaleY)
  })

  test('canvasToPdf и pdfToCanvas — взаимно обратные функции', () => {
    const original = { x: 300, y: 200, width: 150, height: 30 }
    const pdf = canvasToPdf(original, canvasSize, pdfSize)
    const back = pdfToCanvas(pdf, canvasSize, pdfSize)
    expect(back.x).toBeCloseTo(original.x)
    expect(back.y).toBeCloseTo(original.y)
    expect(back.width).toBeCloseTo(original.width)
    expect(back.height).toBeCloseTo(original.height)
  })
})
