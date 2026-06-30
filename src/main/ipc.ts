import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { loadPrefs, savePrefs } from './prefs'
import { scanSystemFonts } from './fonts'
import fontkit from '@pdf-lib/fontkit'
import type { DialogFilter, Project, Prefs } from '../shared/types'

const PROJECTS_DIR = path.join(app.getPath('documents'), 'BadgeGenerator')

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  }
}

function getFontsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'fonts')
  }
  return path.join(app.getAppPath(), 'public', 'fonts')
}

ipcMain.handle('projects:list', () => {
  ensureProjectsDir()
  return fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
})

ipcMain.handle('projects:create', (_, name: string) => {
  ensureProjectsDir()
  const projectDir = path.join(PROJECTS_DIR, name)
  fs.mkdirSync(projectDir, { recursive: true })
  const project: Project = {
    version: 1,
    name,
    templatePsdPath: null,
    templateDpi: null,
    excelPath: null,
    columns: [],
    zones: [],
    projectFont: null,
    projectFontSize: null,
  }
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
  return project
})

ipcMain.handle('projects:load', (_, name: string) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
})

ipcMain.handle('projects:save', (_, name: string, data: Project) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
})

ipcMain.handle('dialog:open', async (_, filters: DialogFilter[]) => {
  const result = await dialog.showOpenDialog({ filters, properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:save', async (_, filters: DialogFilter[]) => {
  const result = await dialog.showSaveDialog({ filters })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('fs:readBytes', (_, filePath: string) => {
  return fs.readFileSync(filePath)
})

ipcMain.handle('fs:writeBytes', (_, filePath: string, data: number[]) => {
  fs.writeFileSync(filePath, Buffer.from(data))
})

ipcMain.handle('fs:exists', (_, filePath: string) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('fonts:loadAll', () => {
  const dir = getFontsDir()
  return {
    roboto: Array.from(fs.readFileSync(path.join(dir, 'Roboto-Regular.ttf'))),
    ptSerif: Array.from(fs.readFileSync(path.join(dir, 'PTSerif-Regular.ttf'))),
  }
})

ipcMain.handle('prefs:load', () => {
  ensureProjectsDir()
  return loadPrefs(PROJECTS_DIR)
})

ipcMain.handle('prefs:save', (_, prefs: Prefs) => {
  ensureProjectsDir()
  savePrefs(PROJECTS_DIR, prefs)
})

ipcMain.handle('projects:delete', (_, name: string) => {
  const projectDir = path.join(PROJECTS_DIR, name)
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true })
  }
})

ipcMain.handle('projects:deleteAll', () => {
  ensureProjectsDir()
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
  for (const entry of entries) {
    fs.rmSync(path.join(PROJECTS_DIR, entry.name), { recursive: true })
  }
})

ipcMain.handle('fonts:scanSystem', () => {
  return scanSystemFonts()
})

ipcMain.handle('fonts:loadCustom', (_, paths: string[]) => {
  return paths.map(filePath => {
    const bytes = fs.readFileSync(filePath)
    let name: string
    try {
      name = fontkit.create(bytes).familyName || path.basename(filePath, path.extname(filePath))
    } catch {
      name = path.basename(filePath, path.extname(filePath))
    }
    return { name, bytes: Array.from(bytes) }
  })
})

ipcMain.handle('projects:usedFonts', () => {
  ensureProjectsDir()
  const names = new Set<string>()
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
  for (const entry of entries) {
    const file = path.join(PROJECTS_DIR, entry.name, 'project.json')
    if (!fs.existsSync(file)) continue
    try {
      const project: Project = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (project.projectFont) names.add(project.projectFont)
      for (const zone of project.zones ?? []) {
        if (zone.font) names.add(zone.font)
      }
    } catch {}
  }
  return Array.from(names)
})
