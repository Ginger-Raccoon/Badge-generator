const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const MISSING = { resolution: 72, resolutionMissing: true }

export function parsePngDpi(bytes: Uint8Array): { resolution: number; resolutionMissing: boolean } {
  try {
    if (bytes.length < 8) return MISSING
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== PNG_SIGNATURE[i]) return MISSING
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    let offset = 8

    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset)
      const type = String.fromCharCode(
        bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
      )
      const dataStart = offset + 8
      if (dataStart + length > bytes.length) return MISSING

      if (type === 'pHYs') {
        if (length < 9) return MISSING
        const pixelsPerUnitX = view.getUint32(dataStart)
        const unit = bytes[dataStart + 8]
        if (unit !== 1) return MISSING
        return { resolution: Math.round(pixelsPerUnitX * 0.0254), resolutionMissing: false }
      }

      if (type === 'IDAT' || type === 'IEND') return MISSING

      offset = dataStart + length + 4
    }

    return MISSING
  } catch {
    return MISSING
  }
}
