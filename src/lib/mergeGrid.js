function isGray(color, tolerance = 0.06) {
  const { r, g, b } = color
  // Achromatic: all channels must be nearly equal
  const channelVariance = Math.max(r, g, b) - Math.min(r, g, b)
  if (channelVariance > tolerance) return false
  // Allow near-white grays (e.g. #ededed ≈ 0.93) but exclude pure white (1.0)
  const luminance = (r + g + b) / 3
  return luminance >= 0.08 && luminance <= 0.98
}

function buildMatrix(grid, rowCount, colCount) {
  const matrix = []
  for (let r = 0; r < rowCount; r++) {
    matrix[r] = []
    for (let c = 0; c < colCount; c++) {
      matrix[r][c] = grid[`${r}-${c}`] || null
    }
  }
  return matrix
}

function stripGrayBorders(matrix) {
  let top = 0, bottom = matrix.length - 1
  let left = 0, right = (matrix[0] || []).length - 1

  function rowIsGrayBorder(r) {
    for (let c = left; c <= right; c++) {
      const cell = matrix[r][c]
      if (cell && !isGray(cell.color)) return false
    }
    return true
  }

  function colIsGrayBorder(c) {
    for (let r = top; r <= bottom; r++) {
      const cell = matrix[r][c]
      if (cell && !isGray(cell.color)) return false
    }
    return true
  }

  while (top <= bottom && rowIsGrayBorder(top)) top++
  while (bottom >= top && rowIsGrayBorder(bottom)) bottom--
  while (left <= right && colIsGrayBorder(left)) left++
  while (right >= left && colIsGrayBorder(right)) right--

  return { top, bottom, left, right }
}

// Returns rects at their original AI positions, gray border squares removed,
// coordinates normalized so the content starts at (0, 0).
export function getSpacedRects(gridData) {
  const { grid, colCount, rowCount } = gridData
  const matrix = buildMatrix(grid, rowCount, colCount)
  const { top, bottom, left, right } = stripGrayBorders(matrix)

  const rects = []
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = matrix[r][c]
      if (!cell || isGray(cell.color)) continue
      rects.push({ ...cell }) // original x, y, w, h from the AI file
    }
  }

  if (rects.length === 0) return { spacedRects: [], totalWidth: 0, totalHeight: 0 }

  // Normalize so content starts at (0, 0)
  const minX = Math.min(...rects.map(r => r.x))
  const minY = Math.min(...rects.map(r => r.y))
  const maxX = Math.max(...rects.map(r => r.x + r.w))
  const maxY = Math.max(...rects.map(r => r.y + r.h))

  return {
    spacedRects: rects.map(r => ({ ...r, x: r.x - minX, y: r.y - minY })),
    totalWidth: maxX - minX,
    totalHeight: maxY - minY,
  }
}

export function mergeGrid(gridData) {
  const { grid, pixelSize, colCount, rowCount } = gridData
  const matrix = buildMatrix(grid, rowCount, colCount)
  const { top, bottom, left, right } = stripGrayBorders(matrix)

  const mergedRects = []
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = matrix[r][c]
      if (!cell) continue
      if (isGray(cell.color)) continue

      mergedRects.push({
        x: (c - left) * pixelSize,
        y: (r - top) * pixelSize,
        w: pixelSize,
        h: pixelSize,
        color: cell.color,
      })
    }
  }

  const newColCount = right - left + 1
  const newRowCount = bottom - top + 1

  return {
    mergedRects,
    totalWidth: newColCount * pixelSize,
    totalHeight: newRowCount * pixelSize,
    colCount: newColCount,
    rowCount: newRowCount,
    pixelSize,
  }
}
