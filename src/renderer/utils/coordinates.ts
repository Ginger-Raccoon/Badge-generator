interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Size {
  width: number
  height: number
}

export function canvasToDoc(zone: Rect, canvasSize: Size, docSize: Size): Rect {
  const scaleX = docSize.width / canvasSize.width
  const scaleY = docSize.height / canvasSize.height
  return {
    x: zone.x * scaleX,
    y: zone.y * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}

export function docToCanvas(zone: Rect, canvasSize: Size, docSize: Size): Rect {
  const scaleX = canvasSize.width / docSize.width
  const scaleY = canvasSize.height / docSize.height
  return {
    x: zone.x * scaleX,
    y: zone.y * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}
