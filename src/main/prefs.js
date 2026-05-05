import fs from 'fs'
import path from 'path'

const DEFAULTS = { favorites: [], skipDeleteConfirm: false, defaultFont: 'Roboto', defaultFontSize: 12 }

export function loadPrefs(dir) {
  const file = path.join(dir, 'prefs.json')
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(dir, prefs) {
  const file = path.join(dir, 'prefs.json')
  fs.writeFileSync(file, JSON.stringify(prefs, null, 2))
}
