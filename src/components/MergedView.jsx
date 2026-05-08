function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')
}
function colorToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function MergedView({ mergedData, zoom }) {
  const { mergedRects, totalWidth, totalHeight } = mergedData

  return (
    <div className="merged-view-wrap" style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={totalWidth * zoom}
        height={totalHeight * zoom}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ display: 'block', position: 'relative', imageRendering: 'pixelated' }}
      >
        {mergedRects.map((rect, i) => (
          <rect
            key={i}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={colorToHex(rect.color)}
          />
        ))}
      </svg>
    </div>
  )
}
