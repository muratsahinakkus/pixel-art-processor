function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')
}
function colorToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function OriginalView({ rawRects, gridData, zoom, highlightedIds }) {
  const { xClusters, yClusters, pixelSize } = gridData
  const highlightSet = new Set(highlightedIds)

  // Bounding box of all pixel rects
  const xs = rawRects.map(r => r.x)
  const ys = rawRects.map(r => r.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...rawRects.map(r => r.x + r.w))
  const maxY = Math.max(...rawRects.map(r => r.y + r.h))
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
