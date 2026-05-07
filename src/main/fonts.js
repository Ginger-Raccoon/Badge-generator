import fs from 'fs'
import path from 'path'
import os from 'os'

export function getSystemFontDirs(platform, homeDir) {
  if (platform === 'darwin') {
    return [
      path.join(homeDir, 'Library', 'Fonts'),
      '/Library/Fonts',
      '/System/Library/Fonts',
    ]
  }
  if (platform === 'win32') {
    return ['C:\\Windows\\Fonts']
  }
  return [
    path.join(homeDir, '.fonts'),
    '/usr/share/fonts',
  ]
}

function collectFonts(dir) {
  const result = []
  if (!fs.existsSync(dir)) return result
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        result.push(...collectFonts(fullPath))
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ext === '.ttf' || ext === '.otf') {
          result.push({ name: path.basename(entry.name, ext), path: fullPath })
        }
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return result
}

export function scanFontDirs(dirs) {
  const seen = new Set()
  const result = []
  for (const dir of dirs) {
    for (const font of collectFonts(dir)) {
      if (!seen.has(font.name)) {
        seen.add(font.name)
        result.push(font)
      }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

export function scanSystemFonts() {
  return scanFontDirs(getSystemFontDirs(process.platform, os.homedir()))
}
