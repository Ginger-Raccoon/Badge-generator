# Загрузка локальных шрифтов

## Цель

Добавить возможность использовать шрифты, установленные на компьютере пользователя, в дополнение к встроенным Roboto и PT Serif.

## Архитектура

Три слоя изменений:

1. **Main process (`ipc.js`)** — два новых IPC-хандлера для сканирования и загрузки шрифтов, плюс один для получения используемых шрифтов.
2. **Prefs** — новое поле `customFonts: [{name: string, path: string}]`.
3. **Renderer** — диалог управления шрифтами в `SettingsDrawer`, динамические селекторы шрифтов, расширенный генератор PDF.

## Main process

### Новые IPC-хандлеры

**`fonts:scanSystem`**
- Сканирует системные папки шрифтов, фильтрует файлы `.ttf` и `.otf`
- Возвращает `[{name: string, path: string}]`, отсортированный по имени
- Дубликаты по имени устраняются — берётся первое вхождение (порядок папок как в списке выше)
- Отображаемое имя = имя файла без расширения
- Папки по платформам:
  - macOS: `~/Library/Fonts`, `/Library/Fonts`, `/System/Library/Fonts`
  - Windows: `C:\Windows\Fonts`
  - Linux: `~/.fonts`, `/usr/share/fonts`

**`fonts:loadCustom(paths: string[])`**
- Принимает массив путей к файлам шрифтов
- Возвращает `[{name: string, bytes: number[]}]`
- Используется перед генерацией PDF

**`projects:usedFonts`**
- Читает все `project.json` в `PROJECTS_DIR`
- Собирает все значения `projectFont` и `zone.font` по всем зонам
- Возвращает `string[]` — уникальные имена используемых шрифтов

### Preload (`preload.js`)

Три новых метода в `window.api`:
- `scanSystemFonts()` → `fonts:scanSystem`
- `loadCustomFonts(paths)` → `fonts:loadCustom`
- `getUsedFonts()` → `projects:usedFonts`

### Prefs

Новое поле `customFonts: [{name: string, path: string}]`. Сохраняется и загружается через существующий механизм `prefs:save` / `prefs:load`. Значение по умолчанию — пустой массив — добавляется в начальное состояние prefs в `HomeScreen` (рядом с `favorites`, `defaultFont` и т.д.).

## UI — SettingsDrawer

### Кнопка

Между селектором шрифта и полем размера шрифта добавляется кнопка **«Управление шрифтами»** (outlined, fullWidth).

### Диалог управления шрифтами

Открывается по клику. При открытии параллельно вызываются `scanSystemFonts()` и `getUsedFonts()`. Пока идёт загрузка — кнопка disabled со спиннером.

Содержимое диалога:
- Прокручиваемый список шрифтов с чекбоксами (max-height)
- Шрифты из `prefs.customFonts` — предварительно отмечены
- Шрифты, возвращённые `getUsedFonts()` — checkbox disabled, подпись «используется»
- Кнопки «Отмена» и «Применить»

«Применить» сохраняет новый список в `prefs.customFonts` через `onPrefsChange`.

### Селекторы шрифтов

Оба селектора (`SettingsDrawer` и `ProjectSettingsDrawer`) строят список пунктов динамически:

```
[Roboto, PT Serif, ...prefs.customFonts]
```

`ProjectSettingsDrawer` уже получает `prefs` — изменений в пропсах не требуется.

## Генератор PDF (`generator.js`)

`fontBytes` расширяется:

```js
fontBytes: {
  roboto: number[],
  ptSerif: number[],
  custom: [{ name: string, bytes: number[] }]  // новое
}
```

При старте генерации все кастомные шрифты встраиваются и добавляются в `fonts`:

```js
for (const { name, bytes } of (fontBytes.custom ?? [])) {
  fonts[name] = await outputDoc.embedFont(new Uint8Array(bytes))
}
```

Существующий fallback `fonts[zone.font] ?? robotoFont` продолжает работать без изменений.

### Вызов генератора

В Editor перед вызовом `generatePdf` добавляется загрузка кастомных шрифтов:

```js
const customFontBytes = await window.api.loadCustomFonts(
  prefs.customFonts.map(f => f.path)
)
fontBytes.custom = customFontBytes
```

## Что не меняется

- Встроенные шрифты Roboto и PT Serif — без изменений
- Логика `prefs:load` / `prefs:save` — без изменений
- Пропсы `ProjectSettingsDrawer` — без изменений
- Fallback в генераторе при неизвестном шрифте — без изменений
