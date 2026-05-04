import {
  Box, Typography, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider, TextField,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

const FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'PTSerif', label: 'PT Serif' },
]

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48]

export default function ZoneList({ zones, columns, selectedZoneId, onSelectZone, onZonesChange, columnSplits = {}, onColumnSplitsChange, previewRow }) {
  function updateZone(id, patch) {
    onZonesChange(zones.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  function deleteZone(id) {
    onZonesChange(zones.filter(z => z.id !== id))
  }

  function getSplitOptions(zone) {
    const effectiveChar = zone.splitChar || columnSplits[zone.column] || ''
    if (!effectiveChar || !previewRow || !zone.column) return []
    const value = previewRow[zone.column]
    if (value == null) return []
    return String(value).split(effectiveChar).map((part, i) => ({ index: i, label: part }))
  }

  if (zones.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Зоны
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Нарисуйте зону на PDF
        </Typography>
      </Box>
    )
  }

  const usedColumns = [...new Set(zones.map(z => z.column).filter(Boolean))]

  return (
    <Box>
      {usedColumns.length > 0 && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Разделители столбцов
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Символ для разбивки значения на части. Применяется ко всем зонам, привязанным к этому столбцу.
          </Typography>
          {usedColumns.map(col => (
            <Box key={col} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col}
              </Typography>
              <TextField
                size="small"
                value={columnSplits[col] ?? ''}
                onChange={e => onColumnSplitsChange?.({ ...columnSplits, [col]: e.target.value })}
                placeholder="например , или |"
                sx={{ width: 110 }}
              />
            </Box>
          ))}
        </Box>
      )}
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, pt: 2, pb: 1 }}>
        Зоны
      </Typography>
      <List dense disablePadding>
        {zones.map((zone, i) => (
          <Box key={zone.id}>
            {i > 0 && <Divider />}
            <ListItem
              selected={zone.id === selectedZoneId}
              onClick={() => onSelectZone(zone.id)}
              sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, py: 1.5, cursor: 'pointer' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ListItemText primary={zone.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                <IconButton size="small" onClick={e => { e.stopPropagation(); deleteZone(zone.id) }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>
                <InputLabel shrink>Столбец</InputLabel>
                <Select
                  value={zone.column}
                  label="Столбец"
                  onChange={e => updateZone(zone.id, { column: e.target.value })}
                  displayEmpty
                  notched
                >
                  <MenuItem value=""><em>Не выбрано</em></MenuItem>
                  {columns.map(col => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {zone.column && (() => {
                const options = getSplitOptions(zone)
                return (
                  <>
                    <FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>
                      <InputLabel shrink>Часть</InputLabel>
                      <Select
                        value={zone.splitIndex ?? ''}
                        label="Часть"
                        notched
                        displayEmpty
                        onChange={e => updateZone(zone.id, { splitIndex: e.target.value === '' ? null : Number(e.target.value) })}
                      >
                        <MenuItem value=""><em>— (не разбивать)</em></MenuItem>
                        {options.map(({ index, label }) => (
                          <MenuItem key={index} value={index}>{index}: "{label}"</MenuItem>
                        ))}
                        {zone.splitIndex != null && options.length === 0 && (
                          <MenuItem value={zone.splitIndex}>часть {zone.splitIndex}</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      fullWidth
                      label="Символ"
                      value={zone.splitChar ?? ''}
                      onChange={e => updateZone(zone.id, { splitChar: e.target.value })}
                      placeholder={
                        columnSplits[zone.column]
                          ? `пустым — используется символ столбца (${columnSplits[zone.column]})`
                          : 'пустым — разбивка не применяется'
                      }
                      onClick={e => e.stopPropagation()}
                    />
                  </>
                )
              })()}

              <FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>
                <InputLabel>Шрифт</InputLabel>
                <Select
                  value={zone.font}
                  label="Шрифт"
                  onChange={e => updateZone(zone.id, { font: e.target.value })}
                >
                  {FONTS.map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>
                <InputLabel shrink>Размер</InputLabel>
                <Select
                  value={zone.fontSize}
                  label="Размер"
                  notched
                  onChange={e => updateZone(zone.id, { fontSize: e.target.value })}
                >
                  {FONT_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </ListItem>
          </Box>
        ))}
      </List>
    </Box>
  )
}
