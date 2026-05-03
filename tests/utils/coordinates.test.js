import { canvasToDoc, docToCanvas } from '../../src/renderer/utils/coordinates.js'

const canvasSize = { width: 900, height: 1200 }
const docSize = { width: 1240, height: 1748 }

describe('canvasToDoc', () => {
  test('масштабирует зону из пикселей холста в пиксели PSD', () => {
    const zone = { x: 0, y: 0, width: 90, height: 12 }
    const result = canvasToDoc(zone, canvasSize, docSize)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(0)
    expect(result.width).toBeCloseTo(90 * (1240 / 900))
    expect(result.height).toBeCloseTo(12 * (1748 / 1200))
  })

  test('конвертирует произвольную зону', () => {
    const zone = { x: 450, y: 600, width: 180, height: 24 }
    const result = canvasToDoc(zone, canvasSize, docSize)
    const scaleX = 1240 / 900
    const scaleY = 1748 / 1200
    expect(result.x).toBeCloseTo(450 * scaleX)
    expect(result.y).toBeCloseTo(600 * scaleY)
    expect(result.width).toBeCloseTo(180 * scaleX)
    expect(result.height).toBeCloseTo(24 * scaleY)
  })
})

describe('docToCanvas', () => {
  test('масштабирует зону из пикселей PSD в пиксели холста', () => {
    const zone = { x: 100, y: 400, width: 200, height: 20 }
    const scaleX = 900 / 1240
    const scaleY = 1200 / 1748
    const result = docToCanvas(zone, canvasSize, docSize)
    expect(result.x).toBeCloseTo(100 * scaleX)
    expect(result.y).toBeCloseTo(400 * scaleY)
    expect(result.width).toBeCloseTo(200 * scaleX)
    expect(result.height).toBeCloseTo(20 * scaleY)
  })

  test('canvasToDoc и docToCanvas — взаимно обратные функции', () => {
    const original = { x: 300, y: 200, width: 150, height: 30 }
    const doc = canvasToDoc(original, canvasSize, docSize)
    const back = docToCanvas(doc, canvasSize, docSize)
    expect(back.x).toBeCloseTo(original.x)
    expect(back.y).toBeCloseTo(original.y)
    expect(back.width).toBeCloseTo(original.width)
    expect(back.height).toBeCloseTo(original.height)
  })
})
