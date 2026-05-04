import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { loadPrefs, savePrefs } from './prefs.js'

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

ipcMain.handle('projects:create', (_, name) => {
  ensureProjectsDir()
  const projectDir = path.join(PROJECTS_DIR, name)
  fs.mkdirSync(projectDir, { recursive: true })
  const project = {
    version: 1,
    name,
    templatePsdPath: null,
    templateDpi: null,
    excelPath: null,
    columns: [],
    zones: [],
  }
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2))
  return project
})

ipcMain.handle('projects:load', (_, name) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
})

ipcMain.handle('projects:save', (_, name, data) => {
  const filePath = path.join(PROJECTS_DIR, name, 'project.json')
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
})

ipcMain.handle('dialog:open', async (_, filters) => {
  const result = await dialog.showOpenDialog({ filters, properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:save', async (_, filters) => {
  const result = await dialog.showSaveDialog({ filters })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('fs:readBytes', (_, filePath) => {
  return fs.readFileSync(filePath)
})

ipcMain.handle('fs:writeBytes', (_, filePath, data) => {
  fs.writeFileSync(filePath, Buffer.from(data))
})

ipcMain.handle('fs:exists', (_, filePath) => {
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

ipcMain.handle('prefs:save', (_, prefs) => {
  ensureProjectsDir()
  savePrefs(PROJECTS_DIR, prefs)
})

ipcMain.handle('projects:delete', (_, name) => {
  const projectDir = path.join(PROJECTS_DIR, name)
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true })
  }
})
