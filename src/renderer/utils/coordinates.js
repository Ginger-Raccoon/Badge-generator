export function canvasToDoc(zone, canvasSize, docSize) {
  const scaleX = docSize.width / canvasSize.width
  const scaleY = docSize.height / canvasSize.height
  return {
    x: zone.x * scaleX,
    y: zone.y * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}

export function docToCanvas(zone, canvasSize, docSize) {
  const scaleX = canvasSize.width / docSize.width
  const scaleY = canvasSize.height / docSize.height
  return {
    x: zone.x * scaleX,
    y: zone.y * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}
