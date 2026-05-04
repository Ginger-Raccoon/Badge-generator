import { useState, useEffect } from 'react'
import {
  Box, AppBar, Toolbar, Typography, Button,
  IconButton, Divider, Snackbar, Alert, TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PSDViewer from '../components/PSDViewer'
import ZoneList from '../components/ZoneList'
import { readExcel } from '../utils/excel'
import { generatePdf } from '../utils/generator'
import { parsePsd } from '../utils/psd'

export default function Editor({ project, onProjectUpdate, onBack }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [snackbar, setSnackbar] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [dpiWarning, setDpiWarning] = useState(null)
  const [dpiInput, setDpiInput] = useState('')
  const [parsedPsd, setParsedPsd] = useState(null)
  const [rows, setRows] = useState([])
  const [previewRowIndex, setPreviewRowIndex] = useState(0)

  useEffect(() => {
    async function checkFiles() {
      const missing = []
      if (project.templatePsdPath) {
        const exists = await window.api.fileExists(project.templatePsdPath)
        if (!exists) missing.push('PSD-шаблон')
      }
      if (project.excelPath) {
        const exists = await window.api.fileExists(project.excelPath)
        if (!exists) missing.push('Excel-файл')
      }
      if (missing.length > 0) {
        setSnackbar({ message: `Файлы не найдены: ${missing.join(', ')}. Загрузите их заново.`, severity: 'warning' })
      }
    }
    checkFiles()
  }, [])

  async function save(updated) {
    await window.api.saveProject(updated.name, updated)
    onProjectUpdate(updated)
  }

  async function handleLoadPsd() {
    const filePath = await window.api.openFileDialog([{ name: 'Photoshop', extensions: ['psd'] }])
    if (!filePath) return
    setParsedPsd(null)
    setDpiWarning(null)
    await save({ ...project, templatePsdPath: filePath, templateDpi: null, zones: [] })
  }

  function handlePsdParsed(parsed) {
    setParsedPsd(parsed)
    if (project.templateDpi != null) return
    const effectiveDpi = parsed.resolution
    if (parsed.resolutionMissing || parsed.resolution <= 96) {
      setDpiWarning({ detected: parsed.resolution, missing: parsed.resolutionMissing })
      setDpiInput(String(effectiveDpi))
    } else {
      setDpiWarning(null)
    }
  }

  async function handleDpiApply() {
    const dpi = parseInt(dpiInput, 10)
    if (!dpi || dpi <= 0) return
    await save({ ...project, templateDpi: dpi })
    setDpiWarning(null)
  }

  async function handleLoadExcel() {
    const filePath = await window.api.openFileDialog([
      { name: 'Excel', extensions: ['xlsx', 'xls'] },
    ])
    if (!filePath) return
    try {
      const bytes = await window.api.readFileBytes(filePath)
      const { columns, rows: loadedRows } = readExcel(new Uint8Array(bytes))
      await save({ ...project, excelPath: filePath, columns })
      setRows(loadedRows)
      setPreviewRowIndex(0)
      setSnackbar({ message: `Загружено ${columns.length} столбцов`, severity: 'success' })
    } catch (err) {
      setSnackbar({ message: `Ошибка загрузки Excel: ${err.message}`, severity: 'error' })
    }
  }

  async function handleZonesChange(zones) {
    await save({ ...project, zones })
  }

  async function handleGenerate() {
    if (generating) return
    setGenerating(true)
    setGenProgress(0)
    try {
      let psd = parsedPsd
      if (!psd) {
        const bytes = await window.api.readFileBytes(project.templatePsdPath)
        psd = await parsePsd(new Uint8Array(bytes))
      }
      const effectiveDpi = project.templateDpi ?? psd.resolution
      const excelBytes = await window.api.readFileBytes(project.excelPath)
      const fontBytes = await window.api.loadFonts()
      const { rows: excelRows } = readExcel(new Uint8Array(excelBytes))

      const pdfBytes = await generatePdf({
        pngBytes: psd.pngBytes,
        psdWidth: psd.width,
        psdHeight: psd.height,
        dpi: effectiveDpi,
        fontBytes,
        zones: project.zones,
        rows: excelRows,
        onProgress: (done, total) => setGenProgress(Math.round((done / total) * 100)),
      })

      const savePath = await window.api.saveFileDialog([{ name: 'PDF', extensions: ['pdf'] }])
      if (savePath) {
        await window.api.writeFileBytes(savePath, Array.from(pdfBytes))
        setSnackbar({ message: `Сохранено: ${savePath.split(/[\\/]/).pop()}`, severity: 'success' })
      }
    } catch (err) {
      setSnackbar({ message: `Ошибка: ${err.message}`, severity: 'error' })
    } finally {
      setGenerating(false)
      setGenProgress(0)
    }
  }

  const psdName = project.templatePsdPath
    ? project.templatePsdPath.split(/[\\/]/).pop()
    : 'PSD не загружен'

  const excelName = project.excelPath
    ? project.excelPath.split(/[\\/]/).pop()
    : 'Excel не загружен'

  const canGenerate = project.templatePsdPath && project.excelPath && project.zones.length > 0 && !generating

  const previewRow = rows[previewRowIndex] ?? null
  const dpi = project.templateDpi ?? parsedPsd?.resolution ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1} color="default">
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            {project.name}
          </Typography>
          <Button size="small" onClick={handleLoadPsd} sx={{ mr: 1 }}>
            {psdName}
          </Button>
          <Button size="small" onClick={handleLoadExcel} sx={{ mr: 1 }}>
            {excelName}
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            Генерировать
          </Button>
        </Toolbar>
        {generating && (
          <Box sx={{ px: 2, py: 0.5, bgcolor: 'primary.main' }}>
            <Typography variant="caption" color="white">
              Генерация... {genProgress}%
            </Typography>
          </Box>
        )}
        {dpiWarning && (
          <Alert
            severity="warning"
            onClose={() => setDpiWarning(null)}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  label="DPI"
                  value={dpiInput}
                  onChange={e => setDpiInput(e.target.value)}
                  sx={{ width: 80 }}
                  inputProps={{ inputMode: 'numeric' }}
                />
                <Button size="small" variant="outlined" onClick={handleDpiApply}>
                  Применить
                </Button>
              </Box>
            }
          >
            {dpiWarning.missing
              ? 'DPI не задан в файле — размер страницы PDF может быть неверным.'
              : `Обнаружен экранный DPI (${dpiWarning.detected} dpi) — файл, вероятно, создан для экрана, а не для печати.`
            }
            {' '}Исправьте в Photoshop: Image → Image Size → Resolution (без галки Resample), затем перезагрузите файл.
          </Alert>
        )}
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#e0e0e0' }}>
          {rows.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
              <IconButton size="small" disabled={previewRowIndex === 0} onClick={() => setPreviewRowIndex(i => i - 1)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <TextField
                size="small"
                value={previewRowIndex + 1}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) setPreviewRowIndex(Math.max(0, Math.min(rows.length - 1, v - 1)))
                }}
                inputProps={{ min: 1, max: rows.length, style: { textAlign: 'center', width: 40 } }}
                sx={{ width: 60 }}
              />
              <Typography variant="body2" color="text.secondary">/ {rows.length}</Typography>
              <IconButton size="small" disabled={previewRowIndex === rows.length - 1} onClick={() => setPreviewRowIndex(i => i + 1)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', p: 2 }}>
            <PSDViewer
              psdPath={project.templatePsdPath}
              zones={project.zones}
              onZonesChange={handleZonesChange}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              onPsdParsed={handlePsdParsed}
              previewRow={previewRow}
              dpi={dpi}
            />
          </Box>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ width: 300, overflow: 'auto' }}>
          <ZoneList
            zones={project.zones}
            columns={project.columns}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onZonesChange={handleZonesChange}
          />
        </Box>
      </Box>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity ?? 'success'} onClose={() => setSnackbar(null)}>{snackbar?.message}</Alert>
      </Snackbar>
    </Box>
  )
}
