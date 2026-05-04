# Дизайн: предпросмотр и перенос текста (под-проект B)

## Контекст

Текст в зонах сейчас рисуется одной строкой без переноса и без вертикального центрирования. Пользователь не видит, как будет выглядеть результат до генерации. Этот под-проект добавляет:
- Перенос текста по словам в зонах (и в PDF, и в превью)
- Вертикальное центрирование текстового блока в зоне
- Живой предпросмотр в редакторе — текст из выбранной строки Excel отображается прямо на canvas

---

## Архитектура

### Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/renderer/utils/textLayout.js` | Новый файл — утилита `wrapText` |
| `src/renderer/utils/generator.js` | Перенос + вертикальное центрирование в PDF |
| `src/renderer/screens/Editor.jsx` | Состояние `rows` + `previewRowIndex`, виджет выбора строки |
| `src/renderer/components/PSDViewer.jsx` | Загрузка шрифтов, рендер превью-текста в SVG |

---

## 1. Утилита переноса — textLayout.js

Единственный экспорт:

```js
export function wrapText(text, maxWidth, fontSize, measureFn)
// → string[]
```

- `maxWidth` — максимальная ширина строки в единицах измерения `measureFn`
- `fontSize` — размер шрифта (передаётся в `measureFn`)
- `measureFn(str, size)` — возвращает ширину строки в тех же единицах что и `maxWidth`

Логика:
1. Разбить `text` по пробелам на слова
2. Перебирать слова, добавляя к текущей строке: если `measureFn(candidate) <= maxWidth` — продолжать, иначе — зафиксировать строку, начать новую
3. Слово шире `maxWidth` — всё равно уходит отдельной строкой (форс)
4. Возвращает массив строк (минимум 1 элемент)

Функция чистая — тестируется в Vitest без DOM или pdf-lib.

---

## 2. Генератор — generator.js

Для каждой зоны вместо одного `page.drawText` — несколько:

```js
const maxWidthPt = zone.width * (72 / dpi)
const measureFn = (str, size) => font.widthOfTextAtSize(str, size)
const lines = wrapText(String(value), maxWidthPt, zone.fontSize, measureFn)
const lineHeight = zone.fontSize * 1.2
const totalHeight = (lines.length - 1) * lineHeight + zone.fontSize
const zoneCenterY = pageHeight - (zone.y + zone.height / 2) * scale
const firstBaselineY = zoneCenterY + totalHeight / 2 - zone.fontSize

lines.forEach((line, i) => {
  page.drawText(line, {
    x: zone.x * scale,
    y: firstBaselineY - i * lineHeight,
    size: zone.fontSize,
    font: fonts[zone.font] ?? robotoFont,
  })
})
```

В pdf-lib Y растёт вверх — сдвиг строк вниз = уменьшение Y на `lineHeight`.

---

## 3. Выбор строки превью — Editor.jsx

### Новое состояние

```js
const [rows, setRows] = useState([])
const [previewRowIndex, setPreviewRowIndex] = useState(0)
```

`rows` заполняется в `handleLoadExcel` (данные уже читаются через `readExcel`):
```js
const { columns, rows } = readExcel(new Uint8Array(bytes))
await save({ ...project, excelPath: filePath, columns })
setRows(rows)
```

Производное: `const previewRow = rows[previewRowIndex] ?? null`

### Виджет выбора строки

Рендерится над canvas-областью, только если `rows.length > 0`:

```
← [ 2 ] / 150 →
```

- `←` / `→` — `IconButton` (недоступны на первой/последней строке)
- Число — `TextField` size="small" шириной 60px, тип `number`, min=1, max=rows.length
- При вводе числа: `onChange` → парсит → клампит в [1, rows.length] → `setPreviewRowIndex(val - 1)`
- При клике стрелок: `setPreviewRowIndex(i => i ± 1)`

### Передача в PSDViewer

```jsx
<PSDViewer
  ...
  previewRow={previewRow}
  dpi={project.templateDpi ?? parsedPsd?.resolution ?? null}
/>
```

---

## 4. Превью в редакторе — PSDViewer.jsx

### Загрузка шрифтов

Один `useEffect` при монтировании загружает оба шрифта через FontFace API и добавляет в `document.fonts`. Результат сохраняется в `fontsRef` (ref, не state). После загрузки — `setFontsReady(true)` для первого рендера превью.

```js
const fontsRef = useRef({}) // { Roboto: 'Roboto-preview', PTSerif: 'PTSerif-preview' }
const [fontsReady, setFontsReady] = useState(false)

useEffect(() => {
  async function load() {
    const fontBytes = await window.api.loadFonts()
    for (const [name, bytes, key] of [
      ['Roboto', fontBytes.roboto, 'Roboto-preview'],
      ['PTSerif', fontBytes.ptSerif, 'PTSerif-preview'],
    ]) {
      const face = new FontFace(key, bytes)
      await face.load()
      document.fonts.add(face)
      fontsRef.current[name] = key
    }
    setFontsReady(true)
  }
  load()
}, [])
```

### Измерение ширины

Скрытый временный canvas (создаётся один раз в ref):

```js
const measureCanvas = useRef(document.createElement('canvas'))

function measureText(text, fontSize, fontFamily) {
  const ctx = measureCanvas.current.getContext('2d')
  ctx.font = `${fontSize}px '${fontFamily}'`
  return ctx.measureText(text).width
}
```

### Рендер превью-текста

Для каждой зоны, у которой `fontsReady && previewRow && zone.column && previewRow[zone.column]`:

```js
const fontFamily = fontsRef.current[zone.font] ?? fontsRef.current['Roboto']
const svgFontSize = zone.fontSize * (dpi / 72) * (sizes.canvas.width / sizes.psd.width)
const canvasZoneWidth = coords.canvasWidth
const measureFn = (str, size) => measureText(str, size, fontFamily)
const lines = wrapText(String(previewRow[zone.column]), canvasZoneWidth, svgFontSize, measureFn)
const lineHeight = svgFontSize * 1.2
const totalHeight = (lines.length - 1) * lineHeight + svgFontSize
const startY = coords.canvasY + (coords.canvasHeight - totalHeight) / 2 + svgFontSize
```

Рендер в SVG (внутри `<ZoneRect>` или рядом с ним в том же `zones.map`):

```jsx
<text
  fontFamily={fontFamily}
  fontSize={svgFontSize}
  fill="#333"
  style={{ pointerEvents: 'none', userSelect: 'none' }}
>
  {lines.map((line, i) => (
    <tspan key={i} x={coords.canvasX + 2} y={startY + i * lineHeight}>
      {line}
    </tspan>
  ))}
</text>
```

### Обработка отсутствия dpi

Если `dpi` равен `null` — превью текст не отображается (только прямоугольники зон). Случай редкий: DPI есть всегда после загрузки PSD.

---

## Тесты

| Файл | Тесты |
|------|-------|
| `src/renderer/utils/textLayout.test.js` | Vitest: wrap короткого текста, длинного слова, пустой строки, точная граница ширины |
| Остальные файлы | UI/browser — не тестируются в Vitest |

Существующие 10 тестов не затрагиваются.
