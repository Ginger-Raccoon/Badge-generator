import { useState, useEffect } from 'react'
import {
  Drawer, Box, Typography, IconButton, Select, MenuItem,
  FormControl, InputLabel, TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '../../shared/defaults.js'

export default function ProjectSettingsDrawer({ open, onClose, project, prefs, onProjectSettingsChange }) {
  const effectiveFont = project.projectFont ?? prefs.defaultFont ?? DEFAULT_FONT
  const effectiveFontSize = project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE
  const [fontSizeInput, setFontSizeInput] = useState(String(effectiveFontSize))

  useEffect(() => {
    if (open) {
      setFontSizeInput(String(project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE))
    }
  }, [open, project.projectFontSize, prefs.defaultFontSize])

  function handleFontSizeBlur() {
    const v = parseInt(fontSizeInput, 10)
    if (isNaN(v) || v < 6 || v > 200) {
      setFontSizeInput(String(project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE))
    } else {
      onProjectSettingsChange({ projectFontSize: v })
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 320 } }}>
      <Box sx={{ px: '32px', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Настройки проекта</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Шрифт по умолчанию</InputLabel>
          <Select
            value={effectiveFont}
            label="Шрифт по умолчанию"
            onChange={e => onProjectSettingsChange({ projectFont: e.target.value })}
          >
            <MenuItem value="Roboto">Roboto</MenuItem>
            <MenuItem value="PTSerif">PT Serif</MenuItem>
            {(prefs.customFonts ?? []).map(f => (
              <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
            ))}
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
      </Box>
    </Drawer>
  )
}
