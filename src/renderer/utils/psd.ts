import { readPsd } from 'ag-psd'
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
  const pngBytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
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
    pngBytes,
    width: psd.width,
    height: psd.height,
    resolution,
    resolutionMissing,
  }
}
