import { readPsd } from 'ag-psd'

export async function parsePsd(bytes) {
  const psd = readPsd(bytes, { skipLayerImageData: true })
  if (!psd.canvas) {
    throw new Error(
      'PSD не содержит составного изображения. ' +
      'Сохраните файл в Photoshop с включённой опцией "Maximize Compatibility".'
    )
  }
  const pngBytes = await new Promise((resolve, reject) => {
    psd.canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Не удалось конвертировать PSD в PNG')); return }
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), reject)
    }, 'image/png')
  })
  const resolutionMissing = psd.resolution == null
  return {
    pngBytes,
    width: psd.width,
    height: psd.height,
    resolution: psd.resolution ?? 72,
    resolutionMissing,
  }
}
