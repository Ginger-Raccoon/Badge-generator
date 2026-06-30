const DEFAULT_RESULT = { resolution: 72, resolutionMissing: true }

export function parseJpegDpi(bytes: Uint8Array): { resolution: number; resolutionMissing: boolean } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return DEFAULT_RESULT

  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return DEFAULT_RESULT
    offset++
    while (offset < bytes.length && bytes[offset] === 0xff) offset++
    if (offset >= bytes.length) return DEFAULT_RESULT
    const marker = bytes[offset]
    offset++

    if (marker === 0xd9) return DEFAULT_RESULT // EOI
    if (marker === 0xda) return DEFAULT_RESULT // SOS
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue

    if (offset + 2 > bytes.length) return DEFAULT_RESULT
    const length = (bytes[offset] << 8) | bytes[offset + 1]
    const dataStart = offset + 2
    const dataEnd = offset + length
    if (length < 2 || dataEnd > bytes.length) return DEFAULT_RESULT

    if (marker === 0xe0) {
      if (
        length >= 14 &&
        bytes[dataStart] === 0x4a &&
        bytes[dataStart + 1] === 0x46 &&
        bytes[dataStart + 2] === 0x49 &&
        bytes[dataStart + 3] === 0x46 &&
        bytes[dataStart + 4] === 0x00
      ) {
        const units = bytes[dataStart + 7]
        const xDensity = (bytes[dataStart + 8] << 8) | bytes[dataStart + 9]
        if (units === 1) return { resolution: xDensity, resolutionMissing: false }
        if (units === 2) return { resolution: Math.round(xDensity * 2.54), resolutionMissing: false }
        return DEFAULT_RESULT
      }
      return DEFAULT_RESULT
    }

    offset = dataEnd
  }

  return DEFAULT_RESULT
}
