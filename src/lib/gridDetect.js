function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function clusterValues(values, threshold) {
  if (values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const clusters = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > threshold) {
      clusters.push([])
    }
    clusters[clusters.length - 1].push(sorted[i])
  }

  return clusters.map(c => ({ canonical: median(c), members: c }))
}

export function detectGrid(rawRects) {
  if (rawRects.length === 0) throw new Error('Hiç dikdörtgen bulunamadı.')

  // --- Step 1: Estimate pixel size ---
  const sizes = rawRects.map(r => Math.min(r.w, r.h))
  const roughSize = median(sizes)

  // --- Step 2: Filter to roughly-square rects (the "pixels") ---
  // Also filter out the page boundary rect (much larger than pixel size)
  const pixels = rawRects.filter(r => {
    const squareness = Math.abs(r.w - r.h) < roughSize * 0.3
    const notTooBig = r.w < roughSize * 5 && r.h < roughSize * 5
    return squareness && notTooBig && r.w > 0 && r.h > 0
  })

  if (pixels.length === 0) throw new Error('Grid yapısı tespit edilemedi. Piksel sanat karelerini bulamadım.')

  const pixelSize = median(pixels.map(r => r.w))
  const threshold = pixelSize * 0.4

  // --- Step 3: Cluster X and Y positions ---
  const xClusters = clusterValues(pixels.map(r => r.x), threshold)
  const yClusters = clusterValues(pixels.map(r => r.y), threshold)

  if (xClusters.length > 32 || yClusters.length > 32) {
    throw new Error(
      `Grid çok büyük görünüyor (${xClusters.length}×${yClusters.length}). Dosya beklenen formatta olmayabilir.`
    )
  }

  // --- Step 4: Assign row/col to each pixel ---
  function findClusterIndex(value, clusters, thresh) {
    for (let i = 0; i < clusters.length; i++) {
      if (Math.abs(value - clusters[i].canonical) <= thresh) return i
    }
    // Fallback: nearest
    let best = 0, bestDist = Infinity
    for (let i = 0; i < clusters.length; i++) {
      const d = Math.abs(value - clusters[i].canonical)
      if (d < bestDist) { bestDist = d; best = i }
    }
    return best
  }

  const grid = {}
  for (const rect of pixels) {
    const col = findClusterIndex(rect.x, xClusters, threshold)
    const row = findClusterIndex(rect.y, yClusters, threshold)
    const key = `${row}-${col}`
    // Last drawn rect wins — matches PDF rendering order (later = on top)
    grid[key] = { ...rect, row, col }
  }

  // --- Step 5: Infer gap size ---
  let gapSize = 0
  if (xClusters.length >= 2) {
    const gaps = []
    for (let i = 1; i < xClusters.length; i++) {
      gaps.push(xClusters[i].canonical - xClusters[i - 1].canonical - pixelSize)
    }
    gapSize = Math.max(0, Math.round(median(gaps) * 10) / 10)
  }

  return {
    grid,
    pixelSize: Math.round(pixelSize * 10) / 10,
    gapSize,
    colCount: xClusters.length,
    rowCount: yClusters.length,
    xClusters,
    yClusters,
  }
}
