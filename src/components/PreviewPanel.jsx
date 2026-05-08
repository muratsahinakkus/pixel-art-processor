import { useState } from 'react'
import OriginalView from './OriginalView.jsx'
import MergedView from './MergedView.jsx'

const ZOOM_LEVELS = [0.25, 0.5, 1, 2, 4, 8, 12, 20]

function zoomLabel(z) {
  if (z < 1) return `${z}×`
  return `${z}×`
}

export default function PreviewPanel({ rawRects, gridData, mergedData, highlightedIds }) {
  const [zoom, setZoom] = useState(0.25)

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <span className="zoom-label-text">Zoom</span>
        <div className="zoom-buttons" role="group" aria-label="Zoom seviyesi">
          {ZOOM_LEVELS.map(z => (
            <button
              key={z}
              className={`zoom-btn${zoom === z ? ' zoom-btn--active' : ''}`}
              onClick={() => setZoom(z)}
            >
              {zoomLabel(z)}
            </button>
          ))}
        </div>
      </div>

      <div className="preview-columns">
        <div className="preview-col">
          <div className="preview-col-label">
            Orijinal
            <span className="preview-col-sub">boşluklu · {gridData.colCount}×{gridData.rowCount}</span>
          </div>
          <div className="preview-canvas-wrap">
            <OriginalView
              rawRects={rawRects}
              gridData={gridData}
              zoom={zoom}
              highlightedIds={highlightedIds}
            />
          </div>
        </div>

        <div className="preview-divider" aria-hidden="true" />

        <div className="preview-col">
          <div className="preview-col-label">
            Birleşik
            <span className="preview-col-sub">
              temizlenmiş · {mergedData.colCount}×{mergedData.rowCount}
            </span>
          </div>
          <div className="preview-canvas-wrap">
            <MergedView mergedData={mergedData} zoom={zoom} />
          </div>
        </div>
      </div>
    </section>
  )
}
