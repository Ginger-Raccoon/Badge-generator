import { describe, it, expect } from 'vitest'
import { parsePngDpi } from '../../src/renderer/utils/pngMeta'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function chunk(type: string, data: number[]): number[] {
  const length = data.length
  const lengthBytes = [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
  ]
  const typeBytes = Array.from(type).map(c => c.charCodeAt(0))
  const crcBytes = [0, 0, 0, 0] // CRC не проверяется парсером
  return [...lengthBytes, ...typeBytes, ...data, ...crcBytes]
}

function uint32be(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]
}

function ihdrChunk(): number[] {
  // ширина=1, высота=1, остальные поля IHDR заполнены валидными минимальными значениями
  const data = [
    ...uint32be(1), // width
    ...uint32be(1), // height
    8, // bit depth
    6, // color type (RGBA)
    0, // compression
    0, // filter
    0, // interlace
  ]
  return chunk('IHDR', data)
}

function physChunk(pixelsPerUnitX: number, pixelsPerUnitY: number, unit: number): number[] {
  return chunk('pHYs', [...uint32be(pixelsPerUnitX), ...uint32be(pixelsPerUnitY), unit])
}

function idatChunk(): number[] {
  return chunk('IDAT', [0, 0, 0, 0])
}

function buildPng(chunks: number[][]): Uint8Array {
  return new Uint8Array([...SIGNATURE, ...chunks.flat()])
}

describe('parsePngDpi', () => {
  it('корректный pHYs с unit=1 (метры) — вычисляет DPI, 2835 ppm ≈ 72 dpi', () => {
    const png = buildPng([ihdrChunk(), physChunk(2835, 2835, 1), idatChunk()])
    expect(parsePngDpi(png)).toEqual({ resolution: 72, resolutionMissing: false })
  })

  it('корректный pHYs с unit=1 (метры) — 11811 ppm ≈ 300 dpi', () => {
    const png = buildPng([ihdrChunk(), physChunk(11811, 11811, 1), idatChunk()])
    expect(parsePngDpi(png)).toEqual({ resolution: 300, resolutionMissing: false })
  })

  it('pHYs с unit=0 (только соотношение сторон) — resolutionMissing: true', () => {
    const png = buildPng([ihdrChunk(), physChunk(4, 3, 0), idatChunk()])
    expect(parsePngDpi(png)).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('PNG без pHYs chunk (сразу IHDR → IDAT) — resolutionMissing: true', () => {
    const png = buildPng([ihdrChunk(), idatChunk()])
    expect(parsePngDpi(png)).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('пустой буфер — не бросает исключение, resolutionMissing: true', () => {
    expect(parsePngDpi(new Uint8Array([]))).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('слишком короткий буфер — не бросает исключение, resolutionMissing: true', () => {
    expect(parsePngDpi(new Uint8Array([0x89, 0x50, 0x4e]))).toEqual({ resolution: 72, resolutionMissing: true })
  })

  it('мусорный буфер без валидной сигнатуры — resolutionMissing: true', () => {
    const garbage = new Uint8Array(50).fill(0xff)
    expect(parsePngDpi(garbage)).toEqual({ resolution: 72, resolutionMissing: true })
  })
})
