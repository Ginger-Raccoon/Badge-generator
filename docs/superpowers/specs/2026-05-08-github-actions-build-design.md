# GitHub Actions — автоматическая сборка под macOS и Windows

## Цель

Настроить CI-пайплайн, который по ручному запуску собирает установочные файлы приложения для macOS (.zip) и Windows (Setup.exe) и публикует их как GitHub Actions артефакты.

## Ограничения

- Подпись кода не настраивается. Пользователи macOS увидят предупреждение Gatekeeper, пользователи Windows — SmartScreen. Для внутреннего использования приемлемо.
- Сборка запускается только вручную (не при каждом коммите).

## Архитектура

Один файл `.github/workflows/build.yml` с matrix strategy. macOS и Windows собираются параллельно в независимых jobs.

## Триггер

`workflow_dispatch` — кнопка «Run workflow» на вкладке Actions в GitHub.

## Матрица

| Runner | Maker | Артефакт |
|--------|-------|---------|
| `macos-latest` | `maker-dmg` | `.dmg` |
| `windows-latest` | `maker-squirrel` | `Setup.exe` |

## Шаги каждого job

1. `actions/checkout@v4` — клонировать репозиторий
2. `actions/setup-node@v4` — Node.js 20, кеш `npm`
3. `npm ci` — установить зависимости из lock-файла
4. `npm run make` — Electron Forge определяет платформу автоматически и запускает нужный maker
5. `actions/upload-artifact@v4` — загрузить содержимое `out/make/` как артефакт с именем `build-<os>`

## Результат

После успешного запуска на вкладке Actions появляются два артефакта:
- `build-macos` — `.dmg` установщик
- `build-windows` — папка с `Setup.exe` и `nupkg`

Артефакты хранятся 90 дней, скачиваются вручную.

## Предварительные требования

- Установить `@electron-forge/maker-dmg` и добавить в `forge.config.cjs`
- Создать GitHub-репозиторий
- Добавить remote и запушить ветку `main`

После этого workflow будет доступен сразу — никаких секретов и дополнительных настроек не требуется.
