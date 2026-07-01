import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { wrapText, splitValue } from './textLayout'
import { getPageSizeMm } from './layout'
import type { ColumnSplits, ExcelRow, FontBytes, PageLayout, TemplateImageFormat } from '../../shared/types'

const MM_TO_PT = 72 / 25.4
const CROP_MARK_HALF_LENGTH_PT = 1.5 * MM_TO_PT

// Рисует метку-крестик в точке (x, y) — используется на середине зазора между
// соседними бейджами (или середине поля страницы у внешнего края), а не у самого края бейджа.
function drawCropMark(page: PDFPage, x: number, y: number) {
  page.drawLine({ start: { x: x - CROP_MARK_HALF_LENGTH_PT, y }, end: { x: x + CROP_MARK_HALF_LENGTH_PT, y }, thickness: 0.5, color: rgb(0, 0, 0) })
  page.drawLine({ start: { x, y: y - CROP_MARK_HALF_LENGTH_PT }, end: { x, y: y + CROP_MARK_HALF_LENGTH_PT }, thickness: 0.5, color: rgb(0, 0, 0) })
}

function drawCropMarks(
  page: PDFPage,
  originX: number,
  originY: number,
  badgeWidth: number,
  badgeHeight: number,
  col: number,
  gridRow: number,
  columns: number,
  gridRows: number,
  marginPt: number,
  gapPt: number
) {
  const leftX = col > 0 ? originX - gapPt / 2 : originX - marginPt / 2
  const rightX = col < columns - 1 ? originX + badgeWidth + gapPt / 2 : originX + badgeWidth + marginPt / 2
  const topY = gridRow > 0 ? originY + badgeHeight + gapPt / 2 : originY + badgeHeight + marginPt / 2
  const bottomY = gridRow < gridRows - 1 ? originY - gapPt / 2 : originY - marginPt / 2

  drawCropMark(page, leftX, topY)
  drawCropMark(page, rightX, topY)
  drawCropMark(page, leftX, bottomY)
  drawCropMark(page, rightX, bottomY)
}

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
  pageLayout?: PageLayout | null
}

export async function generatePdf({ imageBytes, imageFormat = 'png', psdWidth, psdHeight, dpi, fontBytes, zones, rows, onProgress, columnSplits = {}, pageLayout = null }: GeneratePdfArgs): Promise<Uint8Array> {
  const layoutScale = pageLayout ? Math.max(0.01, (pageLayout.badgeScalePercent ?? 100) / 100) : 1
  const scale = (72 / dpi) * layoutScale
  const badgeWidth = psdWidth * scale
  const badgeHeight = psdHeight * scale

  const columns = pageLayout ? Math.max(1, pageLayout.columns) : 1
  const gridRows = pageLayout ? Math.max(1, pageLayout.rows) : 1
  const marginPt = pageLayout ? pageLayout.marginMm * MM_TO_PT : 0
  const gapPt = pageLayout ? pageLayout.gapMm * MM_TO_PT : 0
  const [pageWidth, pageHeight] = pageLayout
    ? getPageSizeMm(pageLayout).map(mm => mm * MM_TO_PT) as [number, number]
    : [badgeWidth, badgeHeight]
  const perPage = columns * gridRows

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

  let page = outputDoc.addPage([pageWidth, pageHeight])

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const slot = i % perPage
    if (i > 0 && slot === 0) {
      page = outputDoc.addPage([pageWidth, pageHeight])
    }
    const col = slot % columns
    const gridRow = Math.floor(slot / columns)
    const originX = marginPt + col * (badgeWidth + gapPt)
    const originY = pageHeight - marginPt - gridRow * (badgeHeight + gapPt) - badgeHeight

    page.drawImage(pngImage, { x: originX, y: originY, width: badgeWidth, height: badgeHeight })

    if (pageLayout?.cropMarks) {
      drawCropMarks(page, originX, originY, badgeWidth, badgeHeight, col, gridRow, columns, gridRows, marginPt, gapPt)
    }

    for (const zone of zones) {
      const rawValue = row[zone.column]
      if (rawValue == null || rawValue === '') continue
      const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
      if (value === '') continue
      const font = fonts[zone.font] ?? robotoFont
      const fontSize = zone.fontSize * layoutScale
      const maxWidthPt = zone.width * scale
      const lines = wrapText(String(value), maxWidthPt, fontSize, (str, size) => font.widthOfTextAtSize(str, size))
      const lineHeight = fontSize * 1.2
      const totalHeight = (lines.length - 1) * lineHeight + fontSize
      const zoneCenterY = originY + badgeHeight - (zone.y + zone.height / 2) * scale
      const firstBaselineY = zoneCenterY + totalHeight / 2 - fontSize

      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: originX + zone.x * scale,
          y: firstBaselineY - lineIndex * lineHeight,
          size: fontSize,
          font,
        })
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return outputDoc.save()
}
