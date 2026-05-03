import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { parsePsd } from '../utils/psd'
import ZoneRect from './ZoneRect'
import { canvasToDoc, docToCanvas } from '../utils/coordinates'

export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed }) {
  const canvasRef = useRef(null)
  const [sizes, setSizes] = useState(null)
  const [drawing, setDrawing] = useState(null)

  useEffect(() => {
    if (!psdPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(psdPath)
      if (cancelled) return
      const parsed = await parsePsd(new Uint8Array(bytes))
      if (cancelled) return
      onPsdParsed?.(parsed)

      const blob = new Blob([parsed.pngBytes], { type: 'image/png' })
      const bitmap = await createImageBitmap(blob)
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      const displayScale = Math.min(1, 900 / parsed.width)
      canvas.width = Math.round(parsed.width * displayScale)
      canvas.height = Math.round(parsed.height * displayScale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      setSizes({
        canvas: { width: canvas.width, height: canvas.height },
        psd: { width: parsed.width, height: parsed.height },
      })
    }

    render()
    return () => { cancelled = true }
  }, [psdPath])

  function getSvgPos(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e) {
    if (!sizes) return
    const pos = getSvgPos(e)
    setDrawing({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  function handleMouseMove(e) {
    if (!drawing) return
    const pos = getSvgPos(e)
    setDrawing(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }

  function handleMouseUp() {
    if (!drawing || !sizes) return
    const x = Math.min(drawing.startX, drawing.currentX)
    const y = Math.min(drawing.startY, drawing.currentY)
    const w = Math.abs(drawing.currentX - drawing.startX)
    const h = Math.abs(drawing.currentY - drawing.startY)
    setDrawing(null)
    if (w < 5 || h < 5) return

    const docCoords = canvasToDoc({ x, y, width: w, height: h }, sizes.canvas, sizes.psd)
    onZonesChange([...zones, {
      id: crypto.randomUUID(),
      label: `Зона ${zones.length + 1}`,
      ...docCoords,
      column: '',
      font: 'Roboto',
      fontSize: 12,
    }])
  }

  function toCanvasCoords(zone) {
    if (!sizes) return null
    const c = docToCanvas(zone, sizes.canvas, sizes.psd)
    return { canvasX: c.x, canvasY: c.y, canvasWidth: c.width, canvasHeight: c.height }
  }

  const drawingRect = drawing ? {
    x: Math.min(drawing.startX, drawing.currentX),
    y: Math.min(drawing.startY, drawing.currentY),
    w: Math.abs(drawing.currentX - drawing.startX),
    h: Math.abs(drawing.currentY - drawing.startY),
  } : null

  if (!psdPath) {
    return (
      <Box sx={{ p: 4, color: 'text.secondary' }}>
        <Typography>Загрузите PSD-шаблон</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {sizes && (
        <svg
          style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
          width={sizes.canvas.width}
          height={sizes.canvas.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {zones.map(zone => {
            const coords = toCanvasCoords(zone)
            if (!coords) return null
            return (
              <ZoneRect
                key={zone.id}
                zone={{ ...zone, ...coords }}
                isSelected={zone.id === selectedZoneId}
                onClick={e => { e.stopPropagation(); onSelectZone(zone.id) }}
              />
            )
          })}
          {drawingRect && (
            <rect
              x={drawingRect.x} y={drawingRect.y}
              width={drawingRect.w} height={drawingRect.h}
              fill="rgba(25, 118, 210, 0.1)"
              stroke="#1976d2"
              strokeWidth={1}
              strokeDasharray="4"
            />
          )}
        </svg>
      )}
    </Box>
  )
}
