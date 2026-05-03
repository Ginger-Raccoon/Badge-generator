import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import * as pdfjsLib from 'pdfjs-dist'
import ZoneRect from './ZoneRect'
import { canvasToPdf, pdfToCanvas } from '../utils/coordinates'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export default function PDFViewer({ pdfPath, zones, onZonesChange, selectedZoneId, onSelectZone }) {
  const canvasRef = useRef(null)
  const [sizes, setSizes] = useState(null)
  const [drawing, setDrawing] = useState(null)

  useEffect(() => {
    if (!pdfPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(pdfPath)
      if (cancelled) return
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      setSizes({
        canvas: { width: viewport.width, height: viewport.height },
        pdf: { width: page.view[2], height: page.view[3] },
      })
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }

    render()
    return () => { cancelled = true }
  }, [pdfPath])

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

    const pdfCoords = canvasToPdf({ x, y, width: w, height: h }, sizes.canvas, sizes.pdf)
    const newZone = {
      id: crypto.randomUUID(),
      label: `Зона ${zones.length + 1}`,
      ...pdfCoords,
      column: '',
      font: 'Roboto',
      fontSize: 12,
    }
    onZonesChange([...zones, newZone])
  }

  function toCanvasCoords(zone) {
    if (!sizes) return null
    const c = pdfToCanvas(zone, sizes.canvas, sizes.pdf)
    return { canvasX: c.x, canvasY: c.y, canvasWidth: c.width, canvasHeight: c.height }
  }

  const drawingRect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.currentX),
        y: Math.min(drawing.startY, drawing.currentY),
        w: Math.abs(drawing.currentX - drawing.startX),
        h: Math.abs(drawing.currentY - drawing.startY),
      }
    : null

  if (!pdfPath) {
    return (
      <Box sx={{ p: 4, color: 'text.secondary' }}>
        <Typography>Загрузите PDF-шаблон</Typography>
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
