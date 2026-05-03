import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export async function generatePdf({ pngBytes, psdWidth, psdHeight, dpi, fontBytes, zones, rows, onProgress }) {
  const scale = 72 / dpi
  const pageWidth = psdWidth * scale
  const pageHeight = psdHeight * scale

  const outputDoc = await PDFDocument.create()
  outputDoc.registerFontkit(fontkit)

  const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
  const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
  const fonts = { Roboto: robotoFont, PTSerif: ptSerifFont }

  const pngImage = await outputDoc.embedPng(new Uint8Array(pngBytes))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const page = outputDoc.addPage([pageWidth, pageHeight])
    page.drawImage(pngImage, { x: 0, y: 0, width: pageWidth, height: pageHeight })

    for (const zone of zones) {
      const value = row[zone.column]
      if (value == null || value === '') continue
      page.drawText(String(value), {
        x: zone.x * scale,
        y: pageHeight - (zone.y + zone.height) * scale,
        size: zone.fontSize,
        font: fonts[zone.font] ?? robotoFont,
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return outputDoc.save()
}
