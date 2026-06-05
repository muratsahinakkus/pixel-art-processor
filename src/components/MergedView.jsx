function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')
}
function colorToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function MergedView({ mergedData, zoom, artboardSize }) {
  const { mergedRects, totalWidth, totalHeight, scale = 1 } = mergedData

  const canvasW = artboardSize ? artboardSize.w * scale : totalWidth
  const canvasH = artboardSize ? artboardSize.h * scale : totalHeight

  return (
    <div className="merged-view-wrap" style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={canvasW * zoom}
        height={canvasH * zoom}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
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
