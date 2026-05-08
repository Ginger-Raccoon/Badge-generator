import { useState, useEffect } from 'react'
import {
  Drawer, Box, Typography, IconButton, Select, MenuItem,
  FormControl, InputLabel, TextField, Divider, FormControlLabel,
  Checkbox, Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, CircularProgress,
  List, ListItem, ListItemButton, ListItemText,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '../../shared/defaults.js'

export default function SettingsDrawer({ open, onClose, prefs, onPrefsChange, projects, onDeleteAll }) {
  const { defaultFontSize = DEFAULT_FONT_SIZE, defaultFont = DEFAULT_FONT } = prefs
  const [fontSizeInput, setFontSizeInput] = useState(String(defaultFontSize))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [fontDialogOpen, setFontDialogOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scannedFonts, setScannedFonts] = useState([])
  const [usedFonts, setUsedFonts] = useState(new Set())
  const [selectedFontNames, setSelectedFontNames] = useState(new Set())

  useEffect(() => {
    if (open) {
      setFontSizeInput(String(defaultFontSize ?? DEFAULT_FONT_SIZE))
    } else {
      setConfirmInput('')
    }
  }, [open, defaultFontSize])

  function handleFontSizeBlur() {
    const v = parseInt(fontSizeInput, 10)
    if (isNaN(v) || v < 6 || v > 200) {
      setFontSizeInput(String(prefs.defaultFontSize))
    } else {
      onPrefsChange({ defaultFontSize: v })
    }
  }

  function handleConfirmDelete() {
    onDeleteAll()
    setConfirmInput('')
    setConfirmOpen(false)
  }

  async function handleOpenFontDialog() {
    setScanning(true)
    const [found, used] = await Promise.all([
      window.api.scanSystemFonts(),
      window.api.getUsedFonts(),
    ])
    const usedSet = new Set(used)
    setScannedFonts(found)
    setUsedFonts(usedSet)
    setSelectedFontNames(new Set([
      ...(prefs.customFonts ?? []).map(f => f.name),
      ...used,
    ]))
    setScanning(false)
    setFontDialogOpen(true)
  }

  function handleApplyFonts() {
    const usedNotScanned = (prefs.customFonts ?? []).filter(f =>
      usedFonts.has(f.name) && !scannedFonts.some(sf => sf.name === f.name)
    )
    const newCustomFonts = [
      ...scannedFonts.filter(f => selectedFontNames.has(f.name)),
      ...usedNotScanned,
    ]
    onPrefsChange({ customFonts: newCustomFonts })
    setFontDialogOpen(false)
  }

  function toggleFont(name) {
    setSelectedFontNames(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 320 } }}
      >
        <Box sx={{ px: '32px', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Настройки</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Шрифт по умолчанию</InputLabel>
          <Select
            value={defaultFont}
            label="Шрифт по умолчанию"
            onChange={e => onPrefsChange({ defaultFont: e.target.value })}
          >
            <MenuItem value="Roboto">Roboto</MenuItem>
            <MenuItem value="PTSerif">PT Serif</MenuItem>
            {(prefs.customFonts ?? []).map(f => (
              <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          fullWidth
          disabled={scanning}
          onClick={handleOpenFontDialog}
          sx={{ mb: 2 }}
          startIcon={scanning ? <CircularProgress size={16} /> : null}
        >
          Управление шрифтами
        </Button>

        <TextField
          fullWidth
          size="small"
          label="Размер шрифта по умолчанию"
          type="number"
          value={fontSizeInput}
          onChange={e => setFontSizeInput(e.target.value)}
          onBlur={handleFontSizeBlur}
          inputProps={{ min: 6, max: 200 }}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ mb: 2 }} />

        <FormControlLabel
          control={
            <Checkbox
              checked={!prefs.skipDeleteConfirm}
              onChange={e => onPrefsChange({ skipDeleteConfirm: !e.target.checked })}
            />
          }
          label="Спрашивать при удалении"
          sx={{ mb: 2 }}
        />

        <Divider sx={{ mb: 2 }} />

        <Button
          variant="outlined"
          color="error"
          fullWidth
          disabled={projects.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Удалить все проекты
        </Button>
        </Box>
      </Drawer>

      <Dialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmInput('') }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить все проекты?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Это действие необратимо. Все проекты будут удалены без возможности восстановления.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Введите ПРОДОЛЖИТЬ"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmOpen(false); setConfirmInput('') }}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            disabled={confirmInput !== 'ПРОДОЛЖИТЬ'}
            onClick={handleConfirmDelete}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={fontDialogOpen}
        onClose={() => setFontDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Системные шрифты</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
            {scannedFonts.map(f => {
              const isUsed = usedFonts.has(f.name)
              return (
                <ListItem key={f.name} disablePadding>
                  <ListItemButton
                    disabled={isUsed}
                    onClick={() => !isUsed && toggleFont(f.name)}
                  >
                    <Checkbox
                      size="small"
                      checked={selectedFontNames.has(f.name)}
                      disabled={isUsed}
                      tabIndex={-1}
                    />
                    <ListItemText
                      primary={f.name}
                      secondary={isUsed ? 'используется' : null}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFontDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleApplyFonts}>Применить</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
