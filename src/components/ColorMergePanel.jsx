import { useState, useMemo } from 'react'
import { extractColors, groupSimilarColors, applyMerges } from '../lib/colorMerge.js'

function groupKey(group) {
  return group.colors.map(c => c.hex).sort().join(',')
}

export default function ColorMergePanel({ rawRects, onApply }) {
  const [open, setOpen] = useState(false)
  const [threshold, setThreshold] = useState(15)
  const [targets, setTargets] = useState({})   // { groupKey: targetHex }
  const [excluded, setExcluded] = useState({}) // { groupKey: Set<hex> }
  const [applied, setApplied] = useState(false)

  const colors = useMemo(() => extractColors(rawRects), [rawRects])
  const groups = useMemo(() => groupSimilarColors(colors, threshold), [colors, threshold])

  function getTarget(group) {
    return targets[groupKey(group)] ?? group.targetHex
  }

  function getExcluded(group) {
    return excluded[groupKey(group)] ?? new Set()
  }

  function setTarget(group, hex) {
    setTargets(prev => ({ ...prev, [groupKey(group)]: hex }))
    setApplied(false)
  }

  function toggleExclude(group, hex) {
    const key = groupKey(group)
    setExcluded(prev => {
      const set = new Set(prev[key] ?? [])
      if (set.has(hex)) set.delete(hex)
      else set.add(hex)
      return { ...prev, [key]: set }
    })
    setApplied(false)
  }

  function handleApply() {
    const mergeMap = {}
    groups.forEach(group => {
      const target = getTarget(group)
      const excl = getExcluded(group)
      group.colors.forEach(c => {
        if (c.hex !== target && !excl.has(c.hex)) {
          mergeMap[c.hex] = target
        }
      })
    })
    onApply(applyMerges(rawRects, mergeMap))
    setApplied(true)
    window.gtag?.('event', 'color_merge', { groups: Object.keys(mergeMap).length })
  }

  function handleReset() {
    setTargets({})
    setExcluded({})
    setApplied(false)
  }

  const mergeableCount = groups.reduce((sum, g) => {
    const excl = getExcluded(g)
    return sum + g.colors.filter(c => c.hex !== getTarget(g) && !excl.has(c.hex)).length
  }, 0)

  return (
    <section className="validation-panel">
      <button
        className="validation-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="validation-toggle-icon">{open ? '▾' : '▸'}</span>
        Renk Birleştirme
        {groups.length > 0 && (
          <span className="badge badge--error">{groups.length} grup · {colors.length} renk</span>
        )}
        {groups.length === 0 && colors.length > 0 && (
          <span className="badge badge--ok">✓ {colors.length} renk</span>
        )}
      </button>

      {open && (
        <div className="validation-body">
          {/* Threshold */}
          <div className="color-merge-threshold">
            <span className="input-group">
              <span>Benzerlik eşiği</span>
              <div className="input-row" style={{ gap: 10 }}>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={threshold}
                  onChange={e => { setThreshold(Number(e.target.value)); setApplied(false) }}
                  className="color-threshold-slider"
                />
                <span className="input-unit" style={{ minWidth: 24 }}>{threshold}</span>
              </div>
            </span>
          </div>

          {groups.length === 0 && (
            <p className="validation-ok">✓ Bu eşikte benzer renk grubu yok.</p>
          )}

          {groups.length > 0 && (
            <>
              <div className="color-group-list">
                {groups.map(group => {
                  const key = groupKey(group)
                  const target = getTarget(group)
                  const excl = getExcluded(group)
                  return (
                    <div key={key} className="color-group">
                      {group.colors.map(c => {
                        const isTarget = c.hex === target
                        const isExcluded = excl.has(c.hex)
                        return (
                          <div
                            key={c.hex}
                            className={`color-swatch-item${isTarget ? ' color-swatch-item--target' : ''}${isExcluded ? ' color-swatch-item--excluded' : ''}`}
                            title={`${c.hex} · ${c.count} piksel${isTarget ? ' (hedef)' : ''}${isExcluded ? ' (hariç)' : ''}`}
                            onClick={() => !isExcluded && setTarget(group, c.hex)}
                          >
                            <div className="color-swatch" style={{ background: c.hex }} />
                            <div className="color-swatch-info">
                              <span className="color-swatch-hex">{c.hex}</span>
                              <span className="color-swatch-count">{c.count}px</span>
                            </div>
                            {isTarget && <span className="color-swatch-badge">✓</span>}
                            {!isTarget && (
                              <button
                                className="color-swatch-exclude"
                                title={isExcluded ? 'Gruba dahil et' : 'Gruptan çıkar'}
                                onClick={e => { e.stopPropagation(); toggleExclude(group, c.hex) }}
                              >
                                {isExcluded ? '+' : '×'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              <p className="validation-hint" style={{ marginBottom: 12 }}>
                Swatch'a tıkla → hedef renk seç &nbsp;·&nbsp; × → gruptan çıkar
              </p>

              <div className="validation-btns">
                <button className="btn-fix" onClick={handleApply} disabled={mergeableCount === 0}>
                  Uygula ({mergeableCount} renk → hedef)
                </button>
                <button className="btn-ghost" onClick={handleReset}>
                  Sıfırla
                </button>
              </div>

              {applied && (
                <p className="validation-ok" style={{ marginTop: 10 }}>
                  ✓ Renkler güncellendi. Önizleme ve export yenilendi.
                </p>
              )}
            </>
          )}

          <p className="validation-hint" style={{ marginTop: 10 }}>
            {colors.length} farklı renk · Sadece renk değişir, piksel konumu/boyutu değişmez.
          </p>
        </div>
      )}
    </section>
  )
}
