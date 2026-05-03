import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export default function PDFViewer({ pdfPath, zones, onZonesChange }) {
  const canvasRef = useRef(null)
  const [sizes, setSizes] = useState(null)

  useEffect(() => {
    if (!pdfPath) return
    let cancelled = false

    async function render() {
      const bytes = await window.api.readFileBytes(pdfPath)
      if (cancelled) return
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      setSizes({
        canvas: { width: viewport.width, height: viewport.height },
        pdf: { width: page.view[2], height: page.view[3] },
      })
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }

    render()
    return () => { cancelled = true }
  }, [pdfPath])

  if (!pdfPath) {
    return (
      <Box sx={{ p: 4, color: 'text.secondary' }}>
        <Typography>Загрузите PDF-шаблон</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  )
}
