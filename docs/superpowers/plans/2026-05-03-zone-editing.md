# План реализации: редактирование зон (под-проект A)

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ НАВ-СКИЛЛ: используй superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для выполнения плана задача за задачей. Шаги используют синтаксис чекбоксов (`- [ ]`) для отслеживания прогресса.

**Цель:** Добавить селектор размера шрифта в боковую панель ZoneList и включить перемещение/ресайз существующих зон перетаскиванием на SVG-канвасе.

**Архитектура:** Три независимых изменения: (1) ZoneList получает Select для fontSize, (2) ZoneRect получает угловые ручки и два новых пропа для mousedown, (3) PSDViewer заменяет единственный стейт `drawing` на унифицированный `interaction`, покрывающий рисование, перемещение и ресайз — live-обновление зоны во время drag без вызова `onZonesChange` до mouseup.

**Стек:** React + MUI Select/MenuItem/FormControl, SVG-окружности для угловых ручек, React useState/useRef.

---

### Задача 1: Селектор размера шрифта — ZoneList

**Файлы:**
- Изменить: `src/renderer/components/ZoneList.jsx`

Новых Vitest-тестов нет — только UI. Существующие 10 тестов не затрагиваются.

- [ ] **Шаг 1: Добавить константу FONT_SIZES**

В `src/renderer/components/ZoneList.jsx` после константы `FONTS` (строка 11) добавить:

```js
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48]
```

- [ ] **Шаг 2: Добавить Select для fontSize после Select шрифта**

После закрывающего `</FormControl>` селектора шрифта (строка 83) добавить:

```jsx
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

- [ ] **Шаг 3: Прогнать тесты**

```bash
npm test
```
Ожидаемый результат: 10 passed, 0 failed.

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/components/ZoneList.jsx
git commit -m "feat: добавить селектор размера шрифта в ZoneList"
```

---

### Задача 2: Угловые ручки — ZoneRect

**Файлы:**
- Изменить: `src/renderer/components/ZoneRect.jsx`

Новых Vitest-тестов нет — только SVG UI.

- [ ] **Шаг 1: Заменить содержимое файла целиком**

Заменить `src/renderer/components/ZoneRect.jsx` на:

```jsx
const HANDLE_R = 5

const CORNER_CURSORS = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  br: 'nwse-resize',
}

export default function ZoneRect({ zone, isSelected, onClick, onMoveStart, onResizeStart }) {
  const x = zone.canvasX
  const y = zone.canvasY
  const w = zone.canvasWidth
  const h = zone.canvasHeight

  const corners = [
    { key: 'tl', cx: x,     cy: y },
    { key: 'tr', cx: x + w, cy: y },
    { key: 'bl', cx: x,     cy: y + h },
    { key: 'br', cx: x + w, cy: y + h },
  ]

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        fill="rgba(25, 118, 210, 0.15)"
        stroke={isSelected ? '#1976d2' : '#1976d280'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'move' }}
        onMouseDown={e => { if (onMoveStart) onMoveStart(e); else onClick?.(e) }}
      />
      <text
        x={x + 4} y={y + 14}
        fontSize={12} fill="#1976d2"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {zone.label}
      </text>
      {isSelected && corners.map(({ key, cx, cy }) => (
        <circle
          key={key}
          cx={cx} cy={cy} r={HANDLE_R}
          fill="white"
          stroke="#1976d2"
          strokeWidth={1.5}
          style={{ cursor: CORNER_CURSORS[key] }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart?.(e, key) }}
        />
      ))}
    </g>
  )
}
```

- [ ] **Шаг 2: Прогнать тесты**

```bash
npm test
```
Ожидаемый результат: 10 passed, 0 failed.

- [ ] **Шаг 3: Коммит**

```bash
git add src/renderer/components/ZoneRect.jsx
git commit -m "feat: угловые ручки ZoneRect, пропы onMoveStart/onResizeStart"
```

---

### Задача 3: Унифицированный interaction state — PSDViewer

**Файлы:**
- Изменить: `src/renderer/components/PSDViewer.jsx`

Заменить стейт `drawing` на унифицированный `interaction`, покрывающий рисование, перемещение и ресайз. Добавить live-вычисление координат во время drag. Новых Vitest-тестов нет — всё UI/browser.

- [ ] **Шаг 1: Добавить svgRef и заменить стейт drawing**

Изменить:
```js
const [drawing, setDrawing] = useState(null)
```
на:
```js
const svgRef = useRef(null)
const [interaction, setInteraction] = useState(null)
```

- [ ] **Шаг 2: Обновить getSvgPos — использовать svgRef**

Заменить:
```js
function getSvgPos(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}
```
на:
```js
function getSvgPos(e) {
  const rect = svgRef.current.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}
```

- [ ] **Шаг 3: Добавить helper computeLiveZone**

Добавить перед `handleMouseDown`:

```js
function computeLiveZone(zone, inter) {
  if (!inter || !sizes) return null
  const scaleX = sizes.psd.width / sizes.canvas.width
  const scaleY = sizes.psd.height / sizes.canvas.height
  const dx = (inter.currentX - inter.startX) * scaleX
  const dy = (inter.currentY - inter.startY) * scaleY

  if (inter.type === 'moving' && inter.zoneId === zone.id) {
    return {
      x: Math.max(0, Math.min(sizes.psd.width - zone.width, inter.origDocX + dx)),
      y: Math.max(0, Math.min(sizes.psd.height - zone.height, inter.origDocY + dy)),
    }
  }

  if (inter.type === 'resizing' && inter.zoneId === zone.id) {
    const o = inter.origDocZone
    let x = o.x, y = o.y, width = o.width, height = o.height
    if (inter.corner === 'tl') { x += dx; y += dy; width -= dx; height -= dy }
    else if (inter.corner === 'tr') {       y += dy; width += dx; height -= dy }
    else if (inter.corner === 'bl') { x += dx;       width -= dx; height += dy }
    else if (inter.corner === 'br') {                width += dx; height += dy }
    width = Math.max(5, width)
    height = Math.max(5, height)
    x = Math.max(0, x)
    y = Math.max(0, y)
    if (x + width > sizes.psd.width) width = sizes.psd.width - x
    if (y + height > sizes.psd.height) height = sizes.psd.height - y
    return { x, y, width, height }
  }

  return null
}
```

- [ ] **Шаг 4: Обновить handleMouseDown (только рисование)**

Заменить:
```js
function handleMouseDown(e) {
  if (!sizes) return
  const pos = getSvgPos(e)
  setDrawing({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
}
```
на:
```js
function handleMouseDown(e) {
  if (!sizes) return
  const pos = getSvgPos(e)
  setInteraction({ type: 'drawing', startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
}
```

- [ ] **Шаг 5: Добавить handleMoveStart и handleResizeStart**

После `handleMouseDown` добавить:

```js
function handleMoveStart(e, zone) {
  e.stopPropagation()
  if (!sizes) return
  const pos = getSvgPos(e)
  onSelectZone(zone.id)
  setInteraction({ type: 'moving', zoneId: zone.id, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocX: zone.x, origDocY: zone.y })
}

function handleResizeStart(e, zone, corner) {
  e.stopPropagation()
  if (!sizes) return
  const pos = getSvgPos(e)
  setInteraction({ type: 'resizing', zoneId: zone.id, corner, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, origDocZone: { x: zone.x, y: zone.y, width: zone.width, height: zone.height } })
}
```

- [ ] **Шаг 6: Обновить handleMouseMove**

Заменить:
```js
function handleMouseMove(e) {
  if (!drawing) return
  const pos = getSvgPos(e)
  setDrawing(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
}
```
на:
```js
function handleMouseMove(e) {
  if (!interaction) return
  const pos = getSvgPos(e)
  setInteraction(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
}
```

- [ ] **Шаг 7: Обновить handleMouseUp**

Заменить весь `handleMouseUp` на:

```js
function handleMouseUp() {
  if (!interaction || !sizes) return

  if (interaction.type === 'drawing') {
    const x = Math.min(interaction.startX, interaction.currentX)
    const y = Math.min(interaction.startY, interaction.currentY)
    const w = Math.abs(interaction.currentX - interaction.startX)
    const h = Math.abs(interaction.currentY - interaction.startY)
    setInteraction(null)
    if (w < 5 || h < 5) return
    const docCoords = canvasToDoc({ x, y, width: w, height: h }, sizes.canvas, sizes.psd)
    onZonesChange([...zones, {
      id: crypto.randomUUID(),
      label: `Зона ${zones.length + 1}`,
      ...docCoords,
      column: '',
      font: 'Roboto',
      fontSize: 12,
    }])
  } else {
    const zone = zones.find(z => z.id === interaction.zoneId)
    const moved = interaction.currentX !== interaction.startX || interaction.currentY !== interaction.startY
    const live = computeLiveZone(zone, interaction)
    setInteraction(null)
    if (!zone || !moved || !live) return
    onZonesChange(zones.map(z => z.id === zone.id ? { ...z, ...live } : z))
  }
}
```

- [ ] **Шаг 8: Обновить вычисление drawingRect**

Заменить:
```js
const drawingRect = drawing ? {
  x: Math.min(drawing.startX, drawing.currentX),
  y: Math.min(drawing.startY, drawing.currentY),
  w: Math.abs(drawing.currentX - drawing.startX),
  h: Math.abs(drawing.currentY - drawing.startY),
} : null
```
на:
```js
const drawingRect = interaction?.type === 'drawing' ? {
  x: Math.min(interaction.startX, interaction.currentX),
  y: Math.min(interaction.startY, interaction.currentY),
  w: Math.abs(interaction.currentX - interaction.startX),
  h: Math.abs(interaction.currentY - interaction.startY),
} : null
```

- [ ] **Шаг 9: Обновить рендер зон — live-координаты и новые пропы**

Заменить:
```jsx
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
```
на:
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
      onClick={e => { e.stopPropagation(); onSelectZone(zone.id) }}
      onMoveStart={e => handleMoveStart(e, zone)}
      onResizeStart={(e, corner) => handleResizeStart(e, zone, corner)}
    />
  )
})}
```

- [ ] **Шаг 10: Добавить ref на SVG-элемент**

Добавить `ref={svgRef}` к элементу `<svg>`:

```jsx
<svg
  ref={svgRef}
  style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
  width={sizes.canvas.width}
  height={sizes.canvas.height}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
>
```

- [ ] **Шаг 11: Прогнать тесты**

```bash
npm test
```
Ожидаемый результат: 10 passed, 0 failed.

- [ ] **Шаг 12: Коммит**

```bash
git add src/renderer/components/PSDViewer.jsx
git commit -m "feat: унифицированный interaction state в PSDViewer — перемещение и ресайз зон"
```
