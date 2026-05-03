import { useState, useEffect } from 'react'
import {
  Box, AppBar, Toolbar, Typography, Button,
  IconButton, Divider, Snackbar, Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PSDViewer from '../components/PSDViewer'
import ZoneList from '../components/ZoneList'
import { readExcel } from '../utils/excel'
import { generatePdf } from '../utils/generator'

export default function Editor({ project, onProjectUpdate, onBack }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [snackbar, setSnackbar] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)

  // Проверяем наличие файлов при открытии проекта
  useEffect(() => {
    async function checkFiles() {
      const checks = []
      if (project.templatePsdPath) {
        const exists = await window.api.fileExists(project.templatePsdPath)
        if (!exists) checks.push('PSD-шаблон')
      }
      if (project.excelPath) {
        const exists = await window.api.fileExists(project.excelPath)
        if (!exists) checks.push('Excel-файл')
      }
      if (checks.length > 0) {
        setSnackbar(`Файлы не найдены: ${checks.join(', ')}. Загрузите их заново.`)
      }
    }
    checkFiles()
  }, [])

  async function save(updated) {
    await window.api.saveProject(updated.name, updated)
    onProjectUpdate(updated)
  }

  async function handleLoadPsd() {
    const filePath = await window.api.openFileDialog([{ name: 'PSD', extensions: ['psd'] }])
    if (!filePath) return
    await save({ ...project, templatePsdPath: filePath })
  }

  async function handleLoadExcel() {
    const filePath = await window.api.openFileDialog([
      { name: 'Excel', extensions: ['xlsx', 'xls'] },
    ])
    if (!filePath) return
    const bytes = await window.api.readFileBytes(filePath)
    const { columns } = readExcel(Buffer.from(bytes))
    await save({ ...project, excelPath: filePath, columns })
    setSnackbar(`Загружено ${columns.length} столбцов`)
  }

  async function handleZonesChange(zones) {
    await save({ ...project, zones })
  }

  async function handleGenerate() {
    if (generating) return
    setGenerating(true)
    setGenProgress(0)
    try {
      const templateBytes = await window.api.readFileBytes(project.templatePsdPath)
      const excelBytes = await window.api.readFileBytes(project.excelPath)
      const fontBytes = await window.api.loadFonts()
      const { rows } = readExcel(Buffer.from(excelBytes))

      const pdfBytes = await generatePdf({
        templateBytes,
        fontBytes,
        zones: project.zones,
        rows,
        onProgress: (done, total) => setGenProgress(Math.round((done / total) * 100)),
      })

      const savePath = await window.api.saveFileDialog([{ name: 'PDF', extensions: ['pdf'] }])
      if (savePath) {
        await window.api.writeFileBytes(savePath, Array.from(pdfBytes))
        setSnackbar(`Сохранено: ${savePath.split(/[\\/]/).pop()}`)
      }
    } catch (err) {
      setSnackbar(`Ошибка: ${err.message}`)
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
            disabled={!project.templatePsdPath || !project.excelPath || project.zones.length === 0 || generating}
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
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e0e0e0', display: 'flex', justifyContent: 'center', p: 2 }}>
          <PSDViewer
            psdPath={project.templatePsdPath}
            zones={project.zones}
            onZonesChange={handleZonesChange}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onPsdParsed={() => {}}
          />
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

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)}>{snackbar}</Alert>
      </Snackbar>
    </Box>
  )
}
