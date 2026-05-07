# Дизайн: настройки шрифта на уровне проекта

## Цель

Добавить настройки шрифта и кегля на уровне проекта. Они приоритетнее глобальных настроек. При изменении настроек проекта все зоны с «дефолтным» значением обновляются автоматически; зоны с вручную изменёнными значениями не трогаются.

## Данные

`project.json` получает два новых опциональных поля:

```json
{
  "projectFont": "Roboto",
  "projectFontSize": 18
}
```

- Значение `null` (или отсутствие поля) означает «использовать глобальные настройки».
- Новые проекты создаются с `projectFont: null`, `projectFontSize: null`.
- Сохранение — через существующий механизм `saveProject()` → `project.json` на диске.

## Приоритет

```
per-zone (ручная правка) > project settings > global prefs > DEFAULT_FONT / DEFAULT_FONT_SIZE
```

Эффективный дефолт при создании новой зоны:
```js
effectiveFont     = project.projectFont     ?? prefs.defaultFont     ?? DEFAULT_FONT
effectiveFontSize = project.projectFontSize ?? prefs.defaultFontSize ?? DEFAULT_FONT_SIZE
```

## Логика обновления зон

Срабатывает только при изменении настроек проекта (не глобальных prefs).

При изменении `projectFont` с `oldVal` на `newVal`:
- `effectiveOld = oldVal ?? prefs.defaultFont`
- Для каждой зоны: `zone.font === effectiveOld` → обновить до `newVal`
- Зоны где `zone.font !== effectiveOld` — не трогать

То же самое для `projectFontSize`. Логика — в `handleProjectSettingsChange` внутри `Editor.jsx`.

Изменение глобальных prefs (`SettingsDrawer`) существующие зоны не затрагивает.

## UI

### Точка входа

В полоске навигации страниц (`Editor.jsx`) справа добавляется `IconButton` с `SettingsIcon`. Кнопка всегда видна (не зависит от наличия строк Excel).

### ProjectSettingsDrawer

Новый компонент `src/renderer/components/ProjectSettingsDrawer.jsx`. По образцу `SettingsDrawer`:
- Drawer справа, ширина 320px
- Заголовок «Настройки проекта» + кнопка закрытия
- Селектор шрифта (Roboto / PT Serif)
- Поле размера шрифта (число, валидация 6–200, применяется по `onBlur`)
- Показывает эффективные значения (с учётом fallback на global prefs)

Компонент не знает о логике обновления зон — только вызывает `onProjectSettingsChange(patch)`.

## Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/main/ipc.js` | `projects:create` — добавить `projectFont: null, projectFontSize: null` в шаблон |
| `src/renderer/components/ProjectSettingsDrawer.jsx` | Новый компонент |
| `src/renderer/screens/Editor.jsx` | Иконка в полоске, `handleProjectSettingsChange`, передача `effectiveDefaultFont`/`effectiveDefaultFontSize` в PSDViewer |

`ZoneList.jsx`, `SettingsDrawer.jsx`, `prefs.js` — не трогаем.
