# Project Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить настройки шрифта и кегля на уровне проекта — через флейаут-drawer, открываемый иконкой шестерёнки в полоске навигации страниц; при изменении настроек проекта все «дефолтные» зоны обновляются автоматически.

**Architecture:** Чистая функция `applyProjectSettings` инкапсулирует логику обновления зон (сравнение со старым дефолтом). `ProjectSettingsDrawer` — новый компонент по образцу `SettingsDrawer`. `Editor.jsx` соединяет всё воедино: вычисляет эффективные дефолты и передаёт их в `PSDViewer`.

**Tech Stack:** React 19, MUI 9, Vitest

---

## Структура файлов

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `src/renderer/utils/zones.js` | Создать | Чистая функция `applyProjectSettings` |
| `tests/utils/zones.test.js` | Создать | Тесты для `applyProjectSettings` |
| `src/main/ipc.js` | Изменить | Добавить `projectFont`/`projectFontSize` в шаблон проекта |
| `src/renderer/components/ProjectSettingsDrawer.jsx` | Создать | Drawer с настройками шрифта проекта |
| `src/renderer/screens/Editor.jsx` | Изменить | Шестерёнка, `handleProjectSettingsChange`, эффективные дефолты |

---

### Task 1: Утилита applyProjectSettings (TDD)

**Files:**
- Create: `src/renderer/utils/zones.js`
- Create: `tests/utils/zones.test.js`

- [ ] **Шаг 1: Написать тесты**

Создать `tests/utils/zones.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { applyProjectSettings } from '../../src/renderer/utils/zones.js'

describe('applyProjectSettings', () => {
  test('обновляет font у зон с effectiveOldFont', () => {
    const zones = [
      { id: '1', font: 'Roboto', fontSize: 18 },
      { id: '2', font: 'PTSerif', fontSize: 18 },
    ]
    const result = applyProjectSettings(zones, { projectFont: 'PTSerif' }, 'Roboto', 18)
    expect(result[0].font).toBe('PTSerif') // совпадал с дефолтом → обновлён
    expect(result[1].font).toBe('PTSerif') // уже PTSerif, не совпадал с Roboto → не тронут
  })

  test('не обновляет font у зон с отличным от effectiveOldFont значением', () => {
    const zones = [{ id: '1', font: 'PTSerif', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFont: 'Roboto' }, 'Roboto', 18)
    expect(result[0].font).toBe('PTSerif') // PTSerif != effectiveOldFont (Roboto) → не тронут
  })

  test('обновляет fontSize у зон с effectiveOldFontSize', () => {
    const zones = [
      { id: '1', font: 'Roboto', fontSize: 18 },
      { id: '2', font: 'Roboto', fontSize: 14 },
    ]
    const result = applyProjectSettings(zones, { projectFontSize: 24 }, 'Roboto', 18)
    expect(result[0].fontSize).toBe(24) // 18 == effectiveOld → обновлён
    expect(result[1].fontSize).toBe(14) // 14 != effectiveOld → не тронут
  })

  test('патч только с projectFont не трогает fontSize', () => {
    const zones = [{ id: '1', font: 'Roboto', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFont: 'PTSerif' }, 'Roboto', 18)
    expect(result[0].fontSize).toBe(18)
  })

  test('патч только с projectFontSize не трогает font', () => {
    const zones = [{ id: '1', font: 'Roboto', fontSize: 18 }]
    const result = applyProjectSettings(zones, { projectFontSize: 24 }, 'Roboto', 18)
    expect(result[0].font).toBe('Roboto')
  })

  test('возвращает те же объекты зон если ничего не изменилось', () => {
    const zones = [{ id: '1', font: 'PTSerif', fontSize: 14 }]
    const result = applyProjectSettings(zones, { projectFont: 'Roboto' }, 'Roboto', 18)
    expect(result[0]).toBe(zones[0]) // строгое равенство — объект не пересоздан
  })
})
```

- [ ] **Шаг 2: Запустить тесты — убедиться что падают**

```bash
cd /path/to/badge-generator && npm test -- zones
```

Ожидаем: FAIL — `Cannot find module '../../src/renderer/utils/zones.js'`

- [ ] **Шаг 3: Реализовать функцию**

Создать `src/renderer/utils/zones.js`:

```js
export function applyProjectSettings(zones, patch, effectiveOldFont, effectiveOldFontSize) {
  return zones.map(zone => {
    const updates = {}
    if ('projectFont' in patch && zone.font === effectiveOldFont) {
      updates.font = patch.projectFont
    }
    if ('projectFontSize' in patch && zone.fontSize === effectiveOldFontSize) {
      updates.fontSize = patch.projectFontSize
    }
    return Object.keys(updates).length > 0 ? { ...zone, ...updates } : zone
  })
}
```

- [ ] **Шаг 4: Запустить тесты — убедиться что проходят**

```bash
npm test -- zones
```

Ожидаем: 6 passed

- [ ] **Шаг 5: Коммит**

```bash
git add src/renderer/utils/zones.js tests/utils/zones.test.js
git commit -m "feat: утилита applyProjectSettings для обновления зон"
```

---

### Task 2: Обновить шаблон проекта в ipc.js

**Files:**
- Modify: `src/main/ipc.js:32-40`

- [ ] **Шаг 1: Добавить поля в шаблон**

В `ipcMain.handle('projects:create', ...)` добавить два поля в объект `project`:

Заменить:
```js
const project = {
  version: 1,
  name,
  templatePsdPath: null,
  templateDpi: null,
  excelPath: null,
  columns: [],
  zones: [],
}
```

На:
```js
const project = {
  version: 1,
  name,
  templatePsdPath: null,
  templateDpi: null,
  excelPath: null,
  columns: [],
  zones: [],
  projectFont: null,
  projectFontSize: null,
}
```

- [ ] **Шаг 2: Прогнать тесты**

```bash
npm test
```

Ожидаем: 32 passed (26 старых + 6 новых из Task 1)

- [ ] **Шаг 3: Коммит**

```bash
git add src/main/ipc.js
git commit -m "feat: добавить projectFont/projectFontSize в шаблон нового проекта"
```

---

### Task 3: Создать ProjectSettingsDrawer

**Files:**
- Create: `src/renderer/components/ProjectSettingsDrawer.jsx`

- [ ] **Шаг 1: Создать компонент**

Создать `src/renderer/components/ProjectSettingsDrawer.jsx`:

```jsx
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
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/renderer/components/ProjectSettingsDrawer.jsx
git commit -m "feat: компонент ProjectSettingsDrawer"
```

---

### Task 4: Подключить в Editor.jsx

**Files:**
- Modify: `src/renderer/screens/Editor.jsx`

- [ ] **Шаг 1: Добавить импорты**

В начало файла добавить/дополнить импорты.

В список именованных импортов из react — без изменений (уже есть `useState`, `useEffect`, `useRef`, `useCallback`).

После существующих импортов компонентов добавить:
```js
import ProjectSettingsDrawer from '../components/ProjectSettingsDrawer'
```

В блок импортов иконок (после `ChevronRightIcon`) добавить:
```js
import SettingsIcon from '@mui/icons-material/Settings'
```

В блок именованных импортов из `../utils/zones` добавить:
```js
import { applyProjectSettings } from '../utils/zones'
```

- [ ] **Шаг 2: Добавить состояние projectSettingsOpen**

После строки `const [sideWidth, setSideWidth] = useState(300)` добавить:
```js
const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
const [prefs, setPrefs] = useState({ defaultFont: DEFAULT_FONT, defaultFontSize: DEFAULT_FONT_SIZE })
```

Удалить отдельные `const [defaultFont, ...] = useState(...)` и `const [defaultFontSize, ...] = useState(...)` — они заменяются единым объектом `prefs`.

- [ ] **Шаг 3: Обновить init() — загружать prefs в единый объект**

В `useEffect` найти строки:
```js
const loadedPrefs = await window.api.loadPrefs()
setDefaultFont(loadedPrefs.defaultFont ?? DEFAULT_FONT)
setDefaultFontSize(loadedPrefs.defaultFontSize ?? DEFAULT_FONT_SIZE)
```

Заменить на:
```js
const loadedPrefs = await window.api.loadPrefs()
setPrefs(loadedPrefs)
```

- [ ] **Шаг 4: Добавить handleProjectSettingsChange**

После функции `handleZonesChange` добавить:

```js
async function handleProjectSettingsChange(patch) {
  const effectiveOldFont = project.projectFont ?? prefs.defaultFont ?? DEFAULT_FONT
  const effectiveOldFontSize = project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE
  const updatedZones = applyProjectSettings(project.zones, patch, effectiveOldFont, effectiveOldFontSize)
  await save({ ...project, ...patch, zones: updatedZones })
}
```

- [ ] **Шаг 5: Вычислить effectiveDefaultFont/Size и передать в PSDViewer**

Перед `return` добавить вычисление (рядом с существующими вычисляемыми переменными `psdName`, `excelName`, `canGenerate`):

```js
const effectiveDefaultFont = project.projectFont ?? prefs.defaultFont ?? DEFAULT_FONT
const effectiveDefaultFontSize = project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE
```

В JSX найти:
```jsx
defaultFont={defaultFont}
defaultFontSize={defaultFontSize}
```

Заменить на:
```jsx
defaultFont={effectiveDefaultFont}
defaultFontSize={effectiveDefaultFontSize}
```

- [ ] **Шаг 6: Перестроить полоску навигации страниц**

Найти блок:
```jsx
{rows.length > 0 && (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
    <IconButton size="small" disabled={previewRowIndex === 0} onClick={() => {
      const next = previewRowIndex - 1
      setPreviewRowIndex(next)
      setPageInput(String(next + 1))
    }}>
      <ChevronLeftIcon fontSize="small" />
    </IconButton>
    <TextField
      size="small"
      value={pageInput}
      onChange={e => {
        setPageInput(e.target.value)
        const v = parseInt(e.target.value, 10)
        if (!isNaN(v)) setPreviewRowIndex(Math.max(0, Math.min(rows.length - 1, v - 1)))
      }}
      onBlur={() => {
        const v = parseInt(pageInput, 10)
        if (isNaN(v) || pageInput.trim() === '') setPageInput(String(previewRowIndex + 1))
      }}
      inputProps={{ min: 1, max: rows.length, style: { textAlign: 'center', width: 40 } }}
      sx={{ width: 60 }}
    />
    <Typography variant="body2" color="text.secondary">/ {rows.length}</Typography>
    <IconButton size="small" disabled={previewRowIndex === rows.length - 1} onClick={() => {
      const next = previewRowIndex + 1
      setPreviewRowIndex(next)
      setPageInput(String(next + 1))
    }}>
      <ChevronRightIcon fontSize="small" />
    </IconButton>
  </Box>
)}
```

Заменить на:
```jsx
<Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
    {rows.length > 0 && (
      <>
        <IconButton size="small" disabled={previewRowIndex === 0} onClick={() => {
          const next = previewRowIndex - 1
          setPreviewRowIndex(next)
          setPageInput(String(next + 1))
        }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <TextField
          size="small"
          value={pageInput}
          onChange={e => {
            setPageInput(e.target.value)
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) setPreviewRowIndex(Math.max(0, Math.min(rows.length - 1, v - 1)))
          }}
          onBlur={() => {
            const v = parseInt(pageInput, 10)
            if (isNaN(v) || pageInput.trim() === '') setPageInput(String(previewRowIndex + 1))
          }}
          inputProps={{ min: 1, max: rows.length, style: { textAlign: 'center', width: 40 } }}
          sx={{ width: 60 }}
        />
        <Typography variant="body2" color="text.secondary">/ {rows.length}</Typography>
        <IconButton size="small" disabled={previewRowIndex === rows.length - 1} onClick={() => {
          const next = previewRowIndex + 1
          setPreviewRowIndex(next)
          setPageInput(String(next + 1))
        }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </>
    )}
  </Box>
  <IconButton size="small" onClick={() => setProjectSettingsOpen(true)} sx={{ mr: 0.5 }}>
    <SettingsIcon fontSize="small" />
  </IconButton>
</Box>
```

- [ ] **Шаг 7: Добавить рендер ProjectSettingsDrawer**

В конце JSX, перед закрывающим `</Box>` (после `<Snackbar ...>`), добавить:

```jsx
<ProjectSettingsDrawer
  open={projectSettingsOpen}
  onClose={() => setProjectSettingsOpen(false)}
  project={project}
  prefs={prefs}
  onProjectSettingsChange={handleProjectSettingsChange}
/>
```

- [ ] **Шаг 8: Прогнать тесты**

```bash
npm test
```

Ожидаем: 32 passed

- [ ] **Шаг 9: Коммит**

```bash
git add src/renderer/screens/Editor.jsx
git commit -m "feat: настройки шрифта проекта — drawer и обновление зон"
```
