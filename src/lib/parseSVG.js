function parseCssColor(str) {
  if (!str || str === 'none') return null
  str = str.trim()

  if (str.startsWith('#')) {
    let hex = str.slice(1)
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const n = parseInt(hex, 16)
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
  }

  const rgb = str.match(/^rgb\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/)
  if (rgb) {
    return { r: parseFloat(rgb[1]) / 255, g: parseFloat(rgb[2]) / 255, b: parseFloat(rgb[3]) / 255 }
  }

  // Named colors: just handle common ones
  const named = {
    white: { r: 1, g: 1, b: 1 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 1, g: 0, b: 0 },
    green: { r: 0, g: 0.502, b: 0 },
    blue: { r: 0, g: 0, b: 1 },
  }
  return named[str.toLowerCase()] || { r: 0, g: 0, b: 0 }
}

export function parseSVGFile(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'image/svg+xml')
  const err = doc.querySelector('parsererror')
  if (err) throw new Error('Geçersiz SVG dosyası.')

  const rectEls = Array.from(doc.querySelectorAll('rect'))
  if (rectEls.length === 0) throw new Error('SVG içinde hiç dikdörtgen (rect) bulunamadı.')

  const rects = rectEls.map(el => {
    const x = parseFloat(el.getAttribute('x') || '0')
    const y = parseFloat(el.getAttribute('y') || '0')
    const w = parseFloat(el.getAttribute('width') || '0')
    const h = parseFloat(el.getAttribute('height') || '0')

    // fill can be attribute or inline style
    let fillStr = el.getAttribute('fill') || el.style.fill || '#000000'
    const color = parseCssColor(fillStr)

    return { x, y, w, h, color: color || { r: 0, g: 0, b: 0 } }
  }).filter(r => r.w > 0 && r.h > 0)

  return rects
}
