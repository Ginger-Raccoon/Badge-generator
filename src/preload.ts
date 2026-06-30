import { contextBridge, ipcRenderer } from 'electron'
import type { BadgeApi } from './shared/types'

const api: BadgeApi = {
  listProjects:      ()             => ipcRenderer.invoke('projects:list'),
  createProject:     (name)         => ipcRenderer.invoke('projects:create', name),
  loadProject:       (name)         => ipcRenderer.invoke('projects:load', name),
  saveProject:       (name, data)   => ipcRenderer.invoke('projects:save', name, data),
  openFileDialog:    (filters)      => ipcRenderer.invoke('dialog:open', filters),
  saveFileDialog:    (filters)      => ipcRenderer.invoke('dialog:save', filters),
  readFileBytes:     (filePath)     => ipcRenderer.invoke('fs:readBytes', filePath),
  writeFileBytes:    (filePath, d)  => ipcRenderer.invoke('fs:writeBytes', filePath, d),
  fileExists:        (filePath)     => ipcRenderer.invoke('fs:exists', filePath),
  loadFonts:         ()             => ipcRenderer.invoke('fonts:loadAll'),
  scanSystemFonts:   ()             => ipcRenderer.invoke('fonts:scanSystem'),
  loadCustomFonts:   (paths)        => ipcRenderer.invoke('fonts:loadCustom', paths),
  getUsedFonts:      ()             => ipcRenderer.invoke('projects:usedFonts'),
  loadPrefs:         ()             => ipcRenderer.invoke('prefs:load'),
  savePrefs:         (prefs)        => ipcRenderer.invoke('prefs:save', prefs),
  deleteProject:     (name)         => ipcRenderer.invoke('projects:delete', name),
  deleteAllProjects: ()             => ipcRenderer.invoke('projects:deleteAll'),
}

contextBridge.exposeInMainWorld('api', api)
