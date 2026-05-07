import { describe, test, expect } from 'vitest'
import { applyProjectSettings } from '../../src/renderer/utils/zones.js'

describe('applyProjectSettings', () => {
  test('обновляет font у зон с effectiveOldFont', () => {
    const zones = [
      { id: '1', font: 'Roboto', fontSize: 18 },
      { id: '2', font: 'PTSerif', fontSize: 18 },
    ]
    const result = applyProjectSettings(zones, { projectFont: 'PTSerif' }, 'Roboto', 18)
    expect(result[0].font).toBe('PTSerif') // совпадал с дефолтом → обновлён
    expect(result[1].font).toBe('PTSerif') // уже PTSerif, не совпадал с Roboto → не тронут
  })

  test('не обновляет font у зон с отличным от effectiveOldFont значением', () => {
    const zones = [{ id: '1', font: 'PTSerif', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFont: 'Roboto' }, 'Roboto', 18)
    expect(result[0].font).toBe('PTSerif') // PTSerif != effectiveOldFont (Roboto) → не тронут
  })

  test('обновляет fontSize у зон с effectiveOldFontSize', () => {
    const zones = [
      { id: '1', font: 'Roboto', fontSize: 18 },
      { id: '2', font: 'Roboto', fontSize: 14 },
    ]
    const result = applyProjectSettings(zones, { projectFontSize: 24 }, 'Roboto', 18)
    expect(result[0].fontSize).toBe(24) // 18 == effectiveOld → обновлён
    expect(result[1].fontSize).toBe(14) // 14 != effectiveOld → не тронут
  })

  test('патч только с projectFont не трогает fontSize', () => {
    const zones = [{ id: '1', font: 'Roboto', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFont: 'PTSerif' }, 'Roboto', 18)
    expect(result[0].fontSize).toBe(18)
  })

  test('патч только с projectFontSize не трогает font', () => {
    const zones = [{ id: '1', font: 'Roboto', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFontSize: 24 }, 'Roboto', 18)
    expect(result[0].font).toBe('Roboto')
  })

  test('возвращает те же объекты зон если ничего не изменилось', () => {
    const zones = [{ id: '1', font: 'PTSerif', fontSize: 14 }]
    const result = applyProjectSettings(zones, { projectFont: 'Roboto' }, 'Roboto', 18)
    expect(result[0]).toBe(zones[0]) // строгое равенство — объект не пересоздан
  })
})
