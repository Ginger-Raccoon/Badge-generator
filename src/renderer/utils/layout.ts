import type { PageFormat, PageLayout } from '../../shared/types'

export const PAGE_FORMATS_MM: Record<Exclude<PageFormat, 'custom'>, [number, number]> = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
}

export function getPageSizeMm(layout: PageLayout): [number, number] {
  if (layout.pageFormat === 'custom') {
    return [layout.customWidthMm ?? 210, layout.customHeightMm ?? 297]
  }
  return PAGE_FORMATS_MM[layout.pageFormat]
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * 25.4
}

export function computeAutoGrid(
  badgeWidthMm: number,
  badgeHeightMm: number,
  pageWidthMm: number,
  pageHeightMm: number,
  marginMm: number,
  gapMm: number
): { columns: number; rows: number } {
  const usableWidth = pageWidthMm - 2 * marginMm
  const usableHeight = pageHeightMm - 2 * marginMm
  const columns = Math.max(1, Math.floor((usableWidth + gapMm) / (badgeWidthMm + gapMm)))
  const rows = Math.max(1, Math.floor((usableHeight + gapMm) / (badgeHeightMm + gapMm)))
  return { columns, rows }
}

export function createDefaultPageLayout(badgeWidthPx: number, badgeHeightPx: number, dpi: number): PageLayout {
  const marginMm = 10
  const gapMm = 5
  const [pageWidthMm, pageHeightMm] = PAGE_FORMATS_MM.A4
  const badgeWidthMm = pxToMm(badgeWidthPx, dpi)
  const badgeHeightMm = pxToMm(badgeHeightPx, dpi)
  const { columns, rows } = computeAutoGrid(badgeWidthMm, badgeHeightMm, pageWidthMm, pageHeightMm, marginMm, gapMm)
  return { pageFormat: 'A4', customWidthMm: null, customHeightMm: null, columns, rows, marginMm, gapMm, cropMarks: false, badgeScalePercent: 100 }
}
