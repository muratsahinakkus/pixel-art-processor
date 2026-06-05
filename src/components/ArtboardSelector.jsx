export default function ArtboardSelector({ artboards, fileName, onSelect, onBack }) {
  function displayName(ab) {
    return ab.name || `Artboard ${ab.pageNum}`
  }
  return (
    <div className="artboard-selector">
      <div className="artboard-selector-header">
        <p className="artboard-selector-title">Artboard seç</p>
        <p className="artboard-selector-sub">
          <strong>{fileName}</strong> dosyasında {artboards.length} artboard bulundu.
          Hangi artboard'u işlemek istiyorsun?
        </p>
      </div>

      <div className="artboard-grid">
        {artboards.map((ab) => (
          <button
            key={ab.pageNum}
            className="artboard-card"
            onClick={() => onSelect(ab.pageNum)}
          >
            <div className="artboard-thumb-wrap">
              <img
                src={ab.thumbnail}
                alt={displayName(ab)}
                className="artboard-thumb"
              />
            </div>
            <div className="artboard-card-label">
              <span className="artboard-card-name">{displayName(ab)}</span>
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
