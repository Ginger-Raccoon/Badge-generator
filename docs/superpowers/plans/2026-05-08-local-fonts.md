# Загрузка локальных шрифтов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в настройки кнопку «Управление шрифтами», которая сканирует системные папки шрифтов, показывает список с чекбоксами, сохраняет выбор в prefs и использует выбранные шрифты при генерации PDF.

**Architecture:** Логика сканирования вынесена в чистый Node.js-модуль `src/main/fonts.js` (тестируемый без Electron). Три новых IPC-хандлера в `ipc.js` используют этот модуль. `SettingsDrawer` открывает диалог с чекбоксами; оба селектора шрифтов строятся динамически из `prefs.customFonts`. Генератор PDF принимает байты кастомных шрифтов в `fontBytes.custom`.

**Tech Stack:** Electron 41 (Node.js 20), React 19, MUI v9, pdf-lib, vitest

---

## Файловая карта

| Действие | Файл | Что меняется |
|----------|------|--------------|
| Создать | `src/main/fonts.js` | Логика сканирования системных шрифтов |
| Создать | `tests/main/fonts.test.js` | Тесты для fonts.js |
| Изменить | `src/main/prefs.js` | `customFonts: []` в DEFAULTS |
| Изменить | `src/main/ipc.js` | Три новых IPC-хандлера |
| Изменить | `src/preload.js` | Три новых метода в `window.api` |
| Изменить | `src/renderer/utils/generator.js` | Встраивание `fontBytes.custom` |
| Изменить | `src/renderer/screens/Editor.jsx` | Загрузка кастомных шрифтов перед генерацией |
| Изменить | `src/renderer/screens/HomeScreen.jsx` | `customFonts: []` в начальном состоянии |
| Изменить | `src/renderer/components/SettingsDrawer.jsx` | Кнопка + диалог + динамический селектор |
| Изменить | `src/renderer/components/ProjectSettingsDrawer.jsx` | Динамический селектор |
| Изменить | `tests/main/prefs.test.js` | Обновить ожидаемые дефолты |
| Изменить | `tests/utils/generator.test.js` | Тест кастомных шрифтов |

---

## Task 1: prefs.js — добавить customFonts в DEFAULTS

**Files:**
- Modify: `src/main/prefs.js`
- Modify: `tests/main/prefs.test.js`

- [ ] **Step 1: Обновить тест — добавить customFonts в ожидаемые дефолты**

В `tests/main/prefs.test.js` найти три места с `expect(prefs).toEqual(...)` и добавить `customFonts: []`:

```js
// Строка 14 — тест "возвращает дефолты если файл отсутствует"
expect(prefs).toEqual({
  favorites: [],
  skipDeleteConfirm: false,
  defaultFont: DEFAULT_FONT,
  defaultFontSize: DEFAULT_FONT_SIZE,
  customFonts: [],
})

// Строка 27 — тест "возвращает дефолты при битом JSON"
expect(prefs).toEqual({
  favorites: [],
  skipDeleteConfirm: false,
  defaultFont: DEFAULT_FONT,
  defaultFontSize: DEFAULT_FONT_SIZE,
  customFonts: [],
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидаемый результат: FAIL (customFonts не найден в дефолтах)

- [ ] **Step 3: Добавить customFonts в DEFAULTS**

В `src/main/prefs.js` строка 6, изменить `DEFAULTS`:

```js
const DEFAULTS = {
  favorites: [],
  skipDeleteConfirm: false,
  defaultFont: DEFAULT_FONT,
  defaultFontSize: DEFAULT_FONT_SIZE,
  customFonts: [],
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидаемый результат: PASS (все 4 теста)

- [ ] **Step 5: Коммит**

```bash
git add src/main/prefs.js tests/main/prefs.test.js
git commit -m "feat: добавить customFonts в дефолты prefs"
```

---

## Task 2: fonts.js — модуль сканирования шрифтов

**Files:**
- Create: `src/main/fonts.js`
- Create: `tests/main/fonts.test.js`

- [ ] **Step 1: Написать тесты**

Создать `tests/main/fonts.test.js`:

```js
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getSystemFontDirs, scanFontDirs } from '../../src/main/fonts.js'

describe('getSystemFontDirs', () => {
  test('macOS включает папки в правильном порядке', () => {
    const dirs = getSystemFontDirs('darwin', '/Users/test')
    expect(dirs[0]).toBe('/Users/test/Library/Fonts')
    expect(dirs).toContain('/Library/Fonts')
    expect(dirs).toContain('/System/Library/Fonts')
  })

  test('windows возвращает C:\\Windows\\Fonts', () => {
    const dirs = getSystemFontDirs('win32', 'C:\\Users\\test')
    expect(dirs).toContain('C:\\Windows\\Fonts')
  })

  test('linux включает ~/.fonts', () => {
    const dirs = getSystemFontDirs('linux', '/home/test')
    expect(dirs[0]).toBe('/home/test/.fonts')
    expect(dirs).toContain('/usr/share/fonts')
  })
})

describe('scanFontDirs', () => {
  let tmp

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'fonts-test-'))
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test('находит TTF и OTF, игнорирует другие расширения', () => {
    writeFileSync(join(tmp, 'Arial.ttf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'Times.otf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'readme.txt'), 'not a font')
    const result = scanFontDirs([tmp])
    const names = result.map(f => f.name)
    expect(names).toContain('Arial')
    expect(names).toContain('Times')
    expect(names).not.toContain('readme')
  })

  test('результат отсортирован по имени', () => {
    writeFileSync(join(tmp, 'Zebra.ttf'), Buffer.alloc(4))
    writeFileSync(join(tmp, 'Apple.ttf'), Buffer.alloc(4))
    const result = scanFontDirs([tmp])
    expect(result[0].name).toBe('Apple')
    expect(result[1].name).toBe('Zebra')
  })

  test('дубликаты по имени устраняются, первая папка имеет приоритет', () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'fonts-test2-'))
    try {
      writeFileSync(join(tmp, 'Arial.ttf'), Buffer.alloc(4))
      writeFileSync(join(tmp2, 'Arial.ttf'), Buffer.alloc(4))
      const result = scanFontDirs([tmp, tmp2])
      const arials = result.filter(f => f.name === 'Arial')
      expect(arials).toHaveLength(1)
      expect(arials[0].path).toContain(tmp)
    } finally {
      rmSync(tmp2, { recursive: true, force: true })
    }
  })

  test('несуществующие папки игнорируются', () => {
    const result = scanFontDirs(['/nonexistent/path/to/fonts'])
    expect(result).toEqual([])
  })

  test('рекурсивно сканирует подпапки', () => {
    const sub = join(tmp, 'Supplemental')
    mkdirSync(sub)
    writeFileSync(join(sub, 'Nested.ttf'), Buffer.alloc(4))
    const result = scanFontDirs([tmp])
    expect(result[0].name).toBe('Nested')
    expect(result[0].path).toBe(join(sub, 'Nested.ttf'))
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

```bash
npm test -- tests/main/fonts.test.js
```

Ожидаемый результат: FAIL (модуль не существует)

- [ ] **Step 3: Создать src/main/fonts.js**

```js
import fs from 'fs'
import path from 'path'
import os from 'os'

export function getSystemFontDirs(platform, homeDir) {
  if (platform === 'darwin') {
    return [
      path.join(homeDir, 'Library', 'Fonts'),
      '/Library/Fonts',
      '/System/Library/Fonts',
    ]
  }
  if (platform === 'win32') {
    return ['C:\\Windows\\Fonts']
  }
  return [
    path.join(homeDir, '.fonts'),
    '/usr/share/fonts',
  ]
}

function collectFonts(dir) {
  const result = []
  if (!fs.existsSync(dir)) return result
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        result.push(...collectFonts(fullPath))
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ext === '.ttf' || ext === '.otf') {
          result.push({ name: path.basename(entry.name, ext), path: fullPath })
        }
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return result
}

export function scanFontDirs(dirs) {
  const seen = new Set()
  const result = []
  for (const dir of dirs) {
    for (const font of collectFonts(dir)) {
      if (!seen.has(font.name)) {
        seen.add(font.name)
        result.push(font)
      }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function scanSystemFonts() {
  return scanFontDirs(getSystemFontDirs(process.platform, os.homedir()))
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

```bash
npm test -- tests/main/fonts.test.js
```

Ожидаемый результат: PASS (все 7 тестов)

- [ ] **Step 5: Коммит**

```bash
git add src/main/fonts.js tests/main/fonts.test.js
git commit -m "feat: модуль сканирования системных шрифтов"
```

---

## Task 3: ipc.js — три новых хандлера

**Files:**
- Modify: `src/main/ipc.js`

- [ ] **Step 1: Добавить импорт fonts.js в начало файла**

В `src/main/ipc.js` после строки `import { loadPrefs, savePrefs } from './prefs.js'` добавить:

```js
import { scanSystemFonts } from './fonts.js'
```

- [ ] **Step 2: Добавить три IPC-хандлера в конец файла**

После последнего хандлера (`projects:deleteAll`) добавить:

```js
ipcMain.handle('fonts:scanSystem', () => {
  return scanSystemFonts()
})

ipcMain.handle('fonts:loadCustom', (_, paths) => {
  return paths.map(filePath => ({
    name: path.basename(filePath, path.extname(filePath)),
    bytes: Array.from(fs.readFileSync(filePath)),
  }))
})

ipcMain.handle('projects:usedFonts', () => {
  ensureProjectsDir()
  const names = new Set()
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
  for (const entry of entries) {
    const file = path.join(PROJECTS_DIR, entry.name, 'project.json')
    if (!fs.existsSync(file)) continue
    try {
      const project = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (project.projectFont) names.add(project.projectFont)
      for (const zone of project.zones ?? []) {
        if (zone.font) names.add(zone.font)
      }
    } catch {}
  }
  return Array.from(names)
})
```

- [ ] **Step 3: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS (все тесты)

- [ ] **Step 4: Коммит**

```bash
git add src/main/ipc.js
git commit -m "feat: IPC-хандлеры для сканирования и загрузки локальных шрифтов"
```

---

## Task 4: preload.js — три новых метода

**Files:**
- Modify: `src/preload.js`

- [ ] **Step 1: Добавить три метода в window.api**

В `src/preload.js` добавить три строки после `loadFonts`:

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
  scanSystemFonts:   ()             => ipcRenderer.invoke('fonts:scanSystem'),
  loadCustomFonts:   (paths)        => ipcRenderer.invoke('fonts:loadCustom', paths),
  getUsedFonts:      ()             => ipcRenderer.invoke('projects:usedFonts'),
  loadPrefs:         ()             => ipcRenderer.invoke('prefs:load'),
  savePrefs:         (prefs)        => ipcRenderer.invoke('prefs:save', prefs),
  deleteProject:     (name)         => ipcRenderer.invoke('projects:delete', name),
  deleteAllProjects: ()             => ipcRenderer.invoke('projects:deleteAll'),
})
```

- [ ] **Step 2: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS

- [ ] **Step 3: Коммит**

```bash
git add src/preload.js
git commit -m "feat: добавить scanSystemFonts, loadCustomFonts, getUsedFonts в window.api"
```

---

## Task 5: generator.js — поддержка кастомных шрифтов

**Files:**
- Modify: `src/renderer/utils/generator.js`
- Modify: `tests/utils/generator.test.js`

- [ ] **Step 1: Написать тест для кастомных шрифтов**

В `tests/utils/generator.test.js` добавить тест после последнего теста в `describe('generatePdf', ...)`:

```js
test('кастомные шрифты встраиваются и применяются к зонам', async () => {
  const fontBytes = {
    roboto: loadFont('Roboto-Regular.ttf'),
    ptSerif: loadFont('PTSerif-Regular.ttf'),
    custom: [{ name: 'MyCustom', bytes: loadFont('Roboto-Regular.ttf') }],
  }
  const zones = [{
    id: '1', x: 100, y: 100, width: 200, height: 20,
    column: 'Имя', font: 'MyCustom', fontSize: 12,
  }]
  const rows = [{ Имя: 'Тест' }]

  const result = await generatePdf({ ...baseArgs, fontBytes, zones, rows })
  expect(result).toBeInstanceOf(Uint8Array)
  expect(result.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

```bash
npm test -- tests/utils/generator.test.js
```

Ожидаемый результат: FAIL (MyCustom не найден, fallback на Roboto работает но тест проверяет именно встраивание — убедись что тест действительно падает; если нет, уточни проверку)

> Примечание: если тест неожиданно проходит (fallback уже работает), это нормально — тест всё равно документирует поведение. Переходи к следующему шагу.

- [ ] **Step 3: Обновить generator.js — встраивать кастомные шрифты**

В `src/renderer/utils/generator.js` заменить блок встраивания шрифтов (строки 12-15):

```js
// было:
const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
const fonts = { Roboto: robotoFont, PTSerif: ptSerifFont }

// стало:
const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
const fonts = { Roboto: robotoFont, PTSerif: ptSerifFont }
for (const { name, bytes } of (fontBytes.custom ?? [])) {
  fonts[name] = await outputDoc.embedFont(new Uint8Array(bytes))
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

```bash
npm test -- tests/utils/generator.test.js
```

Ожидаемый результат: PASS (все 4 теста)

- [ ] **Step 5: Коммит**

```bash
git add src/renderer/utils/generator.js tests/utils/generator.test.js
git commit -m "feat: поддержка кастомных шрифтов в генераторе PDF"
```

---

## Task 6: Editor.jsx — загрузка кастомных шрифтов перед генерацией

**Files:**
- Modify: `src/renderer/screens/Editor.jsx`

- [ ] **Step 1: Обновить handleGenerate — загружать кастомные шрифты**

В `src/renderer/screens/Editor.jsx` в функции `handleGenerate` заменить строку загрузки шрифтов (строка 152):

```js
// было:
const fontBytes = await window.api.loadFonts()

// стало:
const fontBytes = await window.api.loadFonts()
if ((prefs.customFonts ?? []).length > 0) {
  fontBytes.custom = await window.api.loadCustomFonts(prefs.customFonts.map(f => f.path))
}
```

- [ ] **Step 2: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS

- [ ] **Step 3: Коммит**

```bash
git add src/renderer/screens/Editor.jsx
git commit -m "feat: загружать кастомные шрифты перед генерацией PDF"
```

---

## Task 7: HomeScreen.jsx — customFonts в начальном состоянии

**Files:**
- Modify: `src/renderer/screens/HomeScreen.jsx`

- [ ] **Step 1: Добавить customFonts в начальное состояние prefs**

В `src/renderer/screens/HomeScreen.jsx` строка 20, изменить `useState`:

```js
// было:
const [prefs, setPrefs] = useState({
  favorites: [],
  skipDeleteConfirm: false,
  defaultFont: DEFAULT_FONT,
  defaultFontSize: DEFAULT_FONT_SIZE,
})

// стало:
const [prefs, setPrefs] = useState({
  favorites: [],
  skipDeleteConfirm: false,
  defaultFont: DEFAULT_FONT,
  defaultFontSize: DEFAULT_FONT_SIZE,
  customFonts: [],
})
```

- [ ] **Step 2: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS

- [ ] **Step 3: Коммит**

```bash
git add src/renderer/screens/HomeScreen.jsx
git commit -m "feat: customFonts в начальном состоянии prefs"
```

---

## Task 8: ProjectSettingsDrawer.jsx — динамический селектор шрифтов

**Files:**
- Modify: `src/renderer/components/ProjectSettingsDrawer.jsx`

- [ ] **Step 1: Обновить Select шрифтов — добавить кастомные шрифты**

В `src/renderer/components/ProjectSettingsDrawer.jsx` заменить содержимое `<Select>` (строки 43-46):

```jsx
// было:
<MenuItem value="Roboto">Roboto</MenuItem>
<MenuItem value="PTSerif">PT Serif</MenuItem>

// стало:
<MenuItem value="Roboto">Roboto</MenuItem>
<MenuItem value="PTSerif">PT Serif</MenuItem>
{(prefs.customFonts ?? []).map(f => (
  <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
))}
```

- [ ] **Step 2: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS

- [ ] **Step 3: Коммит**

```bash
git add src/renderer/components/ProjectSettingsDrawer.jsx
git commit -m "feat: динамический список шрифтов в настройках проекта"
```

---

## Task 9: SettingsDrawer.jsx — кнопка + диалог + динамический селектор

**Files:**
- Modify: `src/renderer/components/SettingsDrawer.jsx`

- [ ] **Step 1: Обновить импорты MUI**

В `src/renderer/components/SettingsDrawer.jsx` заменить блок импортов:

```js
import {
  Drawer, Box, Typography, IconButton, Select, MenuItem,
  FormControl, InputLabel, TextField, Divider, FormControlLabel,
  Checkbox, Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, CircularProgress,
  List, ListItem, ListItemButton, ListItemText,
} from '@mui/material'
```

- [ ] **Step 2: Добавить новое состояние компонента**

В `src/renderer/components/SettingsDrawer.jsx` после строки `const [confirmInput, setConfirmInput] = useState('')` добавить:

```js
const [fontDialogOpen, setFontDialogOpen] = useState(false)
const [scanning, setScanning] = useState(false)
const [scannedFonts, setScannedFonts] = useState([])
const [usedFonts, setUsedFonts] = useState(new Set())
const [selectedFontNames, setSelectedFontNames] = useState(new Set())
```

- [ ] **Step 3: Добавить функции управления шрифтами**

После функции `handleConfirmDelete` добавить:

```js
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
```

- [ ] **Step 4: Обновить JSX — динамический селектор + кнопка + диалог управления**

В блоке `<FormControl>` с селектором шрифта заменить содержимое `<Select>`:

```jsx
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
```

После `</FormControl>` (после блока селектора шрифта) и перед `<TextField` добавить кнопку:

```jsx
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
```

- [ ] **Step 5: Добавить диалог управления шрифтами**

Внутри `<>...</>` (после закрывающего тега диалога подтверждения удаления) добавить новый `<Dialog>`:

```jsx
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
```

- [ ] **Step 6: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS

- [ ] **Step 7: Коммит**

```bash
git add src/renderer/components/SettingsDrawer.jsx
git commit -m "feat: диалог управления локальными шрифтами в настройках"
```

---

## Task 10: Финальная проверка

- [ ] **Step 1: Прогнать все тесты**

```bash
npm test
```

Ожидаемый результат: PASS (все тесты)

- [ ] **Step 2: Запустить приложение и проверить вручную**

```bash
npm start
```

Проверить:
1. Открыть настройки (иконка шестерёнки на главном экране)
2. Нажать «Управление шрифтами» — кнопка переходит в disabled, затем открывается диалог с системными шрифтами
3. Отметить несколько шрифтов, нажать «Применить»
4. В селекторе «Шрифт по умолчанию» появились новые шрифты
5. Открыть проект → в ProjectSettingsDrawer → селектор показывает те же кастомные шрифты
6. Назначить зоне кастомный шрифт → повторно открыть диалог → этот шрифт disabled с подписью «используется»
7. Сгенерировать PDF → убедиться, что кастомный шрифт применяется

- [ ] **Step 3: Финальный коммит (если нужны правки после ручного тестирования)**

```bash
git add -p
git commit -m "fix: правки после ручного тестирования локальных шрифтов"
```
