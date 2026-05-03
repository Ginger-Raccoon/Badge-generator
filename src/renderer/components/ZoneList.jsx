import {
  Box, Typography, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

const FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'PTSerif', label: 'PT Serif' },
]

export default function ZoneList({ zones, columns, selectedZoneId, onSelectZone, onZonesChange }) {
  function updateZone(id, patch) {
    onZonesChange(zones.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  function deleteZone(id) {
    onZonesChange(zones.filter(z => z.id !== id))
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

  return (
    <Box>
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
            </ListItem>
          </Box>
        ))}
      </List>
    </Box>
  )
}
