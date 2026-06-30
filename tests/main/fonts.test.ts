import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getSystemFontDirs, scanFontDirs } from '../../src/main/fonts'

describe('getSystemFontDirs', () => {
  test('macOS включает папки в правильном порядке', () => {
    const dirs = getSystemFontDirs('darwin', '/Users/test')
    expect(dirs[0]).toBe('/Users/test/Library/Fonts')
    expect(dirs).toContain('/Library/Fonts')
    expect(dirs).toContain('/System/Library/Fonts')
  })

  test('windows возвращает C:\\Windows\\Fonts', () => {
    const dirs = getSystemFontDirs('win32', 'C:\\Users\\test')
    expect(dirs).toContain('C:\\Windows\\Fonts')
  })

  test('linux включает ~/.fonts', () => {
    const dirs = getSystemFontDirs('linux', '/home/test')
    expect(dirs[0]).toBe('/home/test/.fonts')
    expect(dirs).toContain('/usr/share/fonts')
  })
})

describe('scanFontDirs', () => {
  let tmp: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'fonts-test-'))
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test('находит TTF и OTF, игнорирует другие расширения', () => {
    writeFileSync(join(tmp, 'Arial.ttf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'Times.otf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'readme.txt'), 'not a font')
    const result = scanFontDirs([tmp])
    const names = result.map(f => f.name)
    expect(names).toContain('Arial')
    expect(names).toContain('Times')
    expect(names).not.toContain('readme')
  })

  test('результат отсортирован по имени', () => {
    writeFileSync(join(tmp, 'Zebra.ttf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'Apple.ttf'), Buffer.alloc(4))
    const result = scanFontDirs([tmp])
    expect(result[0].name).toBe('Apple')
    expect(result[1].name).toBe('Zebra')
  })

  test('дубликаты по имени устраняются, первая папка имеет приоритет', () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'fonts-test2-'))
    try {
      writeFileSync(join(tmp, 'Arial.ttf'), Buffer.alloc(4))
      writeFileSync(join(tmp2, 'Arial.ttf'), Buffer.alloc(4))
      const result = scanFontDirs([tmp, tmp2])
      const arials = result.filter(f => f.name === 'Arial')
      expect(arials).toHaveLength(1)
      expect(arials[0].path).toContain(tmp)
    } finally {
      rmSync(tmp2, { recursive: true, force: true })
    }
  })

  test('несуществующие папки игнорируются', () => {
    const result = scanFontDirs(['/nonexistent/path/to/fonts'])
    expect(result).toEqual([])
  })

  test('рекурсивно сканирует подпапки', () => {
    const sub = join(tmp, 'Supplemental')
    mkdirSync(sub)
    writeFileSync(join(sub, 'Nested.ttf'), Buffer.alloc(4))
    const result = scanFontDirs([tmp])
    expect(result[0].name).toBe('Nested')
    expect(result[0].path).toBe(join(sub, 'Nested.ttf'))
  })
})
