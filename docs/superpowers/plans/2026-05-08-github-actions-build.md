# GitHub Actions — автоматическая сборка — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Настроить ручной CI-пайплайн, собирающий `.dmg` (macOS) и `Setup.exe` (Windows) через GitHub Actions.

**Architecture:** Один workflow-файл с `workflow_dispatch` и matrix strategy (`macos-latest` / `windows-latest`). Каждый job запускает `npm run make` — Electron Forge сам определяет платформу. Артефакты загружаются через `upload-artifact`. Для macOS добавляется `@electron-forge/maker-dmg`.

**Tech Stack:** Electron Forge 7, GitHub Actions, @electron-forge/maker-dmg, @electron-forge/maker-squirrel

---

## Файловая карта

| Действие | Файл | Что меняется |
|----------|------|--------------|
| Изменить | `forge.config.cjs` | Заменить maker-zip на maker-dmg |
| Изменить | `package.json` | Добавить @electron-forge/maker-dmg в devDependencies |
| Создать | `.github/workflows/build.yml` | Workflow с matrix macOS + Windows |

---

## Task 1: maker-dmg — установить и подключить

**Files:**
- Modify: `package.json`
- Modify: `forge.config.cjs`

- [ ] **Step 1: Установить пакет**

```bash
npm install --save-dev @electron-forge/maker-dmg
```

Ожидаемый результат: пакет добавлен в `package.json` → `devDependencies`.

- [ ] **Step 2: Заменить maker-zip на maker-dmg в forge.config.cjs**

В `forge.config.cjs` найти блок maker-zip:

```js
// было:
{
  name: '@electron-forge/maker-zip',
  platforms: ['darwin'],
},
```

Заменить на:

```js
// стало:
{
  name: '@electron-forge/maker-dmg',
  config: {},
},
```

- [ ] **Step 3: Прогнать тесты — убедиться, что ничего не сломалось**

```bash
npm test
```

Ожидаемый результат: все тесты проходят.

- [ ] **Step 4: Коммит**

```bash
git add forge.config.cjs package.json package-lock.json
git commit -m "feat: заменить maker-zip на maker-dmg для macOS"
```

---

## Task 2: .github/workflows/build.yml — workflow файл

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Создать папку и файл**

```bash
mkdir -p .github/workflows
```

Создать `.github/workflows/build.yml`:

```yaml
name: Build

on:
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Make
        run: npm run make

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: out/make/
```

- [ ] **Step 2: Прогнать тесты**

```bash
npm test
```

Ожидаемый результат: все тесты проходят.

- [ ] **Step 3: Коммит**

```bash
git add .github/workflows/build.yml
git commit -m "feat: GitHub Actions workflow для сборки macOS и Windows"
```

---

## Task 3: Создать GitHub-репозиторий и запушить

Этот шаг выполняется вручную или через `gh` CLI.

- [ ] **Step 1: Создать репозиторий на GitHub**

Вариант A — через `gh` CLI (если установлен):

```bash
gh repo create badge-generator --private --source=. --remote=origin --push
```

Вариант B — вручную:
1. Зайти на github.com → New repository → назвать `badge-generator`
2. Выполнить:

```bash
git remote add origin https://github.com/<username>/badge-generator.git
git push -u origin main
```

- [ ] **Step 2: Убедиться, что workflow доступен**

Зайти на GitHub → репозиторий → вкладка **Actions**.
Должен появиться workflow **Build** с кнопкой **Run workflow**.

- [ ] **Step 3: Запустить сборку вручную**

Нажать **Run workflow** → выбрать ветку `main` → **Run workflow**.

Ожидаемый результат: два параллельных job (`macos-latest`, `windows-latest`) успешно завершаются. В разделе **Artifacts** появляются `build-macos-latest` и `build-windows-latest`.
