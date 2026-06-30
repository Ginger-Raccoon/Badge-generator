import { describe, it, expect } from 'vitest'
import { parseJpegDpi } from '../../src/renderer/utils/jpegMeta'

function u16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff]
}

function buildJfifApp0(units: number, xDensity: number, yDensity: number): number[] {
  const data = [
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    1, 2, // версия
    units,
    ...u16(xDensity),
    ...u16(yDensity),
    0, 0, // thumbnail width/height
  ]
  const length = data.length + 2
  return [0xff, 0xe0, ...u16(length), ...data]
}

function buildJpeg(segments: number[][]): Uint8Array {
  const bytes = [0xff, 0xd8, ...segments.flat(), 0xff, 0xd9]
  return new Uint8Array(bytes)
}

describe('parseJpegDpi', () => {
  it('JFIF APP0 с units=1 (dpi) — возвращает Xdensity как есть', () => {
    const jpeg = buildJpeg([buildJfifApp0(1, 300, 300)])
    expect(parseJpegDpi(jpeg)).toEqual({ resolution: 300, resolutionMissing: false })
  })

  it('JFIF APP0 с units=2 (dpcm) — конвертирует в dpi с округлением', () => {
    const jpeg = buildJpeg([buildJfifApp0(2, 118, 118)])
    expect(parseJpegDpi(jpeg)).toEqual({ resolution: Math.round(118 * 2.54), resolutionMissing: false })
  })

  it('JFIF APP0 с units=0 (только aspect ratio) — DPI отсутствует', () => {
    const jpeg = buildJpeg([buildJfifApp0(0, 1, 1)])
    expect(parseJpegDpi(jpeg)).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('нет APP0 вообще (сразу SOS) — DPI отсутствует', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])
    expect(parseJpegDpi(jpeg)).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('APP1/EXIF без JFIF APP0 — DPI отсутствует', () => {
    const app1Data = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // "Exif\0\0"
    const length = app1Data.length + 2
    const app1 = [0xff, 0xe1, ...u16(length), ...app1Data]
    const jpeg = buildJpeg([app1])
    expect(parseJpegDpi(jpeg)).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('пустой буфер — не бросает исключение, DPI отсутствует', () => {
    expect(parseJpegDpi(new Uint8Array([]))).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('слишком короткий буфер — не бросает исключение, DPI отсутствует', () => {
    expect(parseJpegDpi(new Uint8Array([0xff, 0xd8]))).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('мусорный буфер без сигнатуры FF D8 — не бросает исключение, DPI отсутствует', () => {
    const garbage = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55])
    expect(parseJpegDpi(garbage)).toEqual({ resolution: 72, resolutionMissing: true })
  })
})
