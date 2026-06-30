import fs from 'fs'
import path from 'path'
import os from 'os'
import fontkit from '@pdf-lib/fontkit'
import type { FontEntry } from '../shared/types'

export function getSystemFontDirs(platform: string, homeDir: string): string[] {
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

function collectFonts(dir: string): FontEntry[] {
  const result: FontEntry[] = []
  if (!fs.existsSync(dir)) return result
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        result.push(...collectFonts(fullPath))
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ext === '.ttf' || ext === '.otf') {
          let name: string
          try {
            const font = fontkit.create(fs.readFileSync(fullPath))
            name = font.familyName || path.basename(entry.name, ext)
          } catch {
            name = path.basename(entry.name, ext)
          }
          result.push({ name, path: fullPath })
        }
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return result
}

export function scanFontDirs(dirs: string[]): FontEntry[] {
  const seen = new Set<string>()
  const result: FontEntry[] = []
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

export function scanSystemFonts(): FontEntry[] {
  return scanFontDirs(getSystemFontDirs(process.platform, os.homedir()))
}
