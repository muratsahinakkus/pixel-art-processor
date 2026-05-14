import { useState } from 'react'
import { validate, fixAndDownload } from '../lib/validate.js'

function scrollToError(err, rawRects, gridData) {
  let targetEl

  if (err.type === 'WRONG_PIXEL_SIZE') {
    targetEl = document.getElementById(`pxrect-${err.rectIndex}`)
  } else if (err.type === 'WRONG_GAP_H') {
    // Scroll to the first rect found in the affected column
    const canonicalX = gridData.xClusters[err.colIndex]?.canonical
    if (canonicalX != null) {
      const idx = rawRects.findIndex(r => Math.abs(r.x - canonicalX) < gridData.pixelSize * 0.4)
      if (idx >= 0) targetEl = document.getElementById(`pxrect-${idx}`)
    }
  } else if (err.type === 'WRONG_GAP_V') {
    // Scroll to the first rect found in the affected row
    const canonicalY = gridData.yClusters[err.rowIndex]?.canonical
    if (canonicalY != null) {
      const idx = rawRects.findIndex(r => Math.abs(r.y - canonicalY) < gridData.pixelSize * 0.4)
      if (idx >= 0) targetEl = document.getElementById(`pxrect-${idx}`)
    }
  }

  if (!targetEl) return

  const wrap = targetEl.closest('.preview-canvas-wrap')
  if (!wrap) return

  const elRect = targetEl.getBoundingClientRect()
  const wrapRect = wrap.getBoundingClientRect()
  wrap.scrollBy({
    left: elRect.left - wrapRect.left - wrapRect.width / 2 + elRect.width / 2,
    top: elRect.top - wrapRect.top - wrapRect.height / 2 + elRect.height / 2,
    behavior: 'smooth',
  })
}

export default function ValidationPanel({ rawRects, gridData, onHighlight, fileName }) {
  const [pixelSize, setPixelSize] = useState(gridData.pixelSize)
  const [gapSize, setGapSize] = useState(gridData.gapSize)
  const [errors, setErrors] = useState(null)
  const [open, setOpen] = useState(false)

  function handleValidate() {
    const errs = validate(rawRects, gridData, Number(pixelSize), Number(gapSize))
    setErrors(errs)
    setOpen(true)
    onHighlight(errs.map(e => e.id))
    window.gtag?.('event', 'validate', { error_count: errs.length, pixel_size: Number(pixelSize), gap_size: Number(gapSize) })
  }

  function handleClear() {
    setErrors(null)
    onHighlight([])
  }

  const hasErrors = errors !== null && errors.length > 0
  const isClean = errors !== null && errors.length === 0

  return (
    <section className="validation-panel">
      <button
        className="validation-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="validation-toggle-icon">{open ? '▾' : '▸'}</span>
        Boyut Doğrulama
        {errors !== null && (
          <span className={`badge ${hasErrors ? 'badge--error' : 'badge--ok'}`}>
            {hasErrors ? `${errors.length} hata` : '✓ Temiz'}
          </span>
        )}
      </button>

      {open && (
        <div className="validation-body">
          <div className="validation-inputs">
            <label className="input-group">
              <span>Piksel boyutu</span>
              <div className="input-row">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={pixelSize}
                  onChange={e => setPixelSize(e.target.value)}
                  className="input-num"
                />
                <span className="input-unit">pt</span>
              </div>
            </label>
            <label className="input-group">
              <span>Boşluk (gap)</span>
              <div className="input-row">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={gapSize}
                  onChange={e => setGapSize(e.target.value)}
                  className="input-num"
                />
                <span className="input-unit">pt</span>
              </div>
            </label>
            <div className="validation-btns">
              <button className="btn-primary" onClick={handleValidate}>
                Doğrula
              </button>
              {errors !== null && (
                <button className="btn-ghost" onClick={handleClear}>
                  Temizle
                </button>
              )}
              {hasErrors && (
                <button
                  className="btn-fix"
                  onClick={() => {
                    fixAndDownload(gridData, Number(pixelSize), Number(gapSize), fileName)
                    window.gtag?.('event', 'fix_and_download', { error_count: errors.length })
                  }}
                  title={`Tüm pikselleri ${pixelSize}pt boyutuna, boşlukları ${gapSize}pt'ye snap'le`}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M13.5 2.5l-1-1-9 9-1 3 3-1 9-9-1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M11.5 3.5l1 1" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                  Düzelt ve İndir
                </button>
              )}
            </div>
          </div>

          {isClean && (
            <p className="validation-ok">
              ✓ Tüm piksel ve boşluk değerleri doğru!
            </p>
          )}

          {hasErrors && (
            <ul className="error-list">
              {errors.map(err => (
                <li
                  key={err.id}
                  className="error-item"
                  onMouseEnter={() => onHighlight([err.id])}
                  onMouseLeave={() => onHighlight(errors.map(e => e.id))}
                  onClick={() => scrollToError(err, rawRects, gridData)}
                >
                  <span className="error-dot" />
                  {err.message}
                </li>
              ))}
            </ul>
          )}

          <p className="validation-hint">
            Tespit edilen: piksel {gridData.pixelSize}pt · boşluk {gridData.gapSize}pt · 72pt = 1 inç
          </p>
        </div>
      )}
    </section>
  )
}
