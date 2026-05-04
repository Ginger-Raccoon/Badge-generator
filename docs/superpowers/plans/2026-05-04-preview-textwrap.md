# План реализации: предпросмотр и перенос текста (под-проект B)

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ НАВ-СКИЛЛ: используй superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для выполнения плана задача за задачей. Шаги используют синтаксис чекбоксов (`- [ ]`) для отслеживания прогресса.

**Цель:** Добавить перенос текста по словам с вертикальным центрированием в PDF-генератор и живой предпросмотр текста прямо в редакторе — с выбором строки Excel.

**Архитектура:** Новый файл `textLayout.js` с чистой функцией `wrapText` используется в двух местах: в генераторе (метрики pdf-lib) и в PSDViewer (метрики Canvas 2D). Editor.jsx хранит строки Excel и индекс предпросмотра, передаёт `previewRow` и `dpi` в PSDViewer. PSDViewer загружает шрифты через FontFace API и рендерит текст как SVG `<text>/<tspan>`.

**Стек:** Vitest (тесты textLayout), pdf-lib widthOfTextAtSize (генератор), Canvas 2D measureText + FontFace API (превью), React useState/useRef/useEffect, MUI IconButton/TextField.

---

### Задача 1: Утилита переноса текста — textLayout.js (TDD)

**Файлы:**
- Создать: `src/renderer/utils/textLayout.js`
- Создать: `tests/utils/textLayout.test.js`

- [ ] **Шаг 1: Написать падающие тесты**

Создать `tests/utils/textLayout.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/renderer/utils/textLayout.js'

// measureFn: длина строки в символах (каждый символ = 1 единица)
const measure = (str) => str.length

describe('wrapText', () => {
  it('возвращает одну строку если текст помещается', () => {
    expect(wrapText('hello world', 20, 12, measure)).toEqual(['hello world'])
  })

  it('переносит по границе слова', () => {
    expect(wrapText('hello world', 5, 12, measure)).toEqual(['hello', 'world'])
  })

  it('одно слово шире maxWidth — всё равно отдельная строка', () => {
    expect(wrapText('verylongword', 5, 12, measure)).toEqual(['verylongword'])
  })

  it('несколько слов — корректный перенос', () => {
    expect(wrapText('one two three four', 7, 12, measure)).toEqual(['one two', 'three', 'four'])
  })

  it('точная граница ширины — помещается в одну строку', () => {
    // 'abc def'.length === 7 === maxWidth
    expect(wrapText('abc def', 7, 12, measure)).toEqual(['abc def'])
  })
})
```

- [ ] **Шаг 2: Убедиться что тесты падают**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test -- tests/utils/textLayout.test.js
```
Ожидаемый результат: ошибка `Cannot find module '../../src/renderer/utils/textLayout.js'`

- [ ] **Шаг 3: Реализовать wrapText**

Создать `src/renderer/utils/textLayout.js`:

```js
export function wrapText(text, maxWidth, fontSize, measureFn) {
  const words = String(text).split(' ')
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measureFn(candidate, fontSize) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}
```

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
npm test -- tests/utils/textLayout.test.js
```
Ожидаемый результат: 5 passed, 0 failed.

- [ ] **Шаг 5: Прогнать все тесты**

```bash
npm test
```
Ожидаемый результат: 15 passed (10 старых + 5 новых), 0 failed.

- [ ] **Шаг 6: Коммит**

```bash
git add src/renderer/utils/textLayout.js tests/utils/textLayout.test.js
git commit -m "feat: утилита wrapText для переноса текста по словам"
```

---

### Задача 2: Перенос и вертикальное центрирование в PDF — generator.js

**Файлы:**
- Изменить: `src/renderer/utils/generator.js`

Существующие 3 теста генератора должны пройти после изменений (они тестируют структуру PDF, не точное расположение текста).

- [ ] **Шаг 1: Добавить импорт wrapText**

В начало `src/renderer/utils/generator.js` добавить:

```js
import { wrapText } from './textLayout.js'
```

- [ ] **Шаг 2: Заменить блок рисования текста**

В `generator.js` найти цикл `for (const zone of zones)` и заменить его содержимое:

```js
// Было:
for (const zone of zones) {
  const value = row[zone.column]
  if (value == null || value === '') continue
  page.drawText(String(value), {
    x: zone.x * scale,
    y: pageHeight - (zone.y + zone.height) * scale,
    size: zone.fontSize,
    font: fonts[zone.font] ?? robotoFont,
  })
}
```

```js
// Стало:
for (const zone of zones) {
  const value = row[zone.column]
  if (value == null || value === '') continue
  const font = fonts[zone.font] ?? robotoFont
  const maxWidthPt = zone.width * (72 / dpi)
  const lines = wrapText(String(value), maxWidthPt, zone.fontSize, (str, size) => font.widthOfTextAtSize(str, size))
  const lineHeight = zone.fontSize * 1.2
  const totalHeight = (lines.length - 1) * lineHeight + zone.fontSize
  const zoneCenterY = pageHeight - (zone.y + zone.height / 2) * scale
  const firstBaselineY = zoneCenterY + totalHeight / 2 - zone.fontSize

  lines.forEach((line, i) => {
    page.drawText(line, {
      x: zone.x * scale,
      y: firstBaselineY - i * lineHeight,
      size: zone.fontSize,
      font,
    })
  })
}
```

- [ ] **Шаг 3: Прогнать все тесты**

```bash
npm test
```
Ожидаемый результат: 15 passed, 0 failed.

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/utils/generator.js
git commit -m "feat: перенос текста и вертикальное центрирование в PDF-генераторе"
```

---

### Задача 3: Выбор строки предпросмотра — Editor.jsx

**Файлы:**
- Изменить: `src/renderer/screens/Editor.jsx`

Новых тестов нет — UI.

- [ ] **Шаг 1: Добавить импорты иконок**

В `src/renderer/screens/Editor.jsx` добавить два импорта после строки с `ArrowBackIcon`:

```js
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
```

- [ ] **Шаг 2: Добавить состояния rows и previewRowIndex**

В теле компонента после существующих `useState` добавить:

```js
const [rows, setRows] = useState([])
const [previewRowIndex, setPreviewRowIndex] = useState(0)
```

- [ ] **Шаг 3: Обновить handleLoadExcel — сохранять строки**

Найти в `handleLoadExcel`:
```js
const { columns } = readExcel(new Uint8Array(bytes))
await save({ ...project, excelPath: filePath, columns })
setSnackbar({ message: `Загружено ${columns.length} столбцов`, severity: 'success' })
```

Заменить на:
```js
const { columns, rows: loadedRows } = readExcel(new Uint8Array(bytes))
await save({ ...project, excelPath: filePath, columns })
setRows(loadedRows)
setPreviewRowIndex(0)
setSnackbar({ message: `Загружено ${columns.length} столбцов`, severity: 'success' })
```

- [ ] **Шаг 4: Добавить производное значение previewRow**

После блока `const canGenerate = ...` добавить:

```js
const previewRow = rows[previewRowIndex] ?? null
const dpi = project.templateDpi ?? parsedPsd?.resolution ?? null
```

- [ ] **Шаг 5: Добавить виджет выбора строки**

Найти JSX левой колонки (содержит PSDViewer):
```jsx
<Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#e0e0e0', display: 'flex', justifyContent: 'center', p: 2 }}>
  <PSDViewer
```

Заменить на:
```jsx
<Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#e0e0e0' }}>
  {rows.length > 0 && (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
      <IconButton size="small" disabled={previewRowIndex === 0} onClick={() => setPreviewRowIndex(i => i - 1)}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <TextField
        size="small"
        value={previewRowIndex + 1}
        onChange={e => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) setPreviewRowIndex(Math.max(0, Math.min(rows.length - 1, v - 1)))
        }}
        inputProps={{ min: 1, max: rows.length, style: { textAlign: 'center', width: 40 } }}
        sx={{ width: 60 }}
      />
      <Typography variant="body2" color="text.secondary">/ {rows.length}</Typography>
      <IconButton size="small" disabled={previewRowIndex === rows.length - 1} onClick={() => setPreviewRowIndex(i => i + 1)}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  )}
  <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', p: 2 }}>
    <PSDViewer
```

Также закрыть оба Box'а после `</PSDViewer>`:
```jsx
    </PSDViewer>
  </Box>
</Box>
```

- [ ] **Шаг 6: Передать previewRow и dpi в PSDViewer**

В JSX `<PSDViewer` добавить два пропа:
```jsx
previewRow={previewRow}
dpi={dpi}
```

- [ ] **Шаг 7: Прогнать тесты**

```bash
npm test
```
Ожидаемый результат: 15 passed, 0 failed.

- [ ] **Шаг 8: Коммит**

```bash
git add src/renderer/screens/Editor.jsx
git commit -m "feat: выбор строки предпросмотра в Editor"
```

---

### Задача 4: Предпросмотр текста в редакторе — PSDViewer.jsx

**Файлы:**
- Изменить: `src/renderer/components/PSDViewer.jsx`

Новых тестов нет — UI/browser.

- [ ] **Шаг 1: Добавить импорт wrapText**

В начало `src/renderer/components/PSDViewer.jsx` добавить:

```js
import { wrapText } from '../utils/textLayout'
```

- [ ] **Шаг 2: Добавить новые пропы в сигнатуру**

Найти:
```js
export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed }) {
```

Заменить на:
```js
export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi }) {
```

- [ ] **Шаг 3: Добавить состояние и рефы для шрифтов**

После существующих `useRef` и `useState` добавить:

```js
const fontsRef = useRef({})
const measureCanvasRef = useRef(document.createElement('canvas'))
const [fontsReady, setFontsReady] = useState(false)
```

- [ ] **Шаг 4: Добавить useEffect загрузки шрифтов**

После существующего `useEffect` (который рендерит PSD), добавить новый:

```js
useEffect(() => {
  async function loadFonts() {
    const fontBytes = await window.api.loadFonts()
    const entries = [
      ['Roboto', fontBytes.roboto, 'Roboto-preview'],
      ['PTSerif', fontBytes.ptSerif, 'PTSerif-preview'],
    ]
    for (const [name, bytes, family] of entries) {
      const face = new FontFace(family, bytes)
      await face.load()
      document.fonts.add(face)
      fontsRef.current[name] = family
    }
    setFontsReady(true)
  }
  loadFonts()
}, [])
```

- [ ] **Шаг 5: Добавить helper measureText**

После `getSvgPos` добавить:

```js
function measureText(text, fontSize, fontFamily) {
  const ctx = measureCanvasRef.current.getContext('2d')
  ctx.font = `${fontSize}px '${fontFamily}'`
  return ctx.measureText(text).width
}
```

- [ ] **Шаг 6: Добавить helper getPreviewLines**

После `measureText` добавить:

```js
function getPreviewLines(zone, coords) {
  if (!fontsReady || !previewRow || !zone.column || !dpi || !sizes) return null
  const value = previewRow[zone.column]
  if (value == null || value === '') return null
  const fontFamily = fontsRef.current[zone.font] ?? fontsRef.current['Roboto']
  if (!fontFamily) return null
  const displayScale = sizes.canvas.width / sizes.psd.width
  const svgFontSize = zone.fontSize * (dpi / 72) * displayScale
  const lines = wrapText(String(value), coords.canvasWidth, svgFontSize, (str, size) => measureText(str, size, fontFamily))
  const lineHeight = svgFontSize * 1.2
  const totalHeight = (lines.length - 1) * lineHeight + svgFontSize
  const startY = coords.canvasY + (coords.canvasHeight - totalHeight) / 2 + svgFontSize
  return { fontFamily, fontSize: svgFontSize, lines, lineHeight, startY }
}
```

- [ ] **Шаг 7: Обновить рендер зон — добавить превью текст**

Найти в JSX:
```jsx
{zones.map(zone => {
  const liveZone = (interaction && interaction.zoneId === zone.id)
    ? { ...zone, ...computeLiveZone(zone, interaction) }
    : zone
  const coords = toCanvasCoords(liveZone)
  if (!coords) return null
  return (
    <ZoneRect
      key={zone.id}
      zone={{ ...liveZone, ...coords }}
      isSelected={zone.id === selectedZoneId}
      onMoveStart={e => handleMoveStart(e, zone)}
      onResizeStart={(e, corner) => handleResizeStart(e, zone, corner)}
    />
  )
})}
```

Заменить на:
```jsx
{zones.map(zone => {
  const liveZone = (interaction && interaction.zoneId === zone.id)
    ? { ...zone, ...computeLiveZone(zone, interaction) }
    : zone
  const coords = toCanvasCoords(liveZone)
  if (!coords) return null
  const preview = getPreviewLines(zone, coords)
  return (
    <g key={zone.id}>
      <ZoneRect
        zone={{ ...liveZone, ...coords }}
        isSelected={zone.id === selectedZoneId}
        onMoveStart={e => handleMoveStart(e, zone)}
        onResizeStart={(e, corner) => handleResizeStart(e, zone, corner)}
      />
      {preview && (
        <text
          fontFamily={preview.fontFamily}
          fontSize={preview.fontSize}
          fill="#222"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {preview.lines.map((line, i) => (
            <tspan key={i} x={coords.canvasX + 2} y={preview.startY + i * preview.lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
})}
```

- [ ] **Шаг 8: Прогнать тесты**

```bash
npm test
```
Ожидаемый результат: 15 passed, 0 failed.

- [ ] **Шаг 9: Коммит**

```bash
git add src/renderer/components/PSDViewer.jsx
git commit -m "feat: предпросмотр текста с переносом в редакторе"
```
