# Удаление проектов и избранное — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить удаление проектов с диалогом подтверждения и механику избранного с сортировкой на главном экране.

**Architecture:** Предпочтения пользователя (избранное, флаг "не спрашивать") хранятся в `prefs.json` в папке `BadgeGenerator`. Чистая логика чтения/записи вынесена в `src/main/prefs.js` — это позволяет её тестировать без Electron. IPC-хендлеры являются тонкими обёртками над этим модулем. HomeScreen получает новый state и два новых диалога/компонента.

**Tech Stack:** Electron IPC, Node.js fs, Vitest, React, MUI

---

## Карта файлов

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `src/main/prefs.js` | Создать | Чистые функции чтения/записи prefs.json |
| `src/main/ipc.js` | Изменить | Добавить 3 IPC-хендлера |
| `src/preload.js` | Изменить | Добавить 3 метода в window.api |
| `src/renderer/screens/HomeScreen.jsx` | Изменить | State, список, иконки, диалоги |
| `tests/main/prefs.test.js` | Создать | Тесты для prefs.js |

---

## Task 1: Утилита prefs.js

**Files:**
- Create: `src/main/prefs.js`
- Test: `tests/main/prefs.test.js`

- [ ] **Шаг 1: Написать падающие тесты**

Создать `tests/main/prefs.test.js`:

```js
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { loadPrefs, savePrefs } from '../../src/main/prefs.js'

const TMP = join(process.cwd(), '.tmp-prefs-test')

beforeEach(() => mkdirSync(TMP, { recursive: true }))
afterEach(() => rmSync(TMP, { recursive: true, force: true }))

describe('loadPrefs', () => {
  test('возвращает дефолты если файл отсутствует', async () => {
    const prefs = loadPrefs(TMP)
    expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false })
  })

  test('читает сохранённые данные', async () => {
    savePrefs(TMP, { favorites: ['Проект А'], skipDeleteConfirm: true })
    const prefs = loadPrefs(TMP)
    expect(prefs.favorites).toEqual(['Проект А'])
    expect(prefs.skipDeleteConfirm).toBe(true)
  })

  test('возвращает дефолты при битом JSON', async () => {
    import { writeFileSync } from 'fs'
    writeFileSync(join(TMP, 'prefs.json'), 'не json')
    const prefs = loadPrefs(TMP)
    expect(prefs).toEqual({ favorites: [], skipDeleteConfirm: false })
  })
})

describe('savePrefs', () => {
  test('создаёт файл и сохраняет данные', () => {
    savePrefs(TMP, { favorites: ['X'], skipDeleteConfirm: false })
    const prefs = loadPrefs(TMP)
    expect(prefs.favorites).toEqual(['X'])
  })
})
```

- [ ] **Шаг 2: Запустить тесты — убедиться что падают**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидание: ошибка `Cannot find module '../../src/main/prefs.js'`

- [ ] **Шаг 3: Реализовать `src/main/prefs.js`**

```js
import fs from 'fs'
import path from 'path'

const DEFAULTS = { favorites: [], skipDeleteConfirm: false }

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

- [ ] **Шаг 4: Исправить импорт в тесте (writeFileSync)**

В тесте `'возвращает дефолты при битом JSON'` заменить inline import на импорт в верхней части файла:

```js
import { mkdirSync, rmSync, writeFileSync } from 'fs'
```

и убрать `import { writeFileSync } from 'fs'` из тела теста.

- [ ] **Шаг 5: Запустить тесты — убедиться что проходят**

```bash
npm test -- tests/main/prefs.test.js
```

Ожидание: 4 теста PASS

- [ ] **Шаг 6: Коммит**

```bash
git add src/main/prefs.js tests/main/prefs.test.js
git commit -m "feat: утилита prefs.js для хранения пользовательских предпочтений"
```

---

## Task 2: IPC-хендлеры

**Files:**
- Modify: `src/main/ipc.js`

- [ ] **Шаг 1: Добавить импорт prefs.js в ipc.js**

В начало `src/main/ipc.js` добавить:

```js
import { loadPrefs, savePrefs } from './prefs.js'
```

- [ ] **Шаг 2: Добавить три хендлера в конец ipc.js**

```js
ipcMain.handle('prefs:load', () => {
  ensureProjectsDir()
  return loadPrefs(PROJECTS_DIR)
})

ipcMain.handle('prefs:save', (_, prefs) => {
  ensureProjectsDir()
  savePrefs(PROJECTS_DIR, prefs)
})

ipcMain.handle('projects:delete', (_, name) => {
  const projectDir = path.join(PROJECTS_DIR, name)
  fs.rmSync(projectDir, { recursive: true })
})
```

- [ ] **Шаг 3: Коммит**

```bash
git add src/main/ipc.js
git commit -m "feat: IPC-хендлеры prefs:load, prefs:save, projects:delete"
```

---

## Task 3: Preload

**Files:**
- Modify: `src/preload.js`

- [ ] **Шаг 1: Добавить три метода в window.api**

В `src/preload.js` добавить после `loadFonts`:

```js
  loadPrefs:     ()             => ipcRenderer.invoke('prefs:load'),
  savePrefs:     (prefs)        => ipcRenderer.invoke('prefs:save', prefs),
  deleteProject: (name)         => ipcRenderer.invoke('projects:delete', name),
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/preload.js
git commit -m "feat: добавить loadPrefs, savePrefs, deleteProject в preload"
```

---

## Task 4: HomeScreen — состояние и загрузка данных

**Files:**
- Modify: `src/renderer/screens/HomeScreen.jsx`

- [ ] **Шаг 1: Добавить новый state**

В `HomeScreen` добавить три новых поля state после `const [newName, setNewName] = useState('')`:

```js
const [favorites, setFavorites] = useState([])
const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false)
const [pendingDelete, setPendingDelete] = useState(null)
const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)
```

- [ ] **Шаг 2: Загружать prefs при монтировании**

Заменить существующий `useEffect`:

```js
useEffect(() => {
  Promise.all([
    window.api.listProjects(),
    window.api.loadPrefs(),
  ]).then(([projectList, prefs]) => {
    setProjects(projectList)
    setFavorites(prefs.favorites)
    setSkipDeleteConfirm(prefs.skipDeleteConfirm)
  })
}, [])
```

- [ ] **Шаг 3: Коммит**

```bash
git add src/renderer/screens/HomeScreen.jsx
git commit -m "feat: загрузка prefs при монтировании HomeScreen"
```

---

## Task 5: HomeScreen — список с иконками

**Files:**
- Modify: `src/renderer/screens/HomeScreen.jsx`

- [ ] **Шаг 1: Добавить импорты иконок и компонентов**

Заменить строку импорта иконок:

```js
import AddIcon from '@mui/icons-material/Add'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DeleteIcon from '@mui/icons-material/Delete'
```

Добавить `IconButton` и `Divider` в импорт из `@mui/material`:

```js
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, AppBar, Toolbar, IconButton, Divider,
} from '@mui/material'
```

- [ ] **Шаг 2: Добавить хелперы toggleFavorite, confirmDelete, handleDeleteClick и renderItem**

После `handleOpen` добавить:

```js
async function toggleFavorite(e, name) {
  e.stopPropagation()
  const next = favorites.includes(name)
    ? favorites.filter(f => f !== name)
    : [...favorites, name]
  setFavorites(next)
  const prefs = await window.api.loadPrefs()
  await window.api.savePrefs({ ...prefs, favorites: next })
}

async function confirmDelete(name) {
  const prefs = await window.api.loadPrefs()
  const nextFavorites = favorites.filter(f => f !== name)
  await window.api.savePrefs({ ...prefs, favorites: nextFavorites })
  await window.api.deleteProject(name)
  setFavorites(nextFavorites)
  setProjects(prev => prev.filter(p => p !== name))
}

function handleDeleteClick(e, name) {
  e.stopPropagation()
  if (skipDeleteConfirm) {
    confirmDelete(name)
  } else {
    setDeleteConfirmChecked(false)
    setPendingDelete(name)
  }
}

function renderItem(name) {
  const isFav = favorites.includes(name)
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
```

- [ ] **Шаг 3: Заменить рендер списка на разбивку избранное/остальные**

Заменить блок `<List>...</List>` в return:

```jsx
{(() => {
  const favList = projects.filter(n => favorites.includes(n))
  const otherList = projects.filter(n => !favorites.includes(n))
  return (
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
  )
})()}
```

- [ ] **Шаг 4: Коммит**

```bash
git add src/renderer/screens/HomeScreen.jsx
git commit -m "feat: иконки звёздочки и корзины в списке проектов, разбивка на избранное/остальные"
```

---

## Task 6: HomeScreen — диалог удаления

**Files:**
- Modify: `src/renderer/screens/HomeScreen.jsx`

- [ ] **Шаг 1: Добавить импорт Checkbox и FormControlLabel**

```js
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, AppBar, Toolbar, IconButton, Divider,
  Checkbox, FormControlLabel,
} from '@mui/material'
```

- [ ] **Шаг 2: Реализовать handleConfirmDelete**

После `handleDeleteClick` добавить:

```js
async function handleConfirmDelete() {
  const prefs = await window.api.loadPrefs()
  const nextFavorites = favorites.filter(f => f !== pendingDelete)
  await window.api.savePrefs({
    ...prefs,
    skipDeleteConfirm: deleteConfirmChecked ? true : prefs.skipDeleteConfirm,
    favorites: nextFavorites,
  })
  if (deleteConfirmChecked) setSkipDeleteConfirm(true)
  await window.api.deleteProject(pendingDelete)
  setFavorites(nextFavorites)
  setProjects(prev => prev.filter(p => p !== pendingDelete))
  setPendingDelete(null)
}
```

- [ ] **Шаг 3: Добавить диалог удаления в JSX**

После закрывающего тега диалога создания проекта (`</Dialog>`) добавить:

```jsx
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
```

- [ ] **Шаг 4: Запустить приложение и проверить вручную**

```bash
npm start
```

Проверить:
- Клик по корзине → диалог открывается с именем проекта
- Отмена → диалог закрывается, проект остаётся
- Удалить без чекбокса → проект исчезает, диалог появится снова при следующем удалении
- Удалить с чекбоксом → проект исчезает, следующее удаление происходит без диалога
- Перезапустить приложение → флаг "не спрашивать" сохранился

- [ ] **Шаг 5: Коммит**

```bash
git add src/renderer/screens/HomeScreen.jsx
git commit -m "feat: диалог подтверждения удаления с настройкой «больше не спрашивать»"
```

---

## Task 7: Ручная проверка избранного

- [ ] **Шаг 1: Запустить приложение**

```bash
npm start
```

- [ ] **Шаг 2: Проверить избранное**

- Клик по звёздочке → иконка становится заполненной, проект перемещается вверх списка
- Повторный клик → убирает из избранного, проект возвращается вниз
- Перезапустить приложение → избранное сохранилось
- Удалить избранный проект → он исчезает из обоих блоков

- [ ] **Шаг 3: Финальный коммит**

```bash
git add -A
git commit -m "feat: удаление проектов и избранное на главном экране"
```
