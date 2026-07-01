import { computeAutoGrid, getPageSizeMm, pxToMm } from '../../src/renderer/utils/layout'
import type { PageLayout } from '../../src/shared/types'

describe('pxToMm', () => {
  test('конвертирует пиксели в мм по DPI', () => {
    expect(pxToMm(300, 300)).toBeCloseTo(25.4, 5)
    expect(pxToMm(150, 300)).toBeCloseTo(12.7, 5)
  })
})

describe('getPageSizeMm', () => {
  test('возвращает размеры A4', () => {
    expect(getPageSizeMm({ pageFormat: 'A4' } as PageLayout)).toEqual([210, 297])
  })

  test('возвращает свой размер для custom', () => {
    const layout = { pageFormat: 'custom', customWidthMm: 100, customHeightMm: 150 } as PageLayout
    expect(getPageSizeMm(layout)).toEqual([100, 150])
  })
})

describe('computeAutoGrid', () => {
  test('считает сколько бейджей влезает на A4 с полями и зазором', () => {
    // бейдж 90x55мм, поля 10мм, зазор 5мм => по ширине (210-20+5)/(90+5)=2.05 -> 2, по высоте (297-20+5)/(55+5)=4.7 -> 4
    const { columns, rows } = computeAutoGrid(90, 55, 210, 297, 10, 5)
    expect(columns).toBe(2)
    expect(rows).toBe(4)
  })

  test('уменьшение размера бейджа (масштаб) позволяет уместить больше', () => {
    const native = computeAutoGrid(90, 55, 210, 297, 10, 5)
    const scaled = computeAutoGrid(45, 27.5, 210, 297, 10, 5) // 50% масштаб
    expect(scaled.columns).toBeGreaterThan(native.columns)
    expect(scaled.rows).toBeGreaterThan(native.rows)
  })

  test('минимум 1 колонка и 1 строка, даже если бейдж больше страницы', () => {
    const { columns, rows } = computeAutoGrid(500, 500, 210, 297, 10, 5)
    expect(columns).toBe(1)
    expect(rows).toBe(1)
  })
})
