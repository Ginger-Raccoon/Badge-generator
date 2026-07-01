export interface Zone {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  column: string
  font: string
  fontSize: number
  splitIndex: number | null
  splitChar: string
}

export type ColumnSplits = Record<string, string>

export type PageFormat = 'A4' | 'Letter' | 'custom'

export interface PageLayout {
  pageFormat: PageFormat
  customWidthMm: number | null
  customHeightMm: number | null
  columns: number
  rows: number
  marginMm: number
  gapMm: number
  cropMarks: boolean
  badgeScalePercent?: number
}

export interface Project {
  version: number
  name: string
  templatePsdPath: string | null
  templateDpi: number | null
  excelPath: string | null
  columns: string[]
  zones: Zone[]
  projectFont: string | null
  projectFontSize: number | null
  columnSplits?: ColumnSplits
  pageLayout?: PageLayout | null
}

export interface FontEntry {
  name: string
  path: string
}

export interface CustomFontEntry {
  name: string
  bytes: number[]
}

export interface Prefs {
  favorites: string[]
  skipDeleteConfirm: boolean
  defaultFont: string
  defaultFontSize: number
  customFonts: FontEntry[]
}

export interface FontBytes {
  roboto: number[]
  ptSerif: number[]
  custom?: CustomFontEntry[]
}

export type ExcelRow = Record<string, string | number>

export type TemplateImageFormat = 'png' | 'jpeg'

export interface ParsedPsd {
  imageBytes: Uint8Array<ArrayBuffer>
  imageFormat: TemplateImageFormat
  width: number
  height: number
  resolution: number
  resolutionMissing: boolean
}

export interface DialogFilter {
  name: string
  extensions: string[]
}

export interface BadgeApi {
  listProjects(): Promise<string[]>
  createProject(name: string): Promise<Project>
  loadProject(name: string): Promise<Project>
  saveProject(name: string, data: Project): Promise<void>
  openFileDialog(filters: DialogFilter[]): Promise<string | null>
  saveFileDialog(filters: DialogFilter[]): Promise<string | null>
  readFileBytes(filePath: string): Promise<Uint8Array>
  writeFileBytes(filePath: string, data: number[]): Promise<void>
  fileExists(filePath: string): Promise<boolean>
  loadFonts(): Promise<FontBytes>
  scanSystemFonts(): Promise<FontEntry[]>
  loadCustomFonts(paths: string[]): Promise<CustomFontEntry[]>
  getUsedFonts(): Promise<string[]>
  loadPrefs(): Promise<Prefs>
  savePrefs(prefs: Prefs): Promise<void>
  deleteProject(name: string): Promise<void>
  deleteAllProjects(): Promise<void>
}
