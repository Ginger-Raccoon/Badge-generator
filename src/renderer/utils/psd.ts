import { readPsd } from 'ag-psd'
import { parsePngDpi } from './pngMeta'
import { parseJpegDpi } from './jpegMeta'
import type { ParsedPsd } from '../../shared/types'

// PPCM (pixels per cm) → PPI (pixels per inch)
const PPCM_TO_PPI = 2.54

export async function parsePsd(bytes: Uint8Array): Promise<ParsedPsd> {
  const psd = readPsd(bytes, { skipLayerImageData: true })
  if (!psd.canvas) {
    throw new Error(
      'PSD не содержит составного изображения. ' +
      'Сохраните файл в Photoshop с включённой опцией "Maximize Compatibility".'
    )
  }
  const imageBytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    psd.canvas!.toBlob(blob => {
      if (!blob) { reject(new Error('Не удалось конвертировать PSD в PNG')); return }
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), reject)
    }, 'image/png')
  })

  const resolutionInfo = psd.imageResources?.resolutionInfo
  const resolutionMissing = resolutionInfo == null
  const resolution = resolutionInfo
    ? (resolutionInfo.horizontalResolutionUnit === 'PPCM'
      ? resolutionInfo.horizontalResolution * PPCM_TO_PPI
      : resolutionInfo.horizontalResolution)
    : 72

  return {
    imageBytes,
    imageFormat: 'png',
    width: psd.width,
    height: psd.height,
    resolution,
    resolutionMissing,
  }
}

function detectRasterFormat(filePath: string): 'png' | 'jpeg' | null {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  return null
}

async function parseRasterImage(bytes: Uint8Array, format: 'png' | 'jpeg'): Promise<ParsedPsd> {
  const imageBytes = new Uint8Array(bytes)
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
  const bitmap = await createImageBitmap(new Blob([imageBytes], { type: mimeType }))
  const { resolution, resolutionMissing } = format === 'png' ? parsePngDpi(bytes) : parseJpegDpi(bytes)
  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()

  return {
    imageBytes,
    imageFormat: format,
    width,
    height,
    resolution,
    resolutionMissing,
  }
}

export async function parseTemplate(bytes: Uint8Array, filePath: string): Promise<ParsedPsd> {
  const rasterFormat = detectRasterFormat(filePath)
  if (rasterFormat) return parseRasterImage(bytes, rasterFormat)
  return parsePsd(bytes)
}
