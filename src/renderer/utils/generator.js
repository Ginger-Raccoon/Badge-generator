import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export async function generatePdf({ templateBytes, fontBytes, zones, rows, onProgress }) {
  const templateDoc = await PDFDocument.load(new Uint8Array(templateBytes))
  const outputDoc = await PDFDocument.create()
  outputDoc.registerFontkit(fontkit)

  const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
  const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
  const fonts = { Roboto: robotoFont, PTSerif: ptSerifFont }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const [page] = await outputDoc.copyPages(templateDoc, [0])
    outputDoc.addPage(page)

    for (const zone of zones) {
      const value = row[zone.column]
      if (value == null || value === '') continue
      page.drawText(String(value), {
        x: zone.x,
        y: zone.y,
        size: zone.fontSize,
        font: fonts[zone.font] ?? robotoFont,
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return outputDoc.save()
}
