# Дизайн: замена входного формата PDF → PSD

## Контекст

Приложение Badge Generator принимало PDF как шаблон и копировало его страницы в выходной PDF. Требование изменилось: шаблон теперь в формате PSD (Photoshop). Выходной формат остаётся PDF.

## Решение

Использовать `ag-psd` (чистый JS) для парсинга PSD в renderer-процессе. PSD сплющивается в PNG, который встраивается как фон каждой страницы выходного PDF. Слои PSD не используются.

Парсинг изолирован в одной утилите для возможности будущей замены на `sharp`.

---

## Архитектура

### 1. Новая утилита `src/renderer/utils/psd.js`

Единственное место где используется `ag-psd`. Контракт:

```js
parsePsd(bytes: Uint8Array) → Promise<{
  pngBytes: Uint8Array,  // сплющенный PSD как PNG
  width: number,         // нативная ширина в пикселях
  height: number,        // нативная высота в пикселях
  resolution: number,    // DPI из метаданных PSD (или 72 если не задан)
  resolutionMissing: boolean  // true если DPI не был задан в файле
}>
```

Для миграции на sharp — переписать только эту функцию и добавить IPC-обработчик в `main/ipc.js`.

### 2. Схема проекта (`project.json`)

Изменения в полях:
- `templatePdfPath` → `templatePsdPath`
- Добавляется `templateDpi: number | null` — ручной override DPI (null = использовать из файла)

### 3. `PDFViewer.jsx` → `PSDViewer.jsx`

- Вызывает `parsePsd(bytes)`, рисует PNG на `<canvas>` через `createImageBitmap`
- SVG-оверлей для рисования зон не меняется
- `sizes`: `{ canvas: { width, height }, psd: { width, height } }` — PSD пиксели вместо PDF points

### 4. `src/renderer/utils/coordinates.js`

Математика идентична текущей (линейное масштабирование между двумя прямоугольниками). Функции переименовываются: `canvasToPdf` → `canvasToDoc`, `pdfToCanvas` → `docToCanvas` — чтобы не вводить в заблуждение при работе с PSD координатами.

Зоны хранятся в пикселях PSD.

### 5. `src/renderer/utils/generator.js`

Вместо копирования страниц из PDF-шаблона:

1. Получает `{ pngBytes, width, height, resolution }` из `parsePsd`
2. Вычисляет размер PDF-страницы: `pageWidth = width * 72 / dpi`, `pageHeight = height * 72 / dpi`
3. Создаёт чистую страницу нужного размера
4. Встраивает PNG как фон на всю страницу через `pdfDoc.embedPng`
5. Рисует текст: координаты зон масштабируются `x_pdf = x_psd * 72 / dpi`

DPI для генерации = `project.templateDpi ?? parsedResolution`.

### 6. `Editor.jsx`

- `handleLoadPdf` → `handleLoadPsd`, фильтр диалога `['psd']`
- Проверка файлов при старте: `templatePsdPath` вместо `templatePdfPath`
- Кнопка в тулбаре показывает имя PSD-файла

---

## Предупреждение о подозрительном DPI

### Условия показа

Баннер появляется при загрузке PSD если выполняется хотя бы одно:
- DPI не задан в файле (`resolutionMissing: true`)
- DPI ≤ 96 (характерно для экранных файлов)

### UX

Постоянный `Alert`-баннер под тулбаром (не Snackbar). Видим пока пользователь не закроет или не применит DPI.

Содержимое баннера:
- Заголовок: "Подозрительный DPI" или "DPI не задан в файле"
- Описание проблемы с обнаруженным значением
- Поле ввода с текущим DPI + кнопка "Применить" — сохраняет `templateDpi` в `project.json`
- Инструкция: "Или исправьте в Photoshop: Image → Image Size → Resolution (без галки Resample), затем перезагрузите файл"
- Кнопка × — скрывает баннер, DPI остаётся как есть

Применённый вручную DPI (`templateDpi`) перекрывает значение из файла PSD во всех вычислениях.

---

## Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/renderer/utils/psd.js` | Создать |
| `src/renderer/utils/coordinates.js` | Переименовать функции |
| `src/renderer/components/PDFViewer.jsx` | Переписать → PSDViewer.jsx |
| `src/renderer/utils/generator.js` | Переписать логику шаблона |
| `src/renderer/screens/Editor.jsx` | Обновить: PSD диалог, баннер DPI |
| `src/main/ipc.js` | Без изменений |

## Не затронуто

- `ZoneList.jsx`, `ZoneRect.jsx` — без изменений
- `excel.js` — без изменений
- IPC-слой — без изменений
- Тесты coordinates и excel — без изменений; тест generator потребует обновления мока

---

## Зависимости

```
ag-psd  — парсинг PSD, чистый JS
```

Новых нативных зависимостей нет.
