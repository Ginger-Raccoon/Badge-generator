# Zone Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить сворачивание/разворачивание зон в `ZoneList` кликом по шапке — по умолчанию развёрнуто, состояние только в памяти сессии.

**Architecture:** Состояние `Set<id>` хранится в `ZoneList` через `useState`. Шапка зоны кликабельна (toggle + select), визуальный индикатор — иконка `ExpandMore/ExpandLess`. Контент зоны обёрнут в MUI `<Collapse in={!isCollapsed}>`.

**Tech Stack:** React 19, MUI 9 (`Collapse`, `@mui/icons-material`)

---

### Task 1: Добавить импорты

**Files:**
- Modify: `src/renderer/components/ZoneList.jsx:1-3`

- [ ] **Шаг 1: Добавить импорт `useState` из React**

В начало файла, перед импортом из `@mui/material`:

```js
import { useState } from 'react'
```

- [ ] **Шаг 2: Добавить `Collapse` в импорт из `@mui/material`**

Заменить строку:
```js
import {
  Box, Typography, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider, TextField, Checkbox, Tooltip, InputAdornment,
} from '@mui/material'
```
На:
```js
import {
  Box, Typography, List, ListItem, ListItemText, Collapse,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider, TextField, Checkbox, Tooltip, InputAdornment,
} from '@mui/material'
```

- [ ] **Шаг 3: Добавить импорты иконок**

После строки `import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'`:

```js
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
```

---

### Task 2: Добавить состояние и toggle-функцию

**Files:**
- Modify: `src/renderer/components/ZoneList.jsx:17-19`

- [ ] **Шаг 1: Добавить хук и функцию внутри компонента**

После открывающей строки `export default function ZoneList(...)  {`, перед `function updateZone`:

```js
const [collapsedZones, setCollapsedZones] = useState(new Set())

function toggleCollapse(id) {
  setCollapsedZones(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

---

### Task 3: Перестроить шапку зоны

**Files:**
- Modify: `src/renderer/components/ZoneList.jsx:89-102`

- [ ] **Шаг 1: Убрать `gap: 1` из `ListItem` и заменить шапку**

Найти `<ListItem` (внутри `zones.map`) и заменить его `sx` — убрать `gap: 1`:

```jsx
<ListItem
  selected={zone.id === selectedZoneId}
  onClick={() => onSelectZone(zone.id)}
  sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1.5, cursor: 'pointer' }}
>
```

- [ ] **Шаг 2: Заменить шапку (Box с именем и кнопкой удаления)**

Заменить:
```jsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <ListItemText primary={zone.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
  <IconButton size="small" onClick={e => { e.stopPropagation(); deleteZone(zone.id) }}>
    <DeleteIcon fontSize="small" />
  </IconButton>
</Box>
```

На:
```jsx
<Box
  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
  onClick={() => toggleCollapse(zone.id)}
>
  {collapsedZones.has(zone.id)
    ? <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
    : <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
  }
  <ListItemText primary={zone.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} sx={{ flex: 1, m: 0 }} />
  <IconButton size="small" onClick={e => { e.stopPropagation(); deleteZone(zone.id) }}>
    <DeleteIcon fontSize="small" />
  </IconButton>
</Box>
```

> Нет `e.stopPropagation()` на шапке — клик по ней пузырится к `ListItem` и вызывает `onSelectZone`. Это желаемое поведение: клик по шапке одновременно выделяет зону и переключает collapse. Кнопка удаления по-прежнему блокирует пузырёк.

---

### Task 4: Обернуть контент зоны в `<Collapse>`

**Files:**
- Modify: `src/renderer/components/ZoneList.jsx:104-203`

- [ ] **Шаг 1: Обернуть все FormControl-ы в Collapse > Box**

Всё содержимое `ListItem` после шапки (от `<FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>` для «Столбец» до закрывающего `</ListItem>`) заменить на:

```jsx
<Collapse in={!collapsedZones.has(zone.id)}>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
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
      const effectiveChar = zone.splitChar || columnSplits[zone.column] || ''
      const options = effectiveChar ? getSplitOptions(zone) : []
      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={e => e.stopPropagation()}>
            <TextField
              size="small"
              sx={{ flex: 1 }}
              label="Символ"
              value={zone.splitChar ?? ''}
              onChange={e => updateZone(zone.id, { splitChar: e.target.value })}
              disabled={(zone.splitChar ?? '') === ' '}
              placeholder="символ разделения"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Символ для разбивки значения на части. Если не указан — используется символ столбца." placement="top">
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'default' }} />
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                size="small"
                checked={(zone.splitChar ?? '') === ' '}
                onChange={e => updateZone(zone.id, { splitChar: e.target.checked ? ' ' : '' })}
              />
              <Typography variant="caption">пробел</Typography>
            </Box>
          </Box>
          {effectiveChar && (
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
          )}
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
  </Box>
</Collapse>
```

- [ ] **Шаг 2: Проверить тесты**

```bash
npm test
```

Ожидаем: все тесты зелёные (изменения не затрагивают утилиты).

- [ ] **Шаг 3: Запустить приложение и проверить вручную**

```bash
npm start
```

Проверить:
- Зоны открыты по умолчанию (`ExpandLessIcon` виден)
- Клик по шапке сворачивает с анимацией (`ExpandMoreIcon`)
- Повторный клик разворачивает
- Кнопка удаления работает независимо
- Клик по форм-контролам внутри зоны не сворачивает её
- Выделение зоны (`selectedZoneId`) работает отдельно от collapse

- [ ] **Шаг 4: Закоммитить**

```bash
git add src/renderer/components/ZoneList.jsx
git commit -m "feat: сворачивание зон по клику на шапку"
```
