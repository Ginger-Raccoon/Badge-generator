import { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { wrapText, splitValue } from './textLayout'
import type { ColumnSplits, ExcelRow, FontBytes, TemplateImageFormat } from '../../shared/types'

interface GeneratorZone {
  column: string
  font: string
  fontSize: number
  x: number
  y: number
  width: number
  height: number
  splitIndex?: number | null
  splitChar?: string
}

interface GeneratePdfArgs {
  imageBytes: Uint8Array
  imageFormat?: TemplateImageFormat
  psdWidth: number
  psdHeight: number
  dpi: number
  fontBytes: FontBytes
  zones: GeneratorZone[]
  rows: ExcelRow[]
  onProgress?: (done: number, total: number) => void
  columnSplits?: ColumnSplits
}

export async function generatePdf({ imageBytes, imageFormat = 'png', psdWidth, psdHeight, dpi, fontBytes, zones, rows, onProgress, columnSplits = {} }: GeneratePdfArgs): Promise<Uint8Array> {
  const scale = 72 / dpi
  const pageWidth = psdWidth * scale
  const pageHeight = psdHeight * scale

  const outputDoc = await PDFDocument.create()
  outputDoc.registerFontkit(fontkit)

  const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
  const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
  const fonts: Record<string, PDFFont> = { Roboto: robotoFont, PTSerif: ptSerifFont }
  for (const { name, bytes } of (fontBytes.custom ?? [])) {
    fonts[name] = await outputDoc.embedFont(new Uint8Array(bytes))
  }

  const pngImage = imageFormat === 'jpeg'
    ? await outputDoc.embedJpg(new Uint8Array(imageBytes))
    : await outputDoc.embedPng(new Uint8Array(imageBytes))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const page = outputDoc.addPage([pageWidth, pageHeight])
    page.drawImage(pngImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })

    for (const zone of zones) {
      const rawValue = row[zone.column]
      if (rawValue == null || rawValue === '') continue
      const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
      if (value === '') continue
      const font = fonts[zone.font] ?? robotoFont
      const maxWidthPt = zone.width * scale
      const lines = wrapText(String(value), maxWidthPt, zone.fontSize, (str, size) => font.widthOfTextAtSize(str, size))
      const lineHeight = zone.fontSize * 1.2
      const totalHeight = (lines.length - 1) * lineHeight + zone.fontSize
      const zoneCenterY = pageHeight - (zone.y + zone.height / 2) * scale
      const firstBaselineY = zoneCenterY + totalHeight / 2 - zone.fontSize

      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: zone.x * scale,
          y: firstBaselineY - lineIndex * lineHeight,
          size: zone.fontSize,
          font,
        })
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return outputDoc.save()
}
