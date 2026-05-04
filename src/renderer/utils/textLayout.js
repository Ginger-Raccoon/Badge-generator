export function wrapText(text, maxWidth, fontSize, measureFn) {
  const words = String(text).split(' ')
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measureFn(candidate, fontSize) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export function splitValue(value, splitIndex, zoneSplitChar, columnSplitChar) {
  if (splitIndex == null) return String(value)
  const char = zoneSplitChar || columnSplitChar || ''
  if (!char) return String(value)
  const parts = String(value).split(char)
  return parts[splitIndex] ?? ''
}
