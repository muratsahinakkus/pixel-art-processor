function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')
}
function colorToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function OriginalView({ rawRects, gridData, zoom, highlightedIds, artboardSize }) {
  const { xClusters, yClusters, pixelSize } = gridData
  const highlightSet = new Set(highlightedIds)

  // Bounding box: expand to include artboard boundaries if available
  const xs = rawRects.map(r => r.x)
  const ys = rawRects.map(r => r.y)
  const contentMinX = Math.min(...xs)
  const contentMinY = Math.min(...ys)
  const contentMaxX = Math.max(...rawRects.map(r => r.x + r.w))
  const contentMaxY = Math.max(...rawRects.map(r => r.y + r.h))

  const minX = artboardSize ? Math.min(0, contentMinX) : contentMinX
  const minY = artboardSize ? Math.min(0, contentMinY) : contentMinY
  const maxX = artboardSize ? Math.max(artboardSize.w, contentMaxX) : contentMaxX
  const maxY = artboardSize ? Math.max(artboardSize.h, contentMaxY) : contentMaxY
  const W = maxX - minX
  const H = maxY - minY

  const svgW = W * zoom
  const svgH = H * zoom

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`${minX} ${minY} ${W} ${H}`}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {rawRects.map((rect, i) => {
        const isHighlighted = highlightSet.has(`size-${i}`) || highlightSet.has(`pos-x-${i}`) || highlightSet.has(`pos-y-${i}`)
        return (
          <rect
            key={i}
            id={`pxrect-${i}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={colorToHex(rect.color)}
            stroke={isHighlighted ? '#ff3333' : 'none'}
            strokeWidth={isHighlighted ? pixelSize * 0.15 : 0}
          />
        )
      })}

      {/* Highlight column gaps with wrong spacing */}
      {highlightedIds.filter(id => id.startsWith('gap-x-')).map(id => {
        const colIdx = parseInt(id.split('-')[2])
        if (colIdx <= 0 || colIdx >= xClusters.length) return null
        const x1 = xClusters[colIdx - 1].canonical + pixelSize
        const x2 = xClusters[colIdx].canonical
        if (x2 <= x1) return null
        return (
          <rect
            key={id}
            x={x1}
            y={minY}
            width={x2 - x1}
            height={H}
            fill="rgba(255,50,50,0.25)"
          />
        )
      })}

      {/* Artboard boundary frame — preview only, not exported */}
      {artboardSize && (
        <rect
          x={0}
          y={0}
          width={artboardSize.w}
          height={artboardSize.h}
          fill="none"
          stroke="#000000"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {highlightedIds.filter(id => id.startsWith('gap-y-')).map(id => {
        const rowIdx = parseInt(id.split('-')[2])
        if (rowIdx <= 0 || rowIdx >= yClusters.length) return null
        const y1 = yClusters[rowIdx - 1].canonical + pixelSize
        const y2 = yClusters[rowIdx].canonical
        if (y2 <= y1) return null
        return (
          <rect
            key={id}
            x={minX}
            y={y1}
            width={W}
            height={y2 - y1}
            fill="rgba(255,50,50,0.25)"
          />
        )
      })}
    </svg>
  )
}
