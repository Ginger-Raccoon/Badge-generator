# Badge Generator — План реализации

> **Для агентских воркеров:** ОБЯЗАТЕЛЬНЫЙ СУБ-СКИЛЛ: используй superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для пошагового выполнения. Шаги используют синтаксис чекбоксов (`- [ ]`) для трекинга.

**Цель:** Десктопное Electron-приложение для генерации многостраничного PDF из шаблона PDF + данных Excel с визуальной разметкой зон.

**Архитектура:** Electron (главный процесс) + React + Vite (рендерер). Всё хранение проектов — через IPC в главном процессе. Чистая логика (координаты, Excel, генерация) — в утилитах рендерера без Electron-зависимостей, покрыта тестами Vitest.

**Стек:** Electron + electron-forge, React, Material UI, pdf.js, pdf-lib, xlsx (SheetJS), Vitest.

---

## Структура файлов

```
badge-generator/
├── forge.config.js
├── index.html                          изменить: src/renderer/main.jsx
├── package.json
├── vite.main.config.mjs
├── vite.preload.config.mjs
├── vite.renderer.config.mjs            изменить: добавить React-плагин
├── vitest.config.mjs                   создать
├── public/
│   └── fonts/
│       ├── Roboto-Regular.ttf          скачать с Google Fonts
│       └── PTSerif-Regular.ttf         скачать с Google Fonts
├── src/
│   ├── main.js                         изменить: импорт ipc.js
│   ├── main/
│   │   └── ipc.js                      создать: все IPC-обработчики
│   ├── preload.js                      заменить: contextBridge API
│   └── renderer/
│       ├── main.jsx                    создать: React entry point
│       ├── App.jsx                     создать: роутинг HomeScreen ↔ Editor
│       ├── screens/
│       │   ├── HomeScreen.jsx          создать: список проектов
│       │   └── Editor.jsx              создать: редактор проекта
│       ├── components/
│       │   ├── PDFViewer.jsx           создать: canvas + SVG оверлей
│       │   ├── ZoneRect.jsx            создать: прямоугольник зоны
│       │   └── ZoneList.jsx            создать: список зон с контролами
│       └── utils/
│           ├── coordinates.js          создать: трансформация координат
│           ├── excel.js                создать: чтение Excel
│           └── generator.js            создать: генерация PDF
└── tests/
    └── utils/
        ├── coordinates.test.js         создать
        ├── excel.test.js               создать
        └── generator.test.js           создать
```

---

## Задача 1: Scaffold проекта

**Файлы:**
- Создать: всё дерево через electron-forge
- Изменить: `index.html`, `vite.renderer.config.mjs`, `package.json`
- Создать: `vitest.config.mjs`, `src/renderer/main.jsx`, `src/renderer/App.jsx`

- [ ] **Шаг 1: Инициализировать проект**

Выполнить из директории `badge-generator/`:

```bash
npm init electron-app@latest . -- --template=vite
```

- [ ] **Шаг 2: Установить зависимости**

```bash
npm install react react-dom @mui/material @emotion/react @emotion/styled @mui/icons-material pdfjs-dist pdf-lib xlsx
npm install -D @vitejs/plugin-react vitest
```

- [ ] **Шаг 3: Обновить vite.renderer.config.mjs**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Шаг 4: Создать vitest.config.mjs**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Шаг 5: Добавить тест-скрипты в package.json**

В секцию `"scripts"` добавить:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Шаг 6: Обновить index.html**

Найти строку `<script type="module" src="/src/renderer.js"></script>` и заменить:

```html
<script type="module" src="/src/renderer/main.jsx"></script>
```

- [ ] **Шаг 7: Создать src/renderer/main.jsx**

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
```

- [ ] **Шаг 8: Убедиться что в index.html есть div#root**

В `index.html` внутри `<body>` должно быть:

```html
<div id="root"></div>
```

Если нет — добавить перед тегом `<script>`.

- [ ] **Шаг 9: Создать src/renderer/App.jsx**

```jsx
export default function App() {
  return <h1>Badge Generator</h1>
}
```

- [ ] **Шаг 10: Скачать шрифты**

Скачать с Google Fonts:
- Roboto Regular → сохранить как `public/fonts/Roboto-Regular.ttf`
- PT Serif Regular → сохранить как `public/fonts/PTSerif-Regular.ttf`

Создать папку `public/fonts/` если её нет.

- [ ] **Шаг 11: Запустить приложение и убедиться что отображается "Badge Generator"**

```bash
npm start
```

Ожидаемый результат: открывается окно Electron с заголовком «Badge Generator».

- [ ] **Шаг 12: Удалить src/renderer.js** (заменён на src/renderer/main.jsx)

```bash
rm src/renderer.js
```

- [ ] **Шаг 13: Коммит**

```bash
git init
git add .
git commit -m "feat: scaffold Electron + React + MUI + Vitest"
```

---

## Задача 2: Утилиты координат

**Файлы:**
- Создать: `src/renderer/utils/coordinates.js`
- Создать: `tests/utils/coordinates.test.js`

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/utils/coordinates.test.js`:

```js
import { canvasToPdf, pdfToCanvas } from '../../src/renderer/utils/coordinates.js'

const canvasSize = { width: 900, height: 1200 }
const pdfSize = { width: 595, height: 842 }

describe('canvasToPdf', () => {
  test('конвертирует верхний левый угол холста в PDF-координаты', () => {
    const zone = { x: 0, y: 0, width: 90, height: 12 }
    const result = canvasToPdf(zone, canvasSize, pdfSize)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(842 - 12 * (842 / 1200))
    expect(result.width).toBeCloseTo(90 * (595 / 900))
    expect(result.height).toBeCloseTo(12 * (842 / 1200))
  })

  test('конвертирует произвольную зону', () => {
    const zone = { x: 450, y: 600, width: 180, height: 24 }
    const result = canvasToPdf(zone, canvasSize, pdfSize)
    const scaleX = 595 / 900
    const scaleY = 842 / 1200
    expect(result.x).toBeCloseTo(450 * scaleX)
    expect(result.y).toBeCloseTo(842 - (600 + 24) * scaleY)
    expect(result.width).toBeCloseTo(180 * scaleX)
    expect(result.height).toBeCloseTo(24 * scaleY)
  })
})

describe('pdfToCanvas', () => {
  test('обратная конвертация из PDF-координат в холст', () => {
    const zone = { x: 100, y: 400, width: 200, height: 20 }
    const scaleX = 900 / 595
    const scaleY = 1200 / 842
    const result = pdfToCanvas(zone, canvasSize, pdfSize)
    expect(result.x).toBeCloseTo(100 * scaleX)
    expect(result.y).toBeCloseTo((842 - 400 - 20) * scaleY)
    expect(result.width).toBeCloseTo(200 * scaleX)
    expect(result.height).toBeCloseTo(20 * scaleY)
  })

  test('canvasToPdf и pdfToCanvas — взаимно обратные функции', () => {
    const original = { x: 300, y: 200, width: 150, height: 30 }
    const pdf = canvasToPdf(original, canvasSize, pdfSize)
    const back = pdfToCanvas(pdf, canvasSize, pdfSize)
    expect(back.x).toBeCloseTo(original.x)
    expect(back.y).toBeCloseTo(original.y)
    expect(back.width).toBeCloseTo(original.width)
    expect(back.height).toBeCloseTo(original.height)
  })
})
```

- [ ] **Шаг 2: Убедиться что тест падает**

```bash
npm test
```

Ожидаемый результат: ошибка `Cannot find module '../../src/renderer/utils/coordinates.js'`

- [ ] **Шаг 3: Создать src/renderer/utils/coordinates.js**

```js
export function canvasToPdf(zone, canvasSize, pdfSize) {
  const scaleX = pdfSize.width / canvasSize.width
  const scaleY = pdfSize.height / canvasSize.height
  return {
    x: zone.x * scaleX,
    y: pdfSize.height - (zone.y + zone.height) * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}

export function pdfToCanvas(zone, canvasSize, pdfSize) {
  const scaleX = canvasSize.width / pdfSize.width
  const scaleY = canvasSize.height / pdfSize.height
  return {
    x: zone.x * scaleX,
    y: (pdfSize.height - zone.y - zone.height) * scaleY,
    width: zone.width * scaleX,
    height: zone.height * scaleY,
  }
}
```

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
npm test
```

Ожидаемый результат: `5 passed`

- [ ] **Шаг 5: Коммит**

```bash
git add src/renderer/utils/coordinates.js tests/utils/coordinates.test.js
git commit -m "feat: coordinate transform utils (canvas ↔ PDF points)"
```

---

## Задача 3: Утилиты чтения Excel

**Файлы:**
- Создать: `src/renderer/utils/excel.js`
- Создать: `tests/utils/excel.test.js`

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/utils/excel.test.js`:

```js
import * as XLSX from 'xlsx'
import { readExcel } from '../../src/renderer/utils/excel.js'

function makeExcelBuffer(rows) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

describe('readExcel', () => {
  test('возвращает заголовки столбцов', () => {
    const buffer = makeExcelBuffer([
      { Имя: 'Иван', Фамилия: 'Петров' },
      { Имя: 'Анна', Фамилия: 'Сидорова' },
    ])
    const { columns } = readExcel(buffer)
    expect(columns).toEqual(['Имя', 'Фамилия'])
  })

  test('возвращает строки данных', () => {
    const buffer = makeExcelBuffer([
      { Имя: 'Иван', Фамилия: 'Петров' },
      { Имя: 'Анна', Фамилия: 'Сидорова' },
    ])
    const { rows } = readExcel(buffer)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ Имя: 'Иван', Фамилия: 'Петров' })
    expect(rows[1]).toEqual({ Имя: 'Анна', Фамилия: 'Сидорова' })
  })

  test('пустой файл возвращает пустые columns и rows', () => {
    const buffer = makeExcelBuffer([])
    const { columns, rows } = readExcel(buffer)
    expect(columns).toEqual([])
    expect(rows).toEqual([])
  })
})
```

- [ ] **Шаг 2: Убедиться что тест падает**

```bash
npm test
```

Ожидаемый результат: ошибка `Cannot find module '../../src/renderer/utils/excel.js'`

- [ ] **Шаг 3: Создать src/renderer/utils/excel.js**

```js
import * as XLSX from 'xlsx'

export function readExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { columns, rows }
}
```

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
npm test
```

Ожидаемый результат: `8 passed` (5 из задачи 2 + 3 новых)

- [ ] **Шаг 5: Коммит**

```bash
git add src/renderer/utils/excel.js tests/utils/excel.test.js
git commit -m "feat: Excel reading utility with SheetJS"
```

---

## Задача 4: IPC и хранение проектов

**Файлы:**
- Создать: `src/main/ipc.js`
- Заменить: `src/preload.js`
- Изменить: `src/main.js`
- Изменить: `forge.config.js`

- [ ] **Шаг 1: Обновить forge.config.js — добавить extraResource для шрифтов**

Открыть `forge.config.js` и добавить в `packagerConfig`:

```js
packagerConfig: {
  asar: true,
  extraResource: ['public/fonts'],
},
```

- [ ] **Шаг 2: Создать src/main/ipc.js**

```js
const { ipcMain, dialog, app } = require('electron')
const fs = require('fs')
const path = require('path')

const PROJECTS_DIR = path.join(app.getPath('documents'), 'BadgeGenerator')

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  }
}

function getFontsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'fonts')
  }
  return path.join(app.getAppPath(), 'public', 'fonts')
}

ipcMain.handle('projects:list', () => {
  ensureProjectsDir()
  return fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
})

ipcMain.handle('projects:create', (_, name) => {
  ensureProjectsDir()
  const projectDir = path.join(PROJECTS_DIR, name)
  fs.mkdirSync(projectDir, { recursive: true })
  const project = {
    version: 1,
    name,
    templatePdfPath: null,
    excelPath: null,
    columns: [],
    zones: [],
  }
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
  return project
})

ipcMain.handle('projects:load', (_, name) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
})

ipcMain.handle('projects:save', (_, name, data) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
})

ipcMain.handle('dialog:open', async (_, filters) => {
  const result = await dialog.showOpenDialog({ filters, properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:save', async (_, filters) => {
  const result = await dialog.showSaveDialog({ filters })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('fs:readBytes', (_, filePath) => {
  return fs.readFileSync(filePath)
})

ipcMain.handle('fs:writeBytes', (_, filePath, data) => {
  fs.writeFileSync(filePath, Buffer.from(data))
})

ipcMain.handle('fs:exists', (_, filePath) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('fonts:loadAll', () => {
  const dir = getFontsDir()
  return {
    roboto: Array.from(fs.readFileSync(path.join(dir, 'Roboto-Regular.ttf'))),
    ptSerif: Array.from(fs.readFileSync(path.join(dir, 'PTSerif-Regular.ttf'))),
  }
})
```

Примечание: `Array.from` нужен потому что Buffer не сериализуется через IPC — передаём как обычный массив чисел, в рендерере оборачиваем в `Uint8Array`.

- [ ] **Шаг 3: Заменить src/preload.js**

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listProjects:  ()             => ipcRenderer.invoke('projects:list'),
  createProject: (name)         => ipcRenderer.invoke('projects:create', name),
  loadProject:   (name)         => ipcRenderer.invoke('projects:load', name),
  saveProject:   (name, data)   => ipcRenderer.invoke('projects:save', name, data),
  openFileDialog:(filters)      => ipcRenderer.invoke('dialog:open', filters),
  saveFileDialog:(filters)      => ipcRenderer.invoke('dialog:save', filters),
  readFileBytes: (filePath)     => ipcRenderer.invoke('fs:readBytes', filePath),
  writeFileBytes:(filePath, d)  => ipcRenderer.invoke('fs:writeBytes', filePath, d),
  fileExists:    (filePath)     => ipcRenderer.invoke('fs:exists', filePath),
  loadFonts:     ()             => ipcRenderer.invoke('fonts:loadAll'),
})
```

- [ ] **Шаг 4: Обновить src/main.js — импортировать ipc.js**

Открыть `src/main.js`. Найти первую строку с `require` или `import`. Добавить после неё:

```js
require('./main/ipc')
```

- [ ] **Шаг 5: Проверить что приложение запускается без ошибок**

```bash
npm start
```

Ожидаемый результат: окно Electron открылось, консоль DevTools без ошибок. В DevTools выполнить `await window.api.listProjects()` → должен вернуть пустой массив `[]`.

- [ ] **Шаг 6: Коммит**

```bash
git add src/main/ipc.js src/preload.js src/main.js forge.config.js
git commit -m "feat: IPC handlers for project storage, file dialogs, and fonts"
```

---

## Задача 5: HomeScreen — экран списка проектов

**Файлы:**
- Изменить: `src/renderer/App.jsx`
- Создать: `src/renderer/screens/HomeScreen.jsx`

- [ ] **Шаг 1: Создать src/renderer/screens/HomeScreen.jsx**

```jsx
import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export default function HomeScreen({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.listProjects().then(setProjects)
  }, [])

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

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Badge Generator</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 3 }}
      >
        Новый проект
      </Button>

      {projects.length === 0 && (
        <Typography color="text.secondary">Проектов пока нет</Typography>
      )}

      <List>
        {projects.map(name => (
          <ListItem key={name} disablePadding>
            <ListItemButton onClick={() => handleOpen(name)}>
              <ListItemText primary={name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

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
    </Box>
  )
}
```

- [ ] **Шаг 2: Обновить src/renderer/App.jsx**

```jsx
import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import HomeScreen from './screens/HomeScreen'

const theme = createTheme()

export default function App() {
  const [project, setProject] = useState(null)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomeScreen onOpenProject={setProject} />
    </ThemeProvider>
  )
}
```

Примечание: Editor подключим в Задаче 9. Пока всегда показываем HomeScreen.

- [ ] **Шаг 3: Запустить и проверить HomeScreen**

```bash
npm start
```

Ожидаемый результат:
- Отображается заголовок «Badge Generator»
- Кнопка «Новый проект»
- Клик → открывается диалог с полем ввода
- Ввести название, нажать «Создать» → диалог закрывается (проект создаётся, но Editor ещё не показывается)
- Перезапустить приложение → созданный проект появляется в списке

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/App.jsx src/renderer/screens/HomeScreen.jsx
git commit -m "feat: HomeScreen with project list and create dialog"
```

---

## Задача 6: PDFViewer — рендеринг PDF

**Файлы:**
- Создать: `src/renderer/components/PDFViewer.jsx`

- [ ] **Шаг 1: Создать src/renderer/components/PDFViewer.jsx**

```jsx
import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export default function PDFViewer({ pdfPath, zones, onZonesChange }) {
  const canvasRef = useRef(null)
  const [sizes, setSizes] = useState(null) // { canvas, pdf }

  useEffect(() => {
    if (!pdfPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(pdfPath)
      if (cancelled) return
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      setSizes({
        canvas: { width: viewport.width, height: viewport.height },
        pdf: { width: page.view[2], height: page.view[3] },
      })
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }

    render()
    return () => { cancelled = true }
  }, [pdfPath])

  if (!pdfPath) {
    return (
      <Box sx={{ p: 4, color: 'text.secondary' }}>
        <Typography>Загрузите PDF-шаблон</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  )
}
```

- [ ] **Шаг 2: Временно добавить PDFViewer в App.jsx для проверки**

Открыть `src/renderer/App.jsx`. Под `<HomeScreen .../>` добавить временный тест (заменим в задаче 9):

Ничего менять не нужно — просто запустить и проверить в следующем шаге после создания проекта. Переходим к проверке.

- [ ] **Шаг 3: Проверить рендеринг PDF (ручной тест)**

```bash
npm start
```

Создать тестовый проект через HomeScreen. В DevTools выполнить:

```js
// Проверяем что pdf.js загружается без ошибок
console.log(window.pdfjsLib) // undefined — это ок, pdfjsLib не в window
```

В консоли не должно быть ошибок при старте. Рендеринг PDF проверим в задаче 9 после подключения Editor.

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/components/PDFViewer.jsx
git commit -m "feat: PDFViewer renders first page via pdf.js"
```

---

## Задача 7: SVG-оверлей и рисование зон

**Файлы:**
- Создать: `src/renderer/components/ZoneRect.jsx`
- Изменить: `src/renderer/components/PDFViewer.jsx`

- [ ] **Шаг 1: Создать src/renderer/components/ZoneRect.jsx**

```jsx
export default function ZoneRect({ zone, isSelected, onClick }) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={zone.canvasX}
        y={zone.canvasY}
        width={zone.canvasWidth}
        height={zone.canvasHeight}
        fill="rgba(25, 118, 210, 0.15)"
        stroke={isSelected ? '#1976d2' : '#1976d280'}
        strokeWidth={isSelected ? 2 : 1}
      />
      <text
        x={zone.canvasX + 4}
        y={zone.canvasY + 14}
        fontSize={12}
        fill="#1976d2"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {zone.label}
      </text>
    </g>
  )
}
```

- [ ] **Шаг 2: Обновить src/renderer/components/PDFViewer.jsx — добавить SVG-оверлей и рисование**

Заменить содержимое файла полностью:

```jsx
import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import * as pdfjsLib from 'pdfjs-dist'
import ZoneRect from './ZoneRect'
import { canvasToPdf, pdfToCanvas } from '../utils/coordinates'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export default function PDFViewer({ pdfPath, zones, onZonesChange, selectedZoneId, onSelectZone }) {
  const canvasRef = useRef(null)
  const [sizes, setSizes] = useState(null)
  const [drawing, setDrawing] = useState(null)

  useEffect(() => {
    if (!pdfPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(pdfPath)
      if (cancelled) return
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      setSizes({
        canvas: { width: viewport.width, height: viewport.height },
        pdf: { width: page.view[2], height: page.view[3] },
      })
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }

    render()
    return () => { cancelled = true }
  }, [pdfPath])

  function getSvgPos(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e) {
    if (!sizes) return
    const pos = getSvgPos(e)
    setDrawing({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }

  function handleMouseMove(e) {
    if (!drawing) return
    const pos = getSvgPos(e)
    setDrawing(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }

  function handleMouseUp() {
    if (!drawing || !sizes) return
    const x = Math.min(drawing.startX, drawing.currentX)
    const y = Math.min(drawing.startY, drawing.currentY)
    const w = Math.abs(drawing.currentX - drawing.startX)
    const h = Math.abs(drawing.currentY - drawing.startY)
    setDrawing(null)
    if (w < 5 || h < 5) return

    const pdfCoords = canvasToPdf({ x, y, width: w, height: h }, sizes.canvas, sizes.pdf)
    const newZone = {
      id: crypto.randomUUID(),
      label: `Зона ${zones.length + 1}`,
      ...pdfCoords,
      column: '',
      font: 'Roboto',
      fontSize: 12,
    }
    onZonesChange([...zones, newZone])
  }

  function toCanvasCoords(zone) {
    if (!sizes) return null
    const c = pdfToCanvas(zone, sizes.canvas, sizes.pdf)
    return { canvasX: c.x, canvasY: c.y, canvasWidth: c.width, canvasHeight: c.height }
  }

  const drawingRect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.currentX),
        y: Math.min(drawing.startY, drawing.currentY),
        w: Math.abs(drawing.currentX - drawing.startX),
        h: Math.abs(drawing.currentY - drawing.startY),
      }
    : null

  if (!pdfPath) {
    return (
      <Box sx={{ p: 4, color: 'text.secondary' }}>
        <Typography>Загрузите PDF-шаблон</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {sizes && (
        <svg
          style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
          width={sizes.canvas.width}
          height={sizes.canvas.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {zones.map(zone => {
            const coords = toCanvasCoords(zone)
            if (!coords) return null
            return (
              <ZoneRect
                key={zone.id}
                zone={{ ...zone, ...coords }}
                isSelected={zone.id === selectedZoneId}
                onClick={e => { e.stopPropagation(); onSelectZone(zone.id) }}
              />
            )
          })}
          {drawingRect && (
            <rect
              x={drawingRect.x} y={drawingRect.y}
              width={drawingRect.w} height={drawingRect.h}
              fill="rgba(25, 118, 210, 0.1)"
              stroke="#1976d2"
              strokeWidth={1}
              strokeDasharray="4"
            />
          )}
        </svg>
      )}
    </Box>
  )
}
```

- [ ] **Шаг 3: Коммит**

```bash
git add src/renderer/components/ZoneRect.jsx src/renderer/components/PDFViewer.jsx
git commit -m "feat: SVG overlay with zone drawing (mousedown drag)"
```

---

## Задача 8: ZoneList — боковая панель зон

**Файлы:**
- Создать: `src/renderer/components/ZoneList.jsx`

- [ ] **Шаг 1: Создать src/renderer/components/ZoneList.jsx**

```jsx
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
                <InputLabel>Столбец</InputLabel>
                <Select
                  value={zone.column}
                  label="Столбец"
                  onChange={e => updateZone(zone.id, { column: e.target.value })}
                  displayEmpty
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
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/renderer/components/ZoneList.jsx
git commit -m "feat: ZoneList sidebar with column and font selectors"
```

---

## Задача 9: Editor — сборка, загрузка файлов, автосохранение

**Файлы:**
- Создать: `src/renderer/screens/Editor.jsx`
- Изменить: `src/renderer/App.jsx`

- [ ] **Шаг 1: Создать src/renderer/screens/Editor.jsx**

```jsx
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
```

- [ ] **Шаг 2: Обновить src/renderer/App.jsx — добавить роутинг на Editor**

```jsx
import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import HomeScreen from './screens/HomeScreen'
import Editor from './screens/Editor'

const theme = createTheme()

export default function App() {
  const [project, setProject] = useState(null)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {project
        ? <Editor project={project} onProjectUpdate={setProject} onBack={() => setProject(null)} />
        : <HomeScreen onOpenProject={setProject} />
      }
    </ThemeProvider>
  )
}
```

- [ ] **Шаг 3: Запустить и проверить полный флоу (без генерации)**

```bash
npm start
```

Проверить:
1. HomeScreen → «Новый проект» → ввести название → открывается Editor
2. В Editor нажать кнопку «PDF не загружен» → открывается диалог → выбрать PDF → имя файла появляется в кнопке
3. PDF отображается в левой части
4. Нажать «Excel не загружен» → выбрать xlsx → в ZoneList показываются столбцы в дропдауне
5. Нарисовать зону на PDF мышью → появляется прямоугольник и запись в ZoneList
6. Выбрать столбец в ZoneList → кнопка «Генерировать» активируется
7. Нажать стрелку назад → HomeScreen → созданный проект в списке → открыть → данные восстановились

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/screens/Editor.jsx src/renderer/App.jsx
git commit -m "feat: Editor with PDF/Excel loading, zone drawing, autosave"
```

---

## Задача 10: Генерация PDF

**Файлы:**
- Создать: `src/renderer/utils/generator.js`
- Создать: `tests/utils/generator.test.js`
- Изменить: `src/renderer/screens/Editor.jsx`

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/utils/generator.test.js`:

```js
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { generatePdf } from '../../src/renderer/utils/generator.js'

async function makeTemplatePdf() {
  const doc = await PDFDocument.create()
  doc.addPage([595, 842])
  return doc.save()
}

function loadFont(name) {
  return Array.from(readFileSync(join(process.cwd(), 'public', 'fonts', name)))
}

describe('generatePdf', () => {
  test('возвращает непустой Uint8Array', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }]

    const result = await generatePdf({ templateBytes, fontBytes, zones, rows })

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  test('количество страниц равно количеству строк Excel', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: 'Иван' }, { Имя: 'Анна' }, { Имя: 'Пётр' }]

    const result = await generatePdf({ templateBytes, fontBytes, zones, rows })
    const doc = await PDFDocument.load(result)

    expect(doc.getPageCount()).toBe(3)
  })

  test('пустые ячейки не вызывают ошибку', async () => {
    const templateBytes = await makeTemplatePdf()
    const fontBytes = {
      roboto: loadFont('Roboto-Regular.ttf'),
      ptSerif: loadFont('PTSerif-Regular.ttf'),
    }
    const zones = [{ id: '1', x: 100, y: 700, width: 200, height: 20, column: 'Имя', font: 'Roboto', fontSize: 12 }]
    const rows = [{ Имя: '' }, { }]

    await expect(generatePdf({ templateBytes, fontBytes, zones, rows })).resolves.toBeDefined()
  })
})
```

- [ ] **Шаг 2: Убедиться что тест падает**

```bash
npm test
```

Ожидаемый результат: ошибка `Cannot find module '../../src/renderer/utils/generator.js'`

- [ ] **Шаг 3: Создать src/renderer/utils/generator.js**

```js
import { PDFDocument } from 'pdf-lib'

export async function generatePdf({ templateBytes, fontBytes, zones, rows, onProgress }) {
  const templateDoc = await PDFDocument.load(new Uint8Array(templateBytes))
  const outputDoc = await PDFDocument.create()

  const robotoFont = await outputDoc.embedFont(new Uint8Array(fontBytes.roboto))
  const ptSerifFont = await outputDoc.embedFont(new Uint8Array(fontBytes.ptSerif))
  const fonts = { Roboto: robotoFont, PTSerif: ptSerifFont }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const [page] = await outputDoc.copyPages(templateDoc, [0])
    outputDoc.addPage(page)

    for (const zone of zones) {
      const value = row[zone.column]
      if (value == null || value === '') continue
      page.drawText(String(value), {
        x: zone.x,
        y: zone.y,
        size: zone.fontSize,
        font: fonts[zone.font] ?? robotoFont,
      })
    }

    onProgress?.(i + 1, rows.length)
  }

  return outputDoc.save()
}
```

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
npm test
```

Ожидаемый результат: `11 passed` (все предыдущие + 3 новых)

- [ ] **Шаг 5: Подключить генерацию в Editor.jsx**

Открыть `src/renderer/screens/Editor.jsx`.

Добавить импорт вверху:

```js
import { generatePdf } from '../utils/generator'
import { useState } from 'react' // уже есть
```

Добавить состояние после существующих `useState`:

```js
const [generating, setGenerating] = useState(false)
const [genProgress, setGenProgress] = useState(0)
```

Заменить `async function handleGenerate` (сейчас это `onClick={() => {}}`):

Найти строку:
```jsx
onClick={() => {}}
```

И заменить на:
```jsx
onClick={handleGenerate}
```

Добавить функцию `handleGenerate` в тело компонента перед `return`:

```js
async function handleGenerate() {
  if (generating) return
  setGenerating(true)
  setGenProgress(0)
  try {
    const templateBytes = await window.api.readFileBytes(project.templatePdfPath)
    const excelBytes = await window.api.readFileBytes(project.excelPath)
    const fontBytes = await window.api.loadFonts()
    const { rows } = readExcel(Buffer.from(excelBytes))

    const pdfBytes = await generatePdf({
      templateBytes,
      fontBytes,
      zones: project.zones,
      rows,
      onProgress: (done, total) => setGenProgress(Math.round((done / total) * 100)),
    })

    const savePath = await window.api.saveFileDialog([{ name: 'PDF', extensions: ['pdf'] }])
    if (savePath) {
      await window.api.writeFileBytes(savePath, Array.from(pdfBytes))
      setSnackbar(`Сохранено: ${savePath.split(/[\\/]/).pop()}`)
    }
  } catch (err) {
    setSnackbar(`Ошибка: ${err.message}`)
  } finally {
    setGenerating(false)
    setGenProgress(0)
  }
}
```

Добавить прогресс-бар под `<Toolbar>`. Найти строку `</AppBar>` и вставить перед ней:

```jsx
{generating && (
  <Box sx={{ px: 2, py: 0.5, bgcolor: 'primary.main' }}>
    <Typography variant="caption" color="white">
      Генерация... {genProgress}%
    </Typography>
  </Box>
)}
```

- [ ] **Шаг 6: Финальная проверка полного флоу**

```bash
npm start
```

Проверить:
1. Открыть проект → загрузить PDF → загрузить Excel
2. Нарисовать 2 зоны → привязать к столбцам
3. Нажать «Генерировать» → открывается диалог «Сохранить как»
4. Выбрать путь → появляется snackbar «Сохранено: ...»
5. Открыть сохранённый PDF — должны быть N страниц с текстом в зонах

- [ ] **Шаг 7: Коммит**

```bash
git add src/renderer/utils/generator.js tests/utils/generator.test.js src/renderer/screens/Editor.jsx
git commit -m "feat: PDF generation with pdf-lib, bundled Cyrillic fonts, progress indicator"
```

---

## Итоговая проверка

После завершения всех задач:

```bash
npm test
```

Ожидаемый результат: `11 passed` — все тесты проходят.

```bash
npm start
```

Пройти полный сценарий: создать проект → загрузить PDF и Excel → разметить зоны → генерировать → проверить итоговый PDF.
