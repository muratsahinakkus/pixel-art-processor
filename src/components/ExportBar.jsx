import { buildSVGString, downloadSVG } from '../lib/exportSVG.js'

function countColors(rects) {
  const hexSet = new Set()
  for (const r of rects) {
    const toHex = v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
    hexSet.add(`${toHex(r.color.r)}${toHex(r.color.g)}${toHex(r.color.b)}`)
  }
  return hexSet.size
}

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function ExportBar({ mergedData, spacedData, fileName }) {
  const { mergedRects, totalWidth, totalHeight, colCount, rowCount, pixelSize } = mergedData
  const colorCount = countColors(mergedRects)

  function handleDownloadMerged() {
    const svg = buildSVGString(mergedRects, totalWidth, totalHeight)
    downloadSVG(svg, fileName, '_merged')
  }

  function handleDownloadSpaced() {
    if (!spacedData) return
    const { spacedRects, totalWidth: w, totalHeight: h } = spacedData
    const svg = buildSVGString(spacedRects, w, h)
    downloadSVG(svg, fileName, '_spaced')
  }

  return (
    <footer className="export-bar">
      <div className="export-stats">
        <span>{mergedRects.length} piksel</span>
        <span className="sep">·</span>
        <span>{colCount}×{rowCount} grid</span>
        <span className="sep">·</span>
        <span>{colorCount} renk</span>
        <span className="sep">·</span>
        <span>{Math.round(totalWidth)}×{Math.round(totalHeight)} pt</span>
      </div>
      <div className="export-buttons">
        <button className="btn-download btn-download--secondary" onClick={handleDownloadSpaced}>
          <DownloadIcon />
          SVG İndir (Boşluklu)
        </button>
        <button className="btn-download" onClick={handleDownloadMerged}>
          <DownloadIcon />
          SVG İndir (Birleşik)
        </button>
      </div>
    </footer>
  )
}
