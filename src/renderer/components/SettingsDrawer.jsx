import { useState, useEffect } from 'react'
import {
  Drawer, Box, Typography, IconButton, Select, MenuItem,
  FormControl, InputLabel, TextField, Divider, FormControlLabel,
  Checkbox, Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function SettingsDrawer({ open, onClose, prefs, onPrefsChange, projects, onDeleteAll }) {
  const [fontSizeInput, setFontSizeInput] = useState(String(prefs.defaultFontSize))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')

  useEffect(() => {
    if (open) setFontSizeInput(String(prefs.defaultFontSize))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 320, p: 2 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Настройки</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Шрифт по умолчанию</InputLabel>
          <Select
            value={prefs.defaultFont}
            label="Шрифт по умолчанию"
            onChange={e => onPrefsChange({ defaultFont: e.target.value })}
          >
            <MenuItem value="Roboto">Roboto</MenuItem>
            <MenuItem value="PTSerif">PT Serif</MenuItem>
          </Select>
        </FormControl>

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
    </>
  )
}
