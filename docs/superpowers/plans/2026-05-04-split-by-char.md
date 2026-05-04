# Реализация под-проекта C: разбивка значения по символу

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ НАВ-СКИЛЛ: используй superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для выполнения плана задача за задачей. Шаги используют синтаксис чекбоксов (`- [ ]`) для отслеживания прогресса.

**Цель:** Добавить возможность разбивать значение ячейки Excel по символу-разделителю и показывать только нужную часть — с настройкой на уровне столбца и опциональным override на уровне зоны.

**Архитектура:** Чистая утилита `splitValue` в `textLayout.js` инкапсулирует всю логику разбивки. `generator.js` и `PSDViewer.jsx` применяют её перед `wrapText`. `ZoneList.jsx` получает секцию «Разделители столбцов» и новые поля в карточке зоны. `Editor.jsx` хранит `columnSplits` в project и прокидывает в оба компонента.

**Стек:** Vitest (TDD для splitValue), React, MUI Select/TextField, pdf-lib (generator), Canvas 2D (preview).

---

### Задача 1: утилита splitValue — textLayout.js (TDD)

**Файлы:**
- Изменить: `src/renderer/utils/textLayout.js`
- Изменить: `tests/utils/textLayout.test.js`

Текущее состояние `textLayout.js` — только функция `wrapText`. Добавляем `splitValue` следом.

- [ ] **Шаг 1: Добавить падающие тесты для splitValue**

Добавить в конец `tests/utils/textLayout.test.js` (после закрывающей `}` блока `describe('wrapText', ...)`):

```js
import { splitValue } from '../../src/renderer/utils/textLayout.js'

describe('splitValue', () => {
  it('splitIndex null — возвращает полное значение', () => {
    expect(splitValue('Иванов, Иван', null, '', ',')).toBe('Иванов, Иван')
  })

  it('column splitChar, index 0', () => {
    expect(splitValue('Иванов, Иван', 0, '', ',')).toBe('Иванов')
  })

  it('column splitChar, index 1', () => {
    expect(splitValue('Иванов, Иван', 1, '', ',')).toBe(' Иван')
  })

  it('zone splitChar перекрывает column splitChar', () => {
    expect(splitValue('a|b', 0, '|', ',')).toBe('a')
  })

  it('несуществующий index — возвращает пустую строку', () => {
    expect(splitValue('Иванов', 2, '', ',')).toBe('')
  })

  it('нет символа (ни zone, ни column) — возвращает полное значение', () => {
    expect(splitValue('Иванов, Иван', 0, '', '')).toBe('Иванов, Иван')
  })
})
```

- [ ] **Шаг 2: Убедиться что тесты падают**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test -- tests/utils/textLayout.test.js 2>&1 | tail -10
```
Ожидаемый результат: ошибка `splitValue is not a function` или аналогичная.

- [ ] **Шаг 3: Реализовать splitValue**

Добавить в конец `src/renderer/utils/textLayout.js` (после функции `wrapText`):

```js
export function splitValue(value, splitIndex, zoneSplitChar, columnSplitChar) {
  if (splitIndex == null) return String(value)
  const char = zoneSplitChar || columnSplitChar || ''
  if (!char) return String(value)
  const parts = String(value).split(char)
  return parts[splitIndex] ?? ''
}
```

- [ ] **Шаг 4: Убедиться что тесты проходят**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test -- tests/utils/textLayout.test.js 2>&1 | tail -5
```
Ожидаемый результат: 12 passed (6 wrapText + 6 splitValue), 0 failed.

- [ ] **Шаг 5: Прогнать все тесты**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test 2>&1 | tail -5
```
Ожидаемый результат: 22 passed (16 старых + 6 новых), 0 failed.

- [ ] **Шаг 6: Коммит**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && git add src/renderer/utils/textLayout.js tests/utils/textLayout.test.js && git commit -m "feat: утилита splitValue для разбивки значения по символу"
```

---

### Задача 2: применить splitValue в PDF-генераторе — generator.js

**Файлы:**
- Изменить: `src/renderer/utils/generator.js`

Текущее состояние файла (49 строк): строка 3 — `import { wrapText } from './textLayout.js'`, строка 5 — сигнатура `generatePdf`, строки 24–43 — inner for-loop по зонам.

- [ ] **Шаг 1: Обновить импорт**

Найти строку:
```js
import { wrapText } from './textLayout.js'
```
Заменить на:
```js
import { wrapText, splitValue } from './textLayout.js'
```

- [ ] **Шаг 2: Добавить параметр columnSplits**

Найти:
```js
export async function generatePdf({ pngBytes, psdWidth, psdHeight, dpi, fontBytes, zones, rows, onProgress }) {
```
Заменить на:
```js
export async function generatePdf({ pngBytes, psdWidth, psdHeight, dpi, fontBytes, zones, rows, onProgress, columnSplits = {} }) {
```

- [ ] **Шаг 3: Применить splitValue внутри цикла зон**

Найти в inner for-loop (строки 24–26):
```js
    for (const zone of zones) {
      const value = row[zone.column]
      if (value == null || value === '') continue
```
Заменить на:
```js
    for (const zone of zones) {
      const rawValue = row[zone.column]
      if (rawValue == null || rawValue === '') continue
      const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
      if (value === '') continue
```

- [ ] **Шаг 4: Прогнать все тесты**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test 2>&1 | tail -5
```
Ожидаемый результат: 22 passed, 0 failed.

- [ ] **Шаг 5: Коммит**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && git add src/renderer/utils/generator.js && git commit -m "feat: применить splitValue в PDF-генераторе"
```

---

### Задача 3: применить splitValue в предпросмотре — PSDViewer.jsx

**Файлы:**
- Изменить: `src/renderer/components/PSDViewer.jsx`

Текущее состояние: строка 6 — `import { wrapText } from '../utils/textLayout'`, строка 8 — сигнатура с пропами, строки 82–95 — `getPreviewLines`, строки 190–197 — создание новой зоны в `handleMouseUp`.

- [ ] **Шаг 1: Обновить импорт**

Найти:
```js
import { wrapText } from '../utils/textLayout'
```
Заменить на:
```js
import { wrapText, splitValue } from '../utils/textLayout'
```

- [ ] **Шаг 2: Добавить проп columnSplits**

Найти:
```js
export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi }) {
```
Заменить на:
```js
export default function PSDViewer({ psdPath, zones, onZonesChange, selectedZoneId, onSelectZone, onPsdParsed, previewRow, dpi, columnSplits = {} }) {
```

- [ ] **Шаг 3: Применить splitValue в getPreviewLines**

Найти в `getPreviewLines` (строки 84–85):
```js
    const value = previewRow[zone.column]
    if (value == null || value === '') return null
```
Заменить на:
```js
    const rawValue = previewRow[zone.column]
    if (rawValue == null || rawValue === '') return null
    const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
    if (value === '') return null
```

- [ ] **Шаг 4: Добавить splitIndex и splitChar в новые зоны**

Найти в `handleMouseUp` (создание новой зоны):
```js
      onZonesChange([...zones, {
        id: crypto.randomUUID(),
        label: `Зона ${zones.length + 1}`,
        ...docCoords,
        column: '',
        font: 'Roboto',
        fontSize: 12,
      }])
```
Заменить на:
```js
      onZonesChange([...zones, {
        id: crypto.randomUUID(),
        label: `Зона ${zones.length + 1}`,
        ...docCoords,
        column: '',
        font: 'Roboto',
        fontSize: 12,
        splitIndex: null,
        splitChar: '',
      }])
```

- [ ] **Шаг 5: Прогнать все тесты**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test 2>&1 | tail -5
```
Ожидаемый результат: 22 passed, 0 failed.

- [ ] **Шаг 6: Коммит**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && git add src/renderer/components/PSDViewer.jsx && git commit -m "feat: применить splitValue в предпросмотре PSDViewer"
```

---

### Задача 4: UI разбивки — ZoneList.jsx

**Файлы:**
- Изменить: `src/renderer/components/ZoneList.jsx`

Текущее состояние (104 строки): компонент принимает `{ zones, columns, selectedZoneId, onSelectZone, onZonesChange }`. Новые пропы: `columnSplits`, `onColumnSplitsChange`, `previewRow`. Нет Vitest-тестов — только UI.

- [ ] **Шаг 1: Добавить TextField в импорты MUI**

Найти строку 1:
```js
import {
  Box, Typography, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider,
} from '@mui/material'
```
Заменить на:
```js
import {
  Box, Typography, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Divider, TextField,
} from '@mui/material'
```

- [ ] **Шаг 2: Добавить новые пропы в сигнатуру**

Найти:
```js
export default function ZoneList({ zones, columns, selectedZoneId, onSelectZone, onZonesChange }) {
```
Заменить на:
```js
export default function ZoneList({ zones, columns, selectedZoneId, onSelectZone, onZonesChange, columnSplits = {}, onColumnSplitsChange, previewRow }) {
```

- [ ] **Шаг 3: Добавить helper getSplitOptions**

После строки `function deleteZone(id) { ... }` добавить:

```js
  function getSplitOptions(zone) {
    const effectiveChar = zone.splitChar || columnSplits[zone.column] || ''
    if (!effectiveChar || !previewRow || !zone.column) return []
    const value = previewRow[zone.column]
    if (value == null) return []
    return String(value).split(effectiveChar).map((part, i) => ({ index: i, label: part }))
  }
```

- [ ] **Шаг 4: Добавить секцию «Разделители столбцов»**

Найти в JSX (в блоке `return` компонента, перед `<Typography variant="subtitle2"...>`):
```jsx
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, pt: 2, pb: 1 }}>
        Зоны
      </Typography>
```
Заменить на:
```jsx
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
```

- [ ] **Шаг 5: Добавить поля splitIndex и splitChar в карточку зоны**

Найти внутри `<ListItem ...>` (в `zones.map`) блок после первого `</FormControl>` (после селектора столбца, перед селектором шрифта):

```jsx
              </FormControl>

              <FormControl size="small" fullWidth onClick={e => e.stopPropagation()}>
                <InputLabel>Шрифт</InputLabel>
```

Заменить на:

```jsx
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
```

- [ ] **Шаг 6: Прогнать все тесты**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test 2>&1 | tail -5
```
Ожидаемый результат: 22 passed, 0 failed.

- [ ] **Шаг 7: Коммит**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && git add src/renderer/components/ZoneList.jsx && git commit -m "feat: UI разбивки по символу в ZoneList"
```

---

### Задача 5: связать всё в Editor.jsx

**Файлы:**
- Изменить: `src/renderer/screens/Editor.jsx`

Три изменения: передать `columnSplits` + `onColumnSplitsChange` + `previewRow` в ZoneList, передать `columnSplits` в PSDViewer, передать `columnSplits` в `generatePdf`.

- [ ] **Шаг 1: Передать columnSplits и previewRow в ZoneList**

Найти в JSX:
```jsx
          <ZoneList
            zones={project.zones}
            columns={project.columns}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onZonesChange={handleZonesChange}
          />
```
Заменить на:
```jsx
          <ZoneList
            zones={project.zones}
            columns={project.columns}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onZonesChange={handleZonesChange}
            columnSplits={project.columnSplits ?? {}}
            onColumnSplitsChange={splits => save({ ...project, columnSplits: splits })}
            previewRow={previewRow}
          />
```

- [ ] **Шаг 2: Передать columnSplits в PSDViewer**

Найти в JSX:
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
            />
```
Заменить на:
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
            />
```

- [ ] **Шаг 3: Передать columnSplits в generatePdf**

Найти в `handleGenerate`:
```js
      const pdfBytes = await generatePdf({
        pngBytes: psd.pngBytes,
        psdWidth: psd.width,
        psdHeight: psd.height,
        dpi: effectiveDpi,
        fontBytes,
        zones: project.zones,
        rows: excelRows,
        onProgress: (done, total) => setGenProgress(Math.round((done / total) * 100)),
      })
```
Заменить на:
```js
      const pdfBytes = await generatePdf({
        pngBytes: psd.pngBytes,
        psdWidth: psd.width,
        psdHeight: psd.height,
        dpi: effectiveDpi,
        fontBytes,
        zones: project.zones,
        rows: excelRows,
        columnSplits: project.columnSplits ?? {},
        onProgress: (done, total) => setGenProgress(Math.round((done / total) * 100)),
      })
```

- [ ] **Шаг 4: Прогнать все тесты**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && npm test 2>&1 | tail -5
```
Ожидаемый результат: 22 passed, 0 failed.

- [ ] **Шаг 5: Коммит**

```bash
cd /Users/ilakosmacev/Documents/projects/badge-generator && git add src/renderer/screens/Editor.jsx && git commit -m "feat: подключить columnSplits в Editor — ZoneList, PSDViewer, generatePdf"
```
