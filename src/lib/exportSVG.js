function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0')
}

function colorToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function buildSVGString(mergedRects, totalWidth, totalHeight) {
  const rects = mergedRects
    .map(
      ({ x, y, w, h, color }) =>
        `  <rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${colorToHex(color)}"/>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${round(totalWidth)}"
     height="${round(totalHeight)}"
     viewBox="0 0 ${round(totalWidth)} ${round(totalHeight)}">
${rects}
</svg>`
}

function round(n) {
  return Math.round(n * 100) / 100
}

export function downloadSVG(svgString, filename, suffix = '_merged') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.(ai|svg)$/i, '') + suffix + '.svg'
  a.click()
  URL.revokeObjectURL(url)
}
