function toHex(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
}

export function colorToHex(c) {
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`
}

export function colorDistance(a, b) {
  const dr = (a.r - b.r) * 255
  const dg = (a.g - b.g) * 255
  const db = (a.b - b.b) * 255
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

export function extractColors(rawRects) {
  const map = new Map()
  rawRects.forEach(rect => {
    const hex = colorToHex(rect.color)
    if (!map.has(hex)) {
      map.set(hex, { hex, r: rect.color.r, g: rect.color.g, b: rect.color.b, count: 0 })
    }
    map.get(hex).count++
  })
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export function groupSimilarColors(colors, threshold) {
  const n = colors.length
  const parent = Array.from({ length: n }, (_, i) => i)

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i])
    return parent[i]
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (colorDistance(colors[i], colors[j]) <= threshold) {
        parent[find(i)] = find(j)
      }
    }
  }

  const groupMap = new Map()
  colors.forEach((color, i) => {
    const root = find(i)
    if (!groupMap.has(root)) groupMap.set(root, [])
    groupMap.get(root).push(color)
  })

  return Array.from(groupMap.values())
    .filter(g => g.length >= 2)
    .map(g => {
      g.sort((a, b) => b.count - a.count)
      return { colors: g, targetHex: g[0].hex }
    })
    .sort((a, b) => b.colors.length - a.colors.length)
}

export function applyMerges(rawRects, mergeMap) {
  // mergeMap: { fromHex: toHex }
  // Build a hex → actual color object lookup from rawRects
  const hexToColor = new Map()
  rawRects.forEach(rect => {
    const hex = colorToHex(rect.color)
    if (!hexToColor.has(hex)) hexToColor.set(hex, rect.color)
  })

  return rawRects.map(rect => {
    const hex = colorToHex(rect.color)
    const targetHex = mergeMap[hex]
    if (!targetHex || targetHex === hex) return rect
    const targetColor = hexToColor.get(targetHex) ?? rect.color
    return { ...rect, color: targetColor }
  })
}
