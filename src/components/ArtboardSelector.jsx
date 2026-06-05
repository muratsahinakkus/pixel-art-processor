import { useState, useRef } from 'react'

export default function ArtboardSelector({ artboards, fileName, onSelect, onBack }) {
  const defaultNames = () =>
    Object.fromEntries(artboards.map((ab, i) => [ab.pageNum, `Artboard ${i + 1}`]))
  const [names, setNames] = useState(defaultNames)
  const [editingPage, setEditingPage] = useState(null)
  const inputRef = useRef(null)

  function startEdit(e, pageNum) {
    e.stopPropagation()
    setEditingPage(pageNum)
    // focus happens via ref after render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit(pageNum, value) {
    const trimmed = value.trim()
    setNames(prev => ({ ...prev, [pageNum]: trimmed || `Artboard ${pageNum}` }))
    setEditingPage(null)
  }

  function handleKeyDown(e, pageNum) {
    if (e.key === 'Enter') commitEdit(pageNum, e.target.value)
    if (e.key === 'Escape') setEditingPage(null)
  }

  return (
    <div className="artboard-selector">
      <div className="artboard-selector-header">
        <p className="artboard-selector-title">Artboard seç</p>
        <p className="artboard-selector-sub">
          <strong>{fileName}</strong> dosyasında {artboards.length} artboard bulundu.
          İsme tıklayarak düzenleyebilirsin.
        </p>
      </div>

      <div className="artboard-grid">
        {artboards.map((ab) => (
          <button
            key={ab.pageNum}
            className="artboard-card"
            onClick={() => onSelect(ab.pageNum, names[ab.pageNum])}
          >
            <div className="artboard-thumb-wrap">
              <img
                src={ab.thumbnail}
                alt={names[ab.pageNum]}
                className="artboard-thumb"
              />
            </div>
            <div className="artboard-card-label">
              {editingPage === ab.pageNum ? (
                <input
                  ref={inputRef}
                  className="artboard-name-input"
                  defaultValue={names[ab.pageNum]}
                  onClick={e => e.stopPropagation()}
                  onBlur={e => commitEdit(ab.pageNum, e.target.value)}
                  onKeyDown={e => handleKeyDown(e, ab.pageNum)}
                  autoFocus
                />
              ) : (
                <span
                  className="artboard-card-name artboard-card-name--editable"
                  onClick={e => startEdit(e, ab.pageNum)}
                  title="İsmi düzenle"
                >
                  {names[ab.pageNum]}
                  <span className="artboard-edit-icon">✎</span>
                </span>
              )}
              <span className="artboard-card-size">{ab.width} × {ab.height} pt</span>
            </div>
          </button>
        ))}
      </div>

      <button className="btn-ghost artboard-back" onClick={onBack}>
        ← Farklı dosya yükle
      </button>
    </div>
  )
}
