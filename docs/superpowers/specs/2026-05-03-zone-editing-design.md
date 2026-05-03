# Дизайн: редактирование зон (под-проект A)

## Контекст

Зоны создаются рисованием на canvas. После создания нельзя изменить размер шрифта, переместить или изменить размер зоны визуально — только удалить и нарисовать заново. Этот под-проект добавляет:
- Выбор размера шрифта в боковой панели
- Перемещение зоны на canvas
- Ресайз зоны за угловые ручки

---

## Архитектура

### Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/renderer/components/ZoneList.jsx` | Добавить Select для fontSize |
| `src/renderer/components/ZoneRect.jsx` | Угловые ручки + onMoveStart/onResizeStart |
| `src/renderer/components/PSDViewer.jsx` | Единый interaction state, обработка move/resize |

---

## 1. Размер шрифта — ZoneList

Добавить `Select` после существующего селектора шрифта. Тот же паттерн: `FormControl + InputLabel shrink + Select notched`.

Пресеты: `[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48]`

```jsx
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48]

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
```

---

## 2. Угловые ручки и колбэки — ZoneRect

ZoneRect получает два новых пропа:

```
onMoveStart(e)           — mousedown на теле зоны
onResizeStart(e, corner) — mousedown на угловой ручке, corner: 'tl'|'tr'|'bl'|'br'
```

Когда `isSelected === true` — рисует 4 круга радиусом 5px по углам. Курсоры:
- Тело зоны: `move`
- tl/br: `nwse-resize`
- tr/bl: `nesw-resize`

Ручки перехватывают mousedown (e.stopPropagation()) и вызывают `onResizeStart(e, corner)`.
Тело зоны при mousedown вызывает `onMoveStart(e)` если есть этот проп, иначе `onClick`.

---

## 3. Единый interaction state — PSDViewer

### Замена drawing на interaction

Текущий `drawing` state заменяется единым `interaction`:

```js
// null — нет активного взаимодействия
// { type: 'drawing', startX, startY, currentX, currentY }
// { type: 'moving',  zoneId, startX, startY, origDocX, origDocY }
// { type: 'resizing', zoneId, corner, startX, startY, origDocZone }
const [interaction, setInteraction] = useState(null)
```

### Начало взаимодействий

- **drawing**: mousedown на пустой части SVG (текущее поведение, без изменений)
- **moving**: `onMoveStart` из ZoneRect — сохраняет `startX/Y` в canvas coords и `origDocX/Y` зоны
- **resizing**: `onResizeStart` из ZoneRect — сохраняет `startX/Y` и `origDocZone` (в doc px)

### Обработка mousemove

```
moving:
  delta = (currentCanvas - startCanvas)
  newDocX = origDocX + delta.x * (docSize.width / canvasSize.width)
  newDocY = origDocY + delta.y * (docSize.height / canvasSize.height)

resizing (пример tl):
  delta = (currentCanvas - startCanvas) in doc pixels
  newX = origDocZone.x + delta.x
  newY = origDocZone.y + delta.y
  newW = origDocZone.width - delta.x
  newH = origDocZone.height - delta.y
  clamp: width/height >= 5 doc px
```

Математика для всех 4 углов:
- `tl`: x+delta.x, y+delta.y, w-delta.x, h-delta.y
- `tr`: x=orig, y+delta.y, w+delta.x, h-delta.y
- `bl`: x+delta.x, y=orig, w-delta.x, h+delta.y
- `br`: x=orig, y=orig, w+delta.x, h+delta.y

### Live preview

Во время drag зона с `interaction.zoneId` рендерится с live-координатами вычисленными из `interaction` + текущей позиции мыши — **без вызова `onZonesChange`**.

### Фиксация (mouseup / mouseleave)

- `drawing`: создать новую зону (текущее поведение)
- `moving`/`resizing`: вычислить финальные doc coords → вызвать `onZonesChange` один раз

---

## Ограничения

- Минимальный размер зоны: 5×5 doc px
- Зоны не выходят за границы PSD (clamp x/y/w/h по размерам PSD)
- При перемещении зоны выделение не снимается

---

## Тесты

Новой логики, тестируемой в Vitest, нет — всё UI/browser. Существующие 10 тестов не затрагиваются.
