import fs from 'fs'
import path from 'path'

import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '../shared/defaults'
import type { Prefs } from '../shared/types'

const DEFAULTS: Prefs = { favorites: [], skipDeleteConfirm: false, defaultFont: DEFAULT_FONT, defaultFontSize: DEFAULT_FONT_SIZE, customFonts: [] }

export function loadPrefs(dir: string): Prefs {
  const file = path.join(dir, 'prefs.json')
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(dir: string, prefs: Partial<Prefs>): void {
  const file = path.join(dir, 'prefs.json')
  fs.writeFileSync(file, JSON.stringify(prefs, null, 2))
}
