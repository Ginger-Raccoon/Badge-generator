export function canvasToPdf(zone, canvasSize, pdfSize) {
  const scaleX = pdfSize.width / canvasSize.width
  const scaleY = pdfSize.height / canvasSize.height
  return {
    x: zone.x * scaleX,
    y: pdfSize.height - (zone.y + zone.height) * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}

export function pdfToCanvas(zone, canvasSize, pdfSize) {
  const scaleX = canvasSize.width / pdfSize.width
  const scaleY = canvasSize.height / pdfSize.height
  return {
    x: zone.x * scaleX,
    y: (pdfSize.height - zone.y - zone.height) * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}
