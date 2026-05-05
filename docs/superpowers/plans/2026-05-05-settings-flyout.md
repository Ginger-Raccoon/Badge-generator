# Флейаут настроек — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить флейаут настроек на главный экран: дефолтный шрифт/размер для новых зон, управление подтверждением удаления, удаление всех проектов разом.

**Architecture:** Новый компонент `SettingsDrawer.jsx` управляет своим UI и диалогом подтверждения удаления всех; HomeScreen хранит state настроек (`prefs`) и передаёт коллбэки. Дефолтные шрифт/размер хранятся в `prefs.json` и передаются в `PSDViewer` через `Editor`.

**Tech Stack:** Electron IPC, Node.js fs, Vitest, React, MUI

---

## Карта файлов

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `src/main/prefs.js` | Изменить | Добавить `defaultFont`/`defaultFontSize` в DEFAULTS |
| `src/main/ipc.js` | Изменить | Добавить хендлер `projects:deleteAll` |
| `src/preload.js` | Изменить | Добавить `deleteAllProjects` |
| `src/renderer/components/SettingsDrawer.jsx` | Создать | Drawer с настройками + диалог удаления всех |
| `src/renderer/screens/HomeScreen.jsx` | Изменить | Объединить state в `prefs`, добавить шестерёнку и SettingsDrawer |
| `src/renderer/screens/Editor.jsx` | Изменить | Загрузить prefs, передать defaults в PSDViewer |
| `src/renderer/components/PSDViewer.jsx` | Изменить | Принять `defaultFont`/`defaultFontSize` пропсы |
| `tests/main/prefs.test.js` | Изменить | Обновить тесты под новые DEFAULTS |

---

## Task 1: prefs.js — новые поля в DEFAULTS

**Files:**
- Modify: `src/main/prefs.js`
- Test: `tests/main/prefs.test.js`

- [ ] **Шаг 1: Обновить два теста, которые проверяют полный объект DEFAULTS**

В `tests/main/prefs.test.js` найти и заменить оба `toEqual` с неполными дефолтами:

```js
// строка 14: было
expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false })
// стало
expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 })
```

```js
// строка 27: было
expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false })
// стало
expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 })
```

- [ ] **Шаг 2: Запустить тесты — убедиться что падают**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидание: 2 теста FAIL (assertion mismatch), 2 PASS.

- [ ] **Шаг 3: Обновить DEFAULTS в `src/main/prefs.js`**

```js
import fs from 'fs'
import path from 'path'

const DEFAULTS = { favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 }

export function loadPrefs(dir) {
  const file = path.join(dir, 'prefs.json')
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(dir, prefs) {
  const file = path.join(dir, 'prefs.json')
  fs.writeFileSync(file, JSON.stringify(prefs, null, 2))
}
```

- [ ] **Шаг 4: Запустить тесты — убедиться что проходят**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидание: 4 теста PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add src/main/prefs.js tests/main/prefs.test.js
git commit -m "feat: добавить defaultFont/defaultFontSize в prefs DEFAULTS"
```

---

## Task 2: ipc.js + preload.js — projects:deleteAll

**Files:**
- Modify: `src/main/ipc.js`
- Modify: `src/preload.js`

- [ ] **Шаг 1: Добавить хендлер в конец `src/main/ipc.js`**

После хендлера `projects:delete` добавить:

```js
ipcMain.handle('projects:deleteAll', () => {
  ensureProjectsDir()
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
  for (const entry of entries) {
    fs.rmSync(path.join(PROJECTS_DIR, entry.name), { recursive: true })
  }
})
```

- [ ] **Шаг 2: Добавить метод в `src/preload.js`**

После строки `deleteProject` добавить:

```js
  deleteAllProjects: ()             => ipcRenderer.invoke('projects:deleteAll'),
```

Полный `window.api` после изменения:

```js
contextBridge.exposeInMainWorld('api', {
  listProjects:      ()             => ipcRenderer.invoke('projects:list'),
  createProject:     (name)         => ipcRenderer.invoke('projects:create', name),
  loadProject:       (name)         => ipcRenderer.invoke('projects:load', name),
  saveProject:       (name, data)   => ipcRenderer.invoke('projects:save', name, data),
  openFileDialog:    (filters)      => ipcRenderer.invoke('dialog:open', filters),
  saveFileDialog:    (filters)      => ipcRenderer.invoke('dialog:save', filters),
  readFileBytes:     (filePath)     => ipcRenderer.invoke('fs:readBytes', filePath),
  writeFileBytes:    (filePath, d)  => ipcRenderer.invoke('fs:writeBytes', filePath, d),
  fileExists:        (filePath)     => ipcRenderer.invoke('fs:exists', filePath),
  loadFonts:         ()             => ipcRenderer.invoke('fonts:loadAll'),
  loadPrefs:         ()             => ipcRenderer.invoke('prefs:load'),
  savePrefs:         (prefs)        => ipcRenderer.invoke('prefs:save', prefs),
  deleteProject:     (name)         => ipcRenderer.invoke('projects:delete', name),
  deleteAllProjects: ()             => ipcRenderer.invoke('projects:deleteAll'),
})
```

- [ ] **Шаг 3: Коммит**

```bash
git add src/main/ipc.js src/preload.js
git commit -m "feat: IPC-хендлер projects:deleteAll и метод в preload"
```

---

## Task 3: SettingsDrawer.jsx — новый компонент

**Files:**
- Create: `src/renderer/components/SettingsDrawer.jsx`

- [ ] **Шаг 1: Создать файл `src/renderer/components/SettingsDrawer.jsx`**

```jsx
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
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/renderer/components/SettingsDrawer.jsx
git commit -m "feat: компонент SettingsDrawer с настройками и диалогом удаления всех"
```

---

## Task 4: HomeScreen.jsx — рефактор state + интеграция

**Files:**
- Modify: `src/renderer/screens/HomeScreen.jsx`

Контекст: текущий HomeScreen хранит `favorites` и `skipDeleteConfirm` как отдельные state. Нужно объединить в один объект `prefs`, добавить `settingsOpen`, иконку шестерёнки и `<SettingsDrawer>`.

- [ ] **Шаг 1: Полностью заменить содержимое `src/renderer/screens/HomeScreen.jsx`**

```jsx
import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, AppBar, Toolbar, IconButton, Divider,
  Checkbox, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsDrawer from '../components/SettingsDrawer'

export default function HomeScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [prefs, setPrefs] = useState({ favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.listProjects(),
      window.api.loadPrefs(),
    ]).then(([projectList, loadedPrefs]) => {
      setProjects(projectList)
      setPrefs(loadedPrefs)
    })
  }, [])

  async function handlePrefsChange(patch) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    await window.api.savePrefs(next)
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const project = await window.api.createProject(name)
    setDialogOpen(false)
    setNewName('')
    onOpenProject(project)
  }

  async function handleOpen(name) {
    const project = await window.api.loadProject(name)
    onOpenProject(project)
  }

  async function toggleFavorite(e, name) {
    e.stopPropagation()
    const next = prefs.favorites.includes(name)
      ? prefs.favorites.filter(f => f !== name)
      : [...prefs.favorites, name]
    await handlePrefsChange({ favorites: next })
  }

  async function confirmDelete(name) {
    const nextFavorites = prefs.favorites.filter(f => f !== name)
    await handlePrefsChange({ favorites: nextFavorites })
    await window.api.deleteProject(name)
    setProjects(prev => prev.filter(p => p !== name))
  }

  async function handleDeleteClick(e, name) {
    e.stopPropagation()
    if (prefs.skipDeleteConfirm) {
      await confirmDelete(name)
    } else {
      setDeleteConfirmChecked(false)
      setPendingDelete(name)
    }
  }

  async function handleConfirmDelete() {
    try {
      const nextFavorites = prefs.favorites.filter(f => f !== pendingDelete)
      const nextSkip = deleteConfirmChecked || prefs.skipDeleteConfirm
      await handlePrefsChange({ favorites: nextFavorites, skipDeleteConfirm: nextSkip })
      await window.api.deleteProject(pendingDelete)
      setProjects(prev => prev.filter(p => p !== pendingDelete))
      setPendingDelete(null)
    } catch (err) {
      console.error('Ошибка при удалении проекта:', err)
      setPendingDelete(null)
    }
  }

  async function handleDeleteAll() {
    await window.api.deleteAllProjects()
    const next = { ...prefs, favorites: [] }
    setProjects([])
    setPrefs(next)
    await window.api.savePrefs(next)
    setSettingsOpen(false)
  }

  function renderItem(name) {
    const isFav = prefs.favorites.includes(name)
    return (
      <ListItem key={name} disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <ListItemButton onClick={() => handleOpen(name)}>
          <ListItemText primary={name} />
          <IconButton size="small" onClick={e => toggleFavorite(e, name)} sx={{ mr: 0.5 }}>
            {isFav ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={e => handleDeleteClick(e, name)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItemButton>
      </ListItem>
    )
  }

  const favList = projects.filter(n => prefs.favorites.includes(n))
  const otherList = projects.filter(n => !prefs.favorites.includes(n))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1} color="default">
        <Toolbar variant="dense">
          <Box component="img" src="icon.png" sx={{ width: 28, height: 28, mr: 1.5, borderRadius: 1 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            Бейджик
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Новый проект
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', width: '100%' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          {projects.length === 0 ? 'Нет проектов' : 'Ваши проекты'}
        </Typography>

        <>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {favList.map(renderItem)}
          </List>
          {favList.length > 0 && otherList.length > 0 && (
            <Divider sx={{ my: 1.5 }} />
          )}
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {otherList.map(renderItem)}
          </List>
        </>
      </Box>

      <IconButton
        onClick={() => setSettingsOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16, bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.paper' } }}
      >
        <SettingsIcon />
      </IconButton>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Новый проект</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Название проекта"
            fullWidth
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newName.trim()}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Удалить «{pendingDelete}»?</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteConfirmChecked}
                onChange={e => setDeleteConfirmChecked(e.target.checked)}
                size="small"
              />
            }
            label="Больше не спрашивать"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Отмена</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPrefsChange={handlePrefsChange}
        projects={projects}
        onDeleteAll={handleDeleteAll}
      />
    </Box>
  )
}
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/renderer/screens/HomeScreen.jsx
git commit -m "feat: интеграция SettingsDrawer в HomeScreen, рефактор state prefs"
```

---

## Task 5: Editor.jsx + PSDViewer.jsx — дефолтный шрифт/размер

**Files:**
- Modify: `src/renderer/screens/Editor.jsx`
- Modify: `src/renderer/components/PSDViewer.jsx`

- [ ] **Шаг 1: Добавить state в Editor.jsx**

После строки `const [pageInput, setPageInput] = useState('1')` добавить:

```js
const [defaultFont, setDefaultFont] = useState('Roboto')
const [defaultFontSize, setDefaultFontSize] = useState(12)
```

- [ ] **Шаг 2: Загружать prefs в init useEffect в Editor.jsx**

В конец функции `init` (после блока `if (missing.length > 0)`) добавить:

```js
const loadedPrefs = await window.api.loadPrefs()
setDefaultFont(loadedPrefs.defaultFont ?? 'Roboto')
setDefaultFontSize(loadedPrefs.defaultFontSize ?? 12)
```

После правки `init` выглядит так:

```js
useEffect(() => {
  async function init() {
    const missing = []
    if (project.templatePsdPath) {
      const exists = await window.api.fileExists(project.templatePsdPath)
      if (!exists) missing.push('PSD-шаблон')
    }
    if (project.excelPath) {
      const exists = await window.api.fileExists(project.excelPath)
      if (!exists) {
        missing.push('Excel-файл')
      } else {
        try {
          const bytes = await window.api.readFileBytes(project.excelPath)
          const { rows: loadedRows } = readExcel(new Uint8Array(bytes))
          setRows(loadedRows)
        } catch {}
      }
    }
    if (missing.length > 0) {
      setSnackbar({ message: `Файлы не найдены: ${missing.join(', ')}. Загрузите их заново.`, severity: 'warning' })
    }
    const loadedPrefs = await window.api.loadPrefs()
    setDefaultFont(loadedPrefs.defaultFont ?? 'Roboto')
    setDefaultFontSize(loadedPrefs.defaultFontSize ?? 12)
  }
  init()
}, [])
```

- [ ] **Шаг 3: Передать пропсы в PSDViewer в Editor.jsx**

Найти JSX `<PSDViewer` и добавить два новых пропса:

```jsx
<PSDViewer
  psdPath={project.templatePsdPath}
  zones={project.zones}
  onZonesChange={handleZonesChange}
  selectedZoneId={selectedZoneId}
  onSelectZone={setSelectedZoneId}
  onPsdParsed={handlePsdParsed}
  previewRow={previewRow}
  dpi={dpi}
  columnSplits={project.columnSplits ?? {}}
  defaultFont={defaultFont}
  defaultFontSize={defaultFontSize}
/>
```

- [ ] **Шаг 4: Принять пропсы в PSDViewer.jsx**

Найти строку с объявлением функции компонента и добавить два новых параметра с дефолтами:

```js
export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi, columnSplits = {}, defaultFont = 'Roboto', defaultFontSize = 12 }) {
```

- [ ] **Шаг 5: Использовать пропсы при создании зоны в PSDViewer.jsx**

Найти в `handleMouseUp` блок создания зоны (тип `drawing`) и заменить захардкоженные значения:

```js
// Было:
font: 'Roboto',
fontSize: 12,
// Стало:
font: defaultFont,
fontSize: defaultFontSize,
```

Полный блок создания зоны после правки:

```js
onZonesChange([...zones, {
  id: crypto.randomUUID(),
  label: `Зона ${zones.length + 1}`,
  ...docCoords,
  column: '',
  font: defaultFont,
  fontSize: defaultFontSize,
  splitIndex: null,
  splitChar: '',
}])
```

- [ ] **Шаг 6: Коммит**

```bash
git add src/renderer/screens/Editor.jsx src/renderer/components/PSDViewer.jsx
git commit -m "feat: передать defaultFont/defaultFontSize из prefs в PSDViewer"
```

---

## Task 6: Ручная проверка

- [ ] **Шаг 1: Запустить приложение**

```bash
npm start
```

- [ ] **Шаг 2: Проверить настройки**

- Иконка шестерёнки видна в правом нижнем углу главного экрана
- Клик открывает Drawer справа
- Крестик и клик вне — закрывают Drawer
- Изменение шрифта / размера → сохраняется, после перезапуска значение сохранилось
- Новая зона в Editor → создаётся с выбранным дефолтным шрифтом и размером
- Чекбокс «Спрашивать при удалении» работает в обе стороны
- Кнопка «Удалить все» неактивна при пустом списке
- При наличии проектов: кнопка «Удалить все» → диалог с инпутом
- Кнопка «Удалить» в диалоге неактивна пока не введено `ПРОДОЛЖИТЬ`
- После подтверждения: все проекты удалены, список пуст, Drawer закрылся

- [ ] **Шаг 3: Финальный коммит**

```bash
git add -A
git commit -m "feat: флейаут настроек с дефолтным шрифтом, подтверждением удаления и удалением всех проектов"
```
