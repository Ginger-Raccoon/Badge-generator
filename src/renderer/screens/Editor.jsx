import { useState, useEffect } from 'react'
import {
  Box, AppBar, Toolbar, Typography, Button,
  IconButton, Divider, Snackbar, Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PDFViewer from '../components/PDFViewer'
import ZoneList from '../components/ZoneList'
import { readExcel } from '../utils/excel'

export default function Editor({ project, onProjectUpdate, onBack }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [snackbar, setSnackbar] = useState(null)

  // Проверяем наличие файлов при открытии проекта
  useEffect(() => {
    async function checkFiles() {
      const checks = []
      if (project.templatePdfPath) {
        const exists = await window.api.fileExists(project.templatePdfPath)
        if (!exists) checks.push('PDF-шаблон')
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

  async function handleLoadPdf() {
    const filePath = await window.api.openFileDialog([{ name: 'PDF', extensions: ['pdf'] }])
    if (!filePath) return
    await save({ ...project, templatePdfPath: filePath })
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

  const pdfName = project.templatePdfPath
    ? project.templatePdfPath.split(/[\\/]/).pop()
    : 'PDF не загружен'

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
          <Button size="small" onClick={handleLoadPdf} sx={{ mr: 1 }}>
            {pdfName}
          </Button>
          <Button size="small" onClick={handleLoadExcel} sx={{ mr: 1 }}>
            {excelName}
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!project.templatePdfPath || !project.excelPath || project.zones.length === 0}
            onClick={() => {}}
          >
            Генерировать
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e0e0e0', display: 'flex', justifyContent: 'center', p: 2 }}>
          <PDFViewer
            pdfPath={project.templatePdfPath}
            zones={project.zones}
            onZonesChange={handleZonesChange}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
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
