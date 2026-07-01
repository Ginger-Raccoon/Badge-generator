import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  Select, MenuItem, FormControl, InputLabel, TextField, Checkbox, FormControlLabel, Alert,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import { PAGE_FORMATS_MM, computeAutoGrid, createDefaultPageLayout, getPageSizeMm, pxToMm } from '../utils/layout'
import type { PageFormat, PageLayout, TemplateImageFormat } from '../../shared/types'

interface PageLayoutDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (layout: PageLayout) => void
  initialLayout: PageLayout | null
  badgeWidthPx: number
  badgeHeightPx: number
  dpi: number
  imageBytes: Uint8Array<ArrayBuffer> | null
  imageFormat: TemplateImageFormat
  totalBadges: number
}

function toNumber(value: string, fallback: number): number {
  const v = parseFloat(value)
  return isNaN(v) || v <= 0 ? fallback : v
}

const PREVIEW_HEIGHT = 360

export default function PageLayoutDialog({ open, onClose, onConfirm, initialLayout, badgeWidthPx, badgeHeightPx, dpi, imageBytes, imageFormat, totalBadges }: PageLayoutDialogProps) {
  const [format, setFormat] = useState<PageFormat>('A4')
  const [customWidth, setCustomWidth] = useState('210')
  const [customHeight, setCustomHeight] = useState('297')
  const [columns, setColumns] = useState('1')
  const [rowsCount, setRowsCount] = useState('1')
  const [marginMm, setMarginMm] = useState('10')
  const [gapMm, setGapMm] = useState('5')
  const [cropMarks, setCropMarks] = useState(false)
  const [scaleMode, setScaleMode] = useState<'percent' | 'size'>('percent')
  const [scalePercent, setScalePercent] = useState('100')
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const layout = initialLayout ?? createDefaultPageLayout(badgeWidthPx, badgeHeightPx, dpi)
    setFormat(layout.pageFormat)
    setCustomWidth(String(layout.customWidthMm ?? 210))
    setCustomHeight(String(layout.customHeightMm ?? 297))
    setColumns(String(layout.columns))
    setRowsCount(String(layout.rows))
    setMarginMm(String(layout.marginMm))
    setGapMm(String(layout.gapMm))
    setCropMarks(layout.cropMarks)
    setScalePercent(String(layout.badgeScalePercent ?? 100))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!imageBytes) { setThumbUrl(null); return }
    const blob = new Blob([imageBytes], { type: imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png' })
    const url = URL.createObjectURL(blob)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageBytes, imageFormat])

  const scalePercentValue = Math.min(500, Math.max(1, toNumber(scalePercent, 100)))

  const layout: PageLayout = {
    pageFormat: format,
    customWidthMm: format === 'custom' ? toNumber(customWidth, 210) : null,
    customHeightMm: format === 'custom' ? toNumber(customHeight, 297) : null,
    columns: Math.max(1, Math.round(toNumber(columns, 1))),
    rows: Math.max(1, Math.round(toNumber(rowsCount, 1))),
    marginMm: Math.max(0, toNumber(marginMm, 0)),
    gapMm: Math.max(0, toNumber(gapMm, 0)),
    cropMarks,
    badgeScalePercent: scalePercentValue,
  }

  const [pageWidthMm, pageHeightMm] = getPageSizeMm(layout)
  const nativeBadgeWidthMm = pxToMm(badgeWidthPx, dpi)
  const nativeBadgeHeightMm = pxToMm(badgeHeightPx, dpi)
  const badgeWidthMm = nativeBadgeWidthMm * (scalePercentValue / 100)
  const badgeHeightMm = nativeBadgeHeightMm * (scalePercentValue / 100)

  function handleWidthMmChange(value: string) {
    const mm = toNumber(value, badgeWidthMm)
    setScalePercent(String((mm / nativeBadgeWidthMm) * 100))
  }

  function handleHeightMmChange(value: string) {
    const mm = toNumber(value, badgeHeightMm)
    setScalePercent(String((mm / nativeBadgeHeightMm) * 100))
  }

  const usedWidthMm = layout.columns * badgeWidthMm + (layout.columns - 1) * layout.gapMm + 2 * layout.marginMm
  const usedHeightMm = layout.rows * badgeHeightMm + (layout.rows - 1) * layout.gapMm + 2 * layout.marginMm
  const overflow = usedWidthMm > pageWidthMm + 0.01 || usedHeightMm > pageHeightMm + 0.01

  const perPage = layout.columns * layout.rows
  const totalPages = totalBadges > 0 ? Math.ceil(totalBadges / perPage) : 0

  function handleAuto() {
    const { columns: c, rows: r } = computeAutoGrid(badgeWidthMm, badgeHeightMm, pageWidthMm, pageHeightMm, layout.marginMm, layout.gapMm)
    setColumns(String(c))
    setRowsCount(String(r))
  }

  const previewWidth = Math.round(PREVIEW_HEIGHT * (pageWidthMm / pageHeightMm))
  const badgeWidthPercent = (badgeWidthMm / pageWidthMm) * 100
  const badgeHeightPercent = (badgeHeightMm / pageHeightMm) * 100
  const cells = Array.from({ length: perPage }, (_, idx) => {
    const col = idx % layout.columns
    const row = Math.floor(idx / layout.columns)
    const leftMm = layout.marginMm + col * (badgeWidthMm + layout.gapMm)
    const topMm = layout.marginMm + row * (badgeHeightMm + layout.gapMm)
    return {
      left: (leftMm / pageWidthMm) * 100,
      top: (topMm / pageHeightMm) * 100,
    }
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Макет страницы PDF</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 3, pt: 1 }}>
          <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Формат страницы</InputLabel>
              <Select value={format} label="Формат страницы" onChange={e => setFormat(e.target.value as PageFormat)}>
                <MenuItem value="A4">A4 ({PAGE_FORMATS_MM.A4[0]}×{PAGE_FORMATS_MM.A4[1]} мм)</MenuItem>
                <MenuItem value="Letter">Letter ({PAGE_FORMATS_MM.Letter[0]}×{PAGE_FORMATS_MM.Letter[1]} мм)</MenuItem>
                <MenuItem value="custom">Свой размер</MenuItem>
              </Select>
            </FormControl>

            {format === 'custom' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="Ширина, мм" type="number" value={customWidth} onChange={e => setCustomWidth(e.target.value)} fullWidth />
                <TextField size="small" label="Высота, мм" type="number" value={customHeight} onChange={e => setCustomHeight(e.target.value)} fullWidth />
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">Масштаб бейджа</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                fullWidth
                value={scaleMode}
                onChange={(_, value) => value && setScaleMode(value)}
                sx={{ mb: 1 }}
              >
                <ToggleButton value="percent">В процентах</ToggleButton>
                <ToggleButton value="size">В мм</ToggleButton>
              </ToggleButtonGroup>

              {scaleMode === 'percent' ? (
                <TextField
                  size="small"
                  label="Масштаб, %"
                  type="number"
                  value={scalePercent}
                  onChange={e => setScalePercent(e.target.value)}
                  slotProps={{ htmlInput: { min: 1, max: 500 } }}
                  fullWidth
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    label="Ширина, мм"
                    type="number"
                    value={badgeWidthMm.toFixed(1)}
                    onChange={e => handleWidthMmChange(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="Высота, мм"
                    type="number"
                    value={badgeHeightMm.toFixed(1)}
                    onChange={e => handleHeightMmChange(e.target.value)}
                    fullWidth
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                Размер бейджа: {badgeWidthMm.toFixed(1)}×{badgeHeightMm.toFixed(1)} мм ({scalePercentValue.toFixed(0)}%)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" label="Колонок" type="number" value={columns} onChange={e => setColumns(e.target.value)} slotProps={{ htmlInput: { min: 1 } }} fullWidth />
              <TextField size="small" label="Строк" type="number" value={rowsCount} onChange={e => setRowsCount(e.target.value)} slotProps={{ htmlInput: { min: 1 } }} fullWidth />
            </Box>

            <TextField size="small" label="Поля страницы, мм" type="number" value={marginMm} onChange={e => setMarginMm(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} fullWidth />
            <TextField size="small" label="Зазор между бейджами, мм" type="number" value={gapMm} onChange={e => setGapMm(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} fullWidth />

            <Button size="small" variant="outlined" onClick={handleAuto}>Подобрать автоматически</Button>

            <FormControlLabel
              control={<Checkbox checked={cropMarks} onChange={e => setCropMarks(e.target.checked)} />}
              label="Метки реза"
            />

            <Typography variant="body2" color="text.secondary">
              На странице: {perPage} бейдж(ей). Всего страниц: {totalPages || '—'}.
            </Typography>

            {overflow && (
              <Alert severity="warning">
                Бейджи не помещаются на странице с текущими настройками. Уменьшите число колонок/строк, поля или зазор — либо нажмите «Подобрать автоматически».
              </Alert>
            )}
          </Box>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e0e0e0', borderRadius: 1, p: 2 }}>
            <Box sx={{ position: 'relative', width: previewWidth, height: PREVIEW_HEIGHT, bgcolor: 'white', boxShadow: 2, border: '1px solid #999' }}>
              {cells.map((cell, idx) => (
                <Box
                  key={idx}
                  sx={{
                    position: 'absolute',
                    left: `${cell.left}%`,
                    top: `${cell.top}%`,
                    width: `${badgeWidthPercent}%`,
                    height: `${badgeHeightPercent}%`,
                    border: overflow ? '1px solid #d32f2f' : '1px solid #1976d2',
                    overflow: 'hidden',
                  }}
                >
                  {thumbUrl && (
                    <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => onConfirm(layout)}>Сгенерировать PDF</Button>
      </DialogActions>
    </Dialog>
  )
}
