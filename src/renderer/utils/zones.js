export function applyProjectSettings(zones, patch, effectiveOldFont, effectiveOldFontSize) {
  return zones.map(zone => {
    const updates = {}
    if ('projectFont' in patch && zone.font === effectiveOldFont) {
      updates.font = patch.projectFont
    }
    if ('projectFontSize' in patch && zone.fontSize === effectiveOldFontSize) {
      updates.fontSize = patch.projectFontSize
    }
    return Object.keys(updates).length > 0 ? { ...zone, ...updates } : zone
  })
}
