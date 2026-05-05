# Флейаут настроек

**Дата:** 2026-05-05
**Статус:** Утверждён

---

## Цель

Добавить на главный экран доступ к глобальным настройкам через иконку шестерёнки в правом нижнем углу. Настройки открываются в боковой панели (Drawer) справа и включают: дефолтный шрифт и размер для новых зон, управление подтверждением удаления, удаление всех проектов разом.

---

## Хранилище

`prefs.json` расширяется двумя новыми полями:

```json
{
  "favorites": [],
  "skipDeleteConfirm": false,
  "defaultFont": "Roboto",
  "defaultFontSize": 12
}
```

`src/main/prefs.js` — добавить `defaultFont: 'Roboto'` и `defaultFontSize: 12` в `DEFAULTS`. Логика `loadPrefs`/`savePrefs` не меняется.

---

## Бэкенд (ipc.js)

Новый IPC-хендлер `projects:deleteAll`:
- Читает содержимое `PROJECTS_DIR`
- Вызывает `fs.rmSync(path, { recursive: true })` для каждой папки
- Возвращает управление рендереру (не бросает исключений при пустой папке)

---

## Preload (preload.js)

Новый метод в `window.api`:
```js
deleteAllProjects: () => ipcRenderer.invoke('projects:deleteAll'),
```

---

## Компонент SettingsDrawer.jsx

Новый файл: `src/renderer/components/SettingsDrawer.jsx`

### Пропсы

| Проп | Тип | Описание |
|------|-----|----------|
| `open` | `bool` | Управляет видимостью |
| `onClose` | `() => void` | Закрыть drawer |
| `prefs` | `object` | Текущие настройки: `defaultFont`, `defaultFontSize`, `skipDeleteConfirm` |
| `onPrefsChange` | `(patch) => void` | Частичное обновление настроек |
| `projects` | `string[]` | Список проектов (для деактивации кнопки удаления) |
| `onDeleteAll` | `() => void` | Коллбэк после подтверждения удаления всех |

### Содержимое Drawer

MUI `<Drawer anchor="right">`, ширина 320px.

1. **Заголовок** — «Настройки» + `<IconButton>` с `CloseIcon` справа
2. **Шрифт по умолчанию** — `<Select>` с вариантами Roboto / PT Serif. Изменение сразу вызывает `onPrefsChange({ defaultFont: value })`
3. **Размер шрифта по умолчанию** — `<TextField type="number">`. Локальный state строки (аналогично инпуту страниц в Editor). При blur: если значение невалидно или вне диапазона 6–200 — восстанавливается текущее. При валидном значении — вызывает `onPrefsChange({ defaultFontSize: value })`
4. `<Divider>`
5. **Чекбокс «Спрашивать при удалении»** — инвертирует `skipDeleteConfirm`: checked = `!skipDeleteConfirm`. Изменение вызывает `onPrefsChange({ skipDeleteConfirm: !checked })`
6. `<Divider>`
7. **Кнопка «Удалить все проекты»** — `color="error"`, `variant="outlined"`, неактивна если `projects.length === 0`. По клику открывает внутренний диалог подтверждения

### Диалог подтверждения удаления всех

Управляется внутренним state компонента (`confirmOpen`, `confirmInput`).

- Заголовок: «Удалить все проекты?»
- Текст: «Это действие необратимо. Все проекты будут удалены без возможности восстановления.»
- `<TextField>` с плейсхолдером «Введите ПРОДОЛЖИТЬ»
- Кнопка «Удалить» активна только если `confirmInput === 'ПРОДОЛЖИТЬ'`
- При подтверждении: вызывает `onDeleteAll()`, сбрасывает `confirmInput`, закрывает диалог
- Кнопка «Отмена» — закрывает диалог, сбрасывает `confirmInput`

---

## HomeScreen.jsx

### State

Вместо отдельных `favorites`, `skipDeleteConfirm` — единый объект:
```js
const [prefs, setPrefs] = useState({ favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 })
const [settingsOpen, setSettingsOpen] = useState(false)
```

Существующие обращения к `favorites` и `skipDeleteConfirm` заменяются на `prefs.favorites` и `prefs.skipDeleteConfirm`.

### Загрузка при монтировании

```js
useEffect(() => {
  Promise.all([window.api.listProjects(), window.api.loadPrefs()])
    .then(([projectList, loadedPrefs]) => {
      setProjects(projectList)
      setPrefs(loadedPrefs)
    })
}, [])
```

### handlePrefsChange

```js
async function handlePrefsChange(patch) {
  const next = { ...prefs, ...patch }
  setPrefs(next)
  await window.api.savePrefs(next)
}
```

Заменяет инлайн-вызовы `savePrefs` в `toggleFavorite`, `confirmDelete`, `handleConfirmDelete`.

### handleDeleteAll

```js
async function handleDeleteAll() {
  await window.api.deleteAllProjects()
  const next = { ...prefs, favorites: [] }
  setProjects([])
  setPrefs(next)
  await window.api.savePrefs(next)
  setSettingsOpen(false)
}
```

### Иконка шестерёнки

`<IconButton>` с `SettingsIcon`, позиция `fixed`, `bottom: 16, right: 16`, `zIndex: 'fab'`.

---

## Editor.jsx + PSDViewer.jsx

### Editor.jsx

При монтировании загружает prefs и сохраняет дефолты в state:
```js
const [defaultFont, setDefaultFont] = useState('Roboto')
const [defaultFontSize, setDefaultFontSize] = useState(12)
```

В `init` useEffect добавляется `window.api.loadPrefs()` и устанавливаются значения.

Передаёт пропсы в PSDViewer:
```jsx
<PSDViewer
  defaultFont={defaultFont}
  defaultFontSize={defaultFontSize}
  ...
/>
```

### PSDViewer.jsx

Принимает новые пропсы `defaultFont = 'Roboto'` и `defaultFontSize = 12`.

При создании новой зоны (тип `drawing` в `handleMouseUp`) использует их вместо захардкоженных значений:
```js
font: defaultFont,
fontSize: defaultFontSize,
```

---

## Затронутые файлы

| Файл | Действие |
|------|----------|
| `src/main/prefs.js` | Добавить `defaultFont`, `defaultFontSize` в DEFAULTS |
| `src/main/ipc.js` | Добавить хендлер `projects:deleteAll` |
| `src/preload.js` | Добавить `deleteAllProjects` |
| `src/renderer/components/SettingsDrawer.jsx` | Создать |
| `src/renderer/screens/HomeScreen.jsx` | Шестерёнка, SettingsDrawer, объединить state prefs, handlePrefsChange, handleDeleteAll |
| `src/renderer/screens/Editor.jsx` | Загрузить prefs, передать defaultFont/defaultFontSize в PSDViewer |
| `src/renderer/components/PSDViewer.jsx` | Принять defaultFont/defaultFontSize пропсы |

---

## Критерии готовности

- [ ] Иконка шестерёнки всегда видна в правом нижнем углу главного экрана
- [ ] Drawer открывается по клику, закрывается крестиком или кликом вне
- [ ] Изменение шрифта/размера сохраняется в prefs.json сразу
- [ ] Новые зоны создаются с выбранным дефолтным шрифтом и размером
- [ ] Чекбокс «Спрашивать при удалении» корректно инвертирует `skipDeleteConfirm`
- [ ] Кнопка «Удалить все» неактивна при пустом списке проектов
- [ ] Диалог «Удалить все» требует ввода «ПРОДОЛЖИТЬ» для активации кнопки
- [ ] После удаления всех: список проектов пуст, избранное сброшено, drawer закрыт
- [ ] Настройки сохраняются между перезапусками
