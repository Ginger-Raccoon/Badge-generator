# Дизайн: разбивка значения по символу (под-проект C)

## Контекст

Сейчас зона выводит значение ячейки Excel целиком. Если ячейка содержит составное значение (например `"Иванов, Иван Иванович"`), нет способа показать только его часть. Этот под-проект добавляет:
- Разделитель на уровне столбца — общий символ для всех зон этого столбца
- Опциональный override разделителя на уровне зоны
- Выбор части (индекс) с подсказками из текущей строки предпросмотра

---

## Архитектура

### Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/renderer/utils/textLayout.js` | Новая экспортируемая функция `splitValue` |
| `src/renderer/utils/generator.js` | Применение `splitValue` перед `wrapText`, новый параметр `columnSplits` |
| `src/renderer/screens/Editor.jsx` | Хранение `columnSplits` в project, передача в ZoneList и PSDViewer |
| `src/renderer/components/ZoneList.jsx` | Секция «Разделители столбцов» + поля `splitIndex`/`splitChar` в карточке зоны |
| `src/renderer/components/PSDViewer.jsx` | Применение `splitValue` в `getPreviewLines`, новый проп `columnSplits` |

---

## 1. Модель данных

### project.columnSplits

Новое поле в объекте проекта:

```js
columnSplits: Record<string, string>
// { "ФИО": ",", "Должность": "" }
// пустая строка = нет разделителя для этого столбца
```

По умолчанию: `{}` (отсутствие поля = нет разделителей).

### Зона — новые поля

```js
splitIndex: null | number  // null = не разбивать, 0/1/2... = показать эту часть
splitChar: string          // '' = использовать columnSplits[zone.column], иначе override
```

По умолчанию при создании зоны: `splitIndex: null, splitChar: ''`.

Существующие зоны без этих полей продолжают работать: `splitIndex ?? null === null` → значение целиком.

### Правило выбора символа при рендере

```js
const effectiveChar = zone.splitChar || columnSplits[zone.column] || ''
```

Если `splitIndex === null` или `effectiveChar === ''` → показывать значение целиком.

---

## 2. Утилита splitValue — textLayout.js

```js
export function splitValue(value, splitIndex, zoneSplitChar, columnSplitChar) {
  if (splitIndex == null) return String(value)
  const char = zoneSplitChar || columnSplitChar || ''
  if (!char) return String(value)
  const parts = String(value).split(char)
  return parts[splitIndex] ?? ''
}
```

Логика:
- `splitIndex == null` → полное значение
- нет символа (ни zone, ни column) → полное значение
- часть с таким индексом существует → вернуть её
- часть не существует → `''` (зона пустая для этой строки)

Функция чистая — тестируется в Vitest без DOM.

---

## 3. Тесты — textLayout.test.js

Новые тест-кейсы для `splitValue`:

| Кейс | Вход | Ожидание |
|------|------|----------|
| splitIndex null | `("Иванов, Иван", null, '', ',')` | `"Иванов, Иван"` |
| column splitChar, index 0 | `("Иванов, Иван", 0, '', ',')` | `"Иванов"` |
| column splitChar, index 1 | `("Иванов, Иван", 1, '', ',')` | `" Иван"` |
| zone override | `("a|b", 0, '|', ',')` | `"a"` |
| несуществующий index | `("Иванов", 2, '', ',')` | `''` |
| нет символа | `("Иванов, Иван", 0, '', '')` | `"Иванов, Иван"` |

---

## 4. ZoneList UI

### Секция «Разделители столбцов»

Рендерится над списком зон. Показывает только столбцы, задействованные хотя бы в одной зоне (`usedColumns = new Set(zones.map(z => z.column).filter(Boolean))`).

```
┌─ Разделители столбцов ───────────────────────────────────┐
│ Символ для разбивки значения на части. Применяется       │
│ ко всем зонам, привязанным к этому столбцу.              │
│                                                          │
│ ФИО        [ , ]                                         │
│ Должность  [   ]  placeholder: "например , или |"        │
└──────────────────────────────────────────────────────────┘
```

`onColumnSplitsChange(newSplits)` — колбэк для сохранения в project.

### Карточка зоны — новые поля

Показываются только если у зоны выбран столбец (`zone.column !== ''`).

**Поле «Часть» (splitIndex):**

Select с вариантами, построенными из `previewRow[zone.column]` + effectiveChar:
- `— (не разбивать)` → `splitIndex: null`
- `0: "Иванов"`, `1: " Иван"`, ... → `splitIndex: 0`, `1`, ...

Если `previewRow` отсутствует или `effectiveChar` пуст — показывает только `— (не разбивать)`.

**Поле «Символ» в зоне (splitChar override):**

Рендерится всегда, если у зоны выбран столбец (`zone.column !== ''`). TextField с динамическим placeholder:
- Если `columnSplits[zone.column]` задан: `"оставьте пустым — используется символ столбца (,)"`
- Иначе: `"оставьте пустым — разбивка не применяется"`

Это позволяет задать zone-level splitChar даже без column-level настройки — в этом случае «Часть» получает варианты после ввода символа в поле зоны.

### Новые пропы ZoneList

```js
ZoneList({
  zones, columns, selectedZoneId, onSelectZone, onZonesChange,
  columnSplits,          // новый
  onColumnSplitsChange,  // новый
  previewRow,            // новый
})
```

---

## 5. Generator.js

`generatePdf` получает новый параметр `columnSplits` (с дефолтом `{}`):

```js
export async function generatePdf({ ..., columnSplits = {} })
```

Внутри цикла зон — применить `splitValue` перед `wrapText`:

```js
const rawValue = row[zone.column]
if (rawValue == null || rawValue === '') continue
const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
if (value === '') continue
const lines = wrapText(value, maxWidthPt, zone.fontSize, ...)
```

---

## 6. PSDViewer.jsx

Новый проп `columnSplits` (дефолт `{}`):

```js
export default function PSDViewer({ ..., columnSplits = {} })
```

В `getPreviewLines` — применить `splitValue` перед `wrapText`:

```js
const rawValue = previewRow[zone.column]
if (rawValue == null || rawValue === '') return null
const value = splitValue(rawValue, zone.splitIndex ?? null, zone.splitChar ?? '', columnSplits[zone.column] ?? '')
if (value === '') return null
const lines = wrapText(value, coords.canvasWidth, svgFontSize, ...)
```

---

## 7. Editor.jsx

Передача `columnSplits` в оба компонента:

```jsx
<ZoneList
  ...
  columnSplits={project.columnSplits ?? {}}
  onColumnSplitsChange={splits => save({ ...project, columnSplits: splits })}
  previewRow={previewRow}
/>

<PSDViewer
  ...
  columnSplits={project.columnSplits ?? {}}
/>
```

В `handleGenerate` — передать `columnSplits` в `generatePdf`:

```js
columnSplits: project.columnSplits ?? {},
```
