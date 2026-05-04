import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { parsePsd } from '../utils/psd'
import ZoneRect from './ZoneRect'
import { canvasToDoc, docToCanvas } from '../utils/coordinates'
import { wrapText } from '../utils/textLayout'

export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi }) {
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const [sizes, setSizes] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const fontsRef = useRef({})
  const measureCanvasRef = useRef(document.createElement('canvas'))
  const [fontsReady, setFontsReady] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    async function loadFonts() {
      const fontBytes = await window.api.loadFonts()
      if (cancelled) return
      const entries = [
        ['Roboto', fontBytes.roboto, 'Roboto-preview'],
        ['PTSerif', fontBytes.ptSerif, 'PTSerif-preview'],
      ]
      for (const [name, bytes, family] of entries) {
        const face = new FontFace(family, bytes)
        await face.load()
        if (cancelled) return
        document.fonts.add(face)
        fontsRef.current[name] = family
      }
      setFontsReady(true)
    }
    loadFonts()
    return () => { cancelled = true }
  }, [])

  function getSvgPos(e) {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function measureText(text, fontSize, fontFamily) {
    const ctx = measureCanvasRef.current.getContext('2d')
    ctx.font = `${fontSize}px '${fontFamily}'`
    return ctx.measureText(text).width
  }

  function getPreviewLines(zone, coords) {
    if (!fontsReady || !previewRow || !zone.column || !dpi || !sizes) return null
    const value = previewRow[zone.column]
    if (value == null || value === '') return null
    const fontFamily = fontsRef.current[zone.font] ?? fontsRef.current['Roboto']
    if (!fontFamily) return null
    const displayScale = sizes.canvas.width / sizes.psd.width
    const svgFontSize = zone.fontSize * (dpi / 72) * displayScale
    const lines = wrapText(String(value), coords.canvasWidth, svgFontSize, (str, size) => measureText(str, size, fontFamily))
    const lineHeight = svgFontSize * 1.2
    const totalHeight = (lines.length - 1) * lineHeight + svgFontSize
    const startY = coords.canvasY + (coords.canvasHeight - totalHeight) / 2 + svgFontSize
    return { fontFamily, fontSize: svgFontSize, lines, lineHeight, startY }
  }

  function computeLiveZone(zone, inter) {
    if (!inter || !sizes) return null
    const scaleX = sizes.psd.width / sizes.canvas.width
    const scaleY = sizes.psd.height / sizes.canvas.height
    const dx = (inter.currentX - inter.startX) * scaleX
    const dy = (inter.currentY - inter.startY) * scaleY

    if (inter.type === 'moving' && inter.zoneId === zone.id) {
      return {
        x: Math.max(0, Math.min(sizes.psd.width - zone.width, inter.origDocX + dx)),
        y: Math.max(0, Math.min(sizes.psd.height - zone.height, inter.origDocY + dy)),
      }
    }

    if (inter.type === 'resizing' && inter.zoneId === zone.id) {
      const o = inter.origDocZone
      let x, y, width, height

      if (inter.corner === 'tl') {
        const right = o.x + o.width
        const bottom = o.y + o.height
        x = Math.max(0, Math.min(right - 5, o.x + dx))
        y = Math.max(0, Math.min(bottom - 5, o.y + dy))
        width = right - x
        height = bottom - y
      } else if (inter.corner === 'tr') {
        const bottom = o.y + o.height
        const right = Math.min(sizes.psd.width, Math.max(o.x + 5, o.x + o.width + dx))
        x = o.x
        y = Math.max(0, Math.min(bottom - 5, o.y + dy))
        width = right - x
        height = bottom - y
      } else if (inter.corner === 'bl') {
        const right = o.x + o.width
        const bottom = Math.min(sizes.psd.height, Math.max(o.y + 5, o.y + o.height + dy))
        x = Math.max(0, Math.min(right - 5, o.x + dx))
        y = o.y
        width = right - x
        height = bottom - y
      } else {
        // br
        const right = Math.min(sizes.psd.width, Math.max(o.x + 5, o.x + o.width + dx))
        const bottom = Math.min(sizes.psd.height, Math.max(o.y + 5, o.y + o.height + dy))
        x = o.x
        y = o.y
        width = right - x
        height = bottom - y
      }

      return { x, y, width, height }
    }

    return null
  }

  function handleMouseDown(e) {
    if (!sizes) return
    const pos = getSvgPos(e)
    setInteraction({ type: 'drawing', startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  function handleMoveStart(e, zone) {
    e.stopPropagation()
    if (!sizes) return
    const pos = getSvgPos(e)
    onSelectZone(zone.id)
    setInteraction({ type: 'moving', zoneId: zone.id, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocX: zone.x, origDocY: zone.y })
  }

  function handleResizeStart(e, zone, corner) {
    e.stopPropagation()
    if (!sizes) return
    const pos = getSvgPos(e)
    setInteraction({ type: 'resizing', zoneId: zone.id, corner, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocZone: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
  }

  function handleMouseMove(e) {
    if (!interaction) return
    const pos = getSvgPos(e)
    setInteraction(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }

  function handleMouseUp() {
    if (!interaction || !sizes) return

    if (interaction.type === 'drawing') {
      const x = Math.min(interaction.startX, interaction.currentX)
      const y = Math.min(interaction.startY, interaction.currentY)
      const w = Math.abs(interaction.currentX - interaction.startX)
      const h = Math.abs(interaction.currentY - interaction.startY)
      setInteraction(null)
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
    } else {
      const zone = zones.find(z => z.id === interaction.zoneId)
      const moved = interaction.currentX !== interaction.startX || interaction.currentY !== interaction.startY
      const live = computeLiveZone(zone, interaction)
      setInteraction(null)
      if (!zone || !moved || !live) return
      onZonesChange(zones.map(z => z.id === zone.id ? { ...z, ...live } : z))
    }
  }

  function toCanvasCoords(zone) {
    if (!sizes) return null
    const c = docToCanvas(zone, sizes.canvas, sizes.psd)
    return { canvasX: c.x, canvasY: c.y, canvasWidth: c.width, canvasHeight: c.height }
  }

  const drawingRect = interaction?.type === 'drawing' ? {
    x: Math.min(interaction.startX, interaction.currentX),
    y: Math.min(interaction.startY, interaction.currentY),
    w: Math.abs(interaction.currentX - interaction.startX),
    h: Math.abs(interaction.currentY - interaction.startY),
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
          ref={svgRef}
          style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
          width={sizes.canvas.width}
          height={sizes.canvas.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {zones.map(zone => {
            const liveZone = (interaction && interaction.zoneId === zone.id)
              ? { ...zone, ...computeLiveZone(zone, interaction) }
              : zone
            const coords = toCanvasCoords(liveZone)
            if (!coords) return null
            const preview = getPreviewLines(zone, coords)
            return (
              <g key={zone.id}>
                <ZoneRect
                  zone={{ ...liveZone, ...coords }}
                  isSelected={zone.id === selectedZoneId}
                  onMoveStart={e => handleMoveStart(e, zone)}
                  onResizeStart={(e, corner) => handleResizeStart(e, zone, corner)}
                />
                {preview && (
                  <text
                    fontFamily={preview.fontFamily}
                    fontSize={preview.fontSize}
                    fill="#222"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {preview.lines.map((line, lineIndex) => (
                      <tspan key={lineIndex} x={coords.canvasX + 2} y={preview.startY + lineIndex * preview.lineHeight}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
              </g>
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
