import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { parseTemplate } from '../utils/psd'
import ZoneRect, { type Corner } from './ZoneRect'
import { canvasToDoc, docToCanvas } from '../utils/coordinates'
import { wrapText, splitValue } from '../utils/textLayout'
import type { ColumnSplits, ExcelRow, ParsedPsd, Zone } from '../../shared/types'

interface Sizes {
  canvas: { width: number; height: number }
  psd: { width: number; height: number }
}

type Interaction =
  | { type: 'drawing'; startX: number; startY: number; currentX: number; currentY: number }
  | { type: 'moving'; zoneId: string; startX: number; startY: number; currentX: number; currentY: number; origDocX: number; origDocY: number }
  | { type: 'resizing'; zoneId: string; corner: Corner; startX: number; startY: number; currentX: number; currentY: number; origDocZone: { x: number; y: number; width: number; height: number } }

interface CanvasCoords {
  canvasX: number
  canvasY: number
  canvasWidth: number
  canvasHeight: number
}

interface PreviewLines {
  fontFamily: string
  fontSize: number
  lines: string[]
  lineHeight: number
  startY: number
}

interface LiveZonePatch {
  x: number
  y: number
  width?: number
  height?: number
}

interface PSDViewerProps {
  psdPath: string | null
  zones: Zone[]
  onZonesChange: (zones: Zone[]) => void
  selectedZoneId: string | null
  onSelectZone: (id: string) => void
  onPsdParsed?: (parsed: ParsedPsd) => void
  previewRow: ExcelRow | null
  dpi: number | null
  columnSplits?: ColumnSplits
  defaultFont?: string
  defaultFontSize?: number
}

export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi, columnSplits = {}, defaultFont = 'Roboto', defaultFontSize = 12 }: PSDViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [sizes, setSizes] = useState<Sizes | null>(null)
  const [interaction, setInteraction] = useState<Interaction | null>(null)
  const fontsRef = useRef<Record<string, string>>({})
  const measureCanvasRef = useRef(document.createElement('canvas'))
  const [fontsReady, setFontsReady] = useState(false)
  const minDocWidthsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!psdPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(psdPath!)
      if (cancelled) return
      const parsed = await parseTemplate(new Uint8Array(bytes), psdPath!)
      if (cancelled) return
      onPsdParsed?.(parsed)

      const blob = new Blob([parsed.imageBytes], { type: parsed.imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png' })
      const bitmap = await createImageBitmap(blob)
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      const displayScale = Math.min(1, 900 / parsed.width)
      canvas.width = Math.round(parsed.width * displayScale)
      canvas.height = Math.round(parsed.height * displayScale)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

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
      const entries: [string, number[], string][] = [
        ['Roboto', fontBytes.roboto, 'Roboto-preview'],
        ['PTSerif', fontBytes.ptSerif, 'PTSerif-preview'],
      ]
      for (const [name, bytes, family] of entries) {
        const face = new FontFace(family, new Uint8Array(bytes))
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

  useEffect(() => {
    if (!fontsReady || !previewRow || !sizes) return
    let changed = false
    const updated = zones.map(zone => {
      const minCanvasW = getZoneMinCanvasWidth(zone)
      if (minCanvasW === 0) return zone
      const minDocW = minCanvasW * (sizes.psd.width / sizes.canvas.width)
      if (zone.width >= minDocW - 0.5) return zone
      changed = true
      return { ...zone, width: minDocW }
    })
    if (changed) onZonesChange(updated)
  }, [zones, previewRow, fontsReady, sizes, dpi, columnSplits]) // eslint-disable-line react-hooks/exhaustive-deps

  function getSvgPos(e: React.MouseEvent) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function measureText(text: string, fontSize: number, fontFamily: string) {
    const ctx = measureCanvasRef.current.getContext('2d')!
    ctx.font = `${fontSize}px '${fontFamily}'`
    return ctx.measureText(text).width
  }

  function getZoneMinCanvasWidth(zone: Zone): number {
    if (!fontsReady || !previewRow || !zone.column || !dpi || !sizes) return 0
    const rawValue = previewRow[zone.column]
    if (rawValue == null || rawValue === '') return 0
    const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
    if (!value) return 0
    const fontFamily = fontsRef.current[zone.font] ?? fontsRef.current['Roboto']
    if (!fontFamily) return 0
    const displayScale = sizes.canvas.width / sizes.psd.width
    const svgFontSize = zone.fontSize * (dpi / 72) * displayScale
    const words = String(value).split(' ')
    return Math.max(...words.map(w => measureText(w, svgFontSize, fontFamily))) + 4
  }

  function getPreviewLines(zone: Zone, coords: CanvasCoords): PreviewLines | null {
    if (!fontsReady || !previewRow || !zone.column || !dpi || !sizes) return null
    const rawValue = previewRow[zone.column]
    if (rawValue == null || rawValue === '') return null
    const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
    if (value === '') return null
    const fontFamily = fontsRef.current[zone.font] ?? fontsRef.current['Roboto']
    if (!fontFamily) return null
    const displayScale = sizes.canvas.width / sizes.psd.width
    const svgFontSize = zone.fontSize * (dpi / 72) * displayScale
    const lines = wrapText(String(value), coords.canvasWidth - 4, svgFontSize, (str, size) => measureText(str, size, fontFamily))
    const lineHeight = svgFontSize * 1.2
    const totalHeight = (lines.length - 1) * lineHeight + svgFontSize
    const startY = coords.canvasY + (coords.canvasHeight - totalHeight) / 2 + svgFontSize
    return { fontFamily, fontSize: svgFontSize, lines, lineHeight, startY }
  }

  function computeLiveZone(zone: Zone | undefined, inter: Interaction | null, minDocWidth = 0): LiveZonePatch | null {
    if (!inter || !sizes || !zone) return null
    const scaleX = sizes.psd.width / sizes.canvas.width
    const scaleY = sizes.psd.height / sizes.canvas.height
    const dx = (inter.currentX - inter.startX) * scaleX
    const dy = (inter.currentY - inter.startY) * scaleY
    const minW = Math.max(5, minDocWidth)

    if (inter.type === 'moving' && inter.zoneId === zone.id) {
      return {
        x: Math.max(0, Math.min(sizes.psd.width - zone.width, inter.origDocX + dx)),
        y: Math.max(0, Math.min(sizes.psd.height - zone.height, inter.origDocY + dy)),
      }
    }

    if (inter.type === 'resizing' && inter.zoneId === zone.id) {
      const o = inter.origDocZone
      let x: number, y: number, width: number, height: number

      if (inter.corner === 'tl') {
        const right = o.x + o.width
        const bottom = o.y + o.height
        x = Math.max(0, Math.min(right - minW, o.x + dx))
        y = Math.max(0, Math.min(bottom - 5, o.y + dy))
        width = right - x
        height = bottom - y
      } else if (inter.corner === 'tr') {
        const bottom = o.y + o.height
        const right = Math.min(sizes.psd.width, Math.max(o.x + minW, o.x + o.width + dx))
        x = o.x
        y = Math.max(0, Math.min(bottom - 5, o.y + dy))
        width = right - x
        height = bottom - y
      } else if (inter.corner === 'bl') {
        const right = o.x + o.width
        const bottom = Math.min(sizes.psd.height, Math.max(o.y + 5, o.y + o.height + dy))
        x = Math.max(0, Math.min(right - minW, o.x + dx))
        y = o.y
        width = right - x
        height = bottom - y
      } else {
        // br
        const right = Math.min(sizes.psd.width, Math.max(o.x + minW, o.x + o.width + dx))
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

  function handleMouseDown(e: React.MouseEvent) {
    if (!sizes) return
    const pos = getSvgPos(e)
    setInteraction({ type: 'drawing', startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  function handleMoveStart(e: React.MouseEvent, zone: Zone) {
    e.stopPropagation()
    if (!sizes) return
    const pos = getSvgPos(e)
    onSelectZone(zone.id)
    setInteraction({ type: 'moving', zoneId: zone.id, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocX: zone.x, origDocY: zone.y })
  }

  function handleResizeStart(e: React.MouseEvent, zone: Zone, corner: Corner) {
    e.stopPropagation()
    if (!sizes) return
    const pos = getSvgPos(e)
    setInteraction({ type: 'resizing', zoneId: zone.id, corner, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocZone: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!interaction) return
    const pos = getSvgPos(e)
    setInteraction(d => d ? { ...d, currentX: pos.x, currentY: pos.y } : d)
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
        font: defaultFont,
        fontSize: defaultFontSize,
        splitIndex: null,
        splitChar: '',
      }])
    } else {
      const zone = zones.find(z => z.id === interaction.zoneId)
      const moved = interaction.currentX !== interaction.startX || interaction.currentY !== interaction.startY
      const minDocW = minDocWidthsRef.current[zone?.id ?? ''] ?? 0
      const live = computeLiveZone(zone, interaction, minDocW)
      setInteraction(null)
      if (!zone || !moved || !live) return
      onZonesChange(zones.map(z => z.id === zone.id ? { ...z, ...live } : z))
    }
  }

  function toCanvasCoords(zone: Zone): CanvasCoords | null {
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
        <Typography>Загрузите шаблон</Typography>
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
            const minCanvasW = getZoneMinCanvasWidth(zone)
            const minDocW = sizes ? minCanvasW * (sizes.psd.width / sizes.canvas.width) : 0
            minDocWidthsRef.current[zone.id] = minDocW

            const liveZone = (interaction && interaction.type !== 'drawing' && interaction.zoneId === zone.id)
              ? { ...zone, ...computeLiveZone(zone, interaction, minDocW) }
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
