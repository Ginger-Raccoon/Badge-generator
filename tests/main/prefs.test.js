import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { loadPrefs, savePrefs } from '../../src/main/prefs.js'
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '../../src/shared/defaults.js'

const TMP = join(process.cwd(), '.tmp-prefs-test')

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('loadPrefs', () => {
  test('возвращает дефолты если файл отсутствует', () => {
    const prefs = loadPrefs(TMP)
    expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false, defaultFont: DEFAULT_FONT, defaultFontSize: DEFAULT_FONT_SIZE })
  })

  test('читает сохранённые данные', () => {
    savePrefs(TMP, { favorites: ['Проект А'], skipDeleteConfirm: true })
    const prefs = loadPrefs(TMP)
    expect(prefs.favorites).toEqual(['Проект А'])
    expect(prefs.skipDeleteConfirm).toBe(true)
  })

  test('возвращает дефолты при битом JSON', () => {
    writeFileSync(join(TMP, 'prefs.json'), 'не json')
    const prefs = loadPrefs(TMP)
    expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false, defaultFont: DEFAULT_FONT, defaultFontSize: DEFAULT_FONT_SIZE })
  })
})

describe('savePrefs', () => {
  test('создаёт файл и сохраняет данные', () => {
    savePrefs(TMP, { favorites: ['X'], skipDeleteConfirm: false })
    const prefs = loadPrefs(TMP)
    expect(prefs.favorites).toEqual(['X'])
  })
})
