type MeasureFn = (text: string, fontSize: number) => number

export function wrapText(text: unknown, maxWidth: number, fontSize: number, measureFn: MeasureFn): string[] {
  const words = String(text).split(' ')
  const lines: string[] = []
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

export function splitValue(
  value: unknown,
  splitIndex: number | null,
  zoneSplitChar: string,
  columnSplitChar: string,
): string {
  if (splitIndex == null) return String(value)
  const char = zoneSplitChar || columnSplitChar || ''
  if (!char) return String(value)
  const parts = String(value).split(char)
  return parts[splitIndex] ?? ''
}
