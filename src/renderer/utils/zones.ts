interface ProjectSettingsPatch {
  projectFont?: string
  projectFontSize?: number
}

export function applyProjectSettings<T extends { font: string; fontSize: number }>(
  zones: T[],
  patch: ProjectSettingsPatch,
  effectiveOldFont: string,
  effectiveOldFontSize: number,
): T[] {
  return zones.map(zone => {
    const updates: Partial<Pick<T, 'font' | 'fontSize'>> = {}
    if ('projectFont' in patch && zone.font === effectiveOldFont) {
      updates.font = patch.projectFont
    }
    if ('projectFontSize' in patch && zone.fontSize === effectiveOldFontSize) {
      updates.fontSize = patch.projectFontSize
    }
    return Object.keys(updates).length > 0 ? { ...zone, ...updates } : zone
  })
}
