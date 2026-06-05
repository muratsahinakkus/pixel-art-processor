// Border color: #ededed (237, 237, 237) → 0.929 in 0-1 range
const BORDER_R = 237 / 255
const BORDER_G = 237 / 255
const BORDER_B = 237 / 255
const BORDER_TOLERANCE = 0.02  // ±5/255 — absorbs minor float imprecision

function isGray(color) {
  return (
    Math.abs(color.r - BORDER_R) <= BORDER_TOLERANCE &&
    Math.abs(color.g - BORDER_G) <= BORDER_TOLERANCE &&
    Math.abs(color.b - BORDER_B) <= BORDER_TOLERANCE
  )
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

// Returns rects at their original AI positions, gray border squares removed.
// Canvas size is determined by ALL cells (gray + colored) before border stripping
// — this preserves the full grid artboard even when edge rows/cols are gray.
// artboardSize (from PDF page) is used as a fallback if no cells at all.
export function getSpacedRects(gridData, artboardSize = null) {
  const { grid, colCount, rowCount } = gridData
  const matrix = buildMatrix(grid, rowCount, colCount)

  // ── Step 1: bounding box of ALL cells (gray + colored) ──────────────────
  let allMinX = Infinity, allMinY = Infinity
  let allMaxX = -Infinity, allMaxY = -Infinity
  let hasAnyCell = false
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = matrix[r][c]
      if (!cell) continue
      hasAnyCell = true
      if (cell.x < allMinX) allMinX = cell.x
      if (cell.y < allMinY) allMinY = cell.y
      if (cell.x + cell.w > allMaxX) allMaxX = cell.x + cell.w
      if (cell.y + cell.h > allMaxY) allMaxY = cell.y + cell.h
    }
  }

  // ── Step 2: strip gray borders, collect colored rects ───────────────────
  const { top, bottom, left, right } = stripGrayBorders(matrix)

  const rects = []
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = matrix[r][c]
      if (!cell || isGray(cell.color)) continue
      rects.push({ ...cell })
    }
  }

  if (rects.length === 0) return { spacedRects: [], totalWidth: 0, totalHeight: 0 }

  // ── Step 3: determine canvas & origin ───────────────────────────────────

  if (artboardSize) {
    // Rect positions are already in artboard coordinate space (Y-flipped from PDF).
    // Do NOT normalize — keep positions exactly as in the original Illustrator file.
    return {
      spacedRects: rects,
      totalWidth: artboardSize.w,
      totalHeight: artboardSize.h,
    }
  }

  if (hasAnyCell) {
    // No artboard size (SVG files): normalize to full grid bounds including gray cells.
    // Gray cells define the true grid origin and extent.
    return {
      spacedRects: rects.map(r => ({ ...r, x: r.x - allMinX, y: r.y - allMinY })),
      totalWidth: allMaxX - allMinX,
      totalHeight: allMaxY - allMinY,
    }
  }

  // Fallback: normalize to content bounds only
  const minX = Math.min(...rects.map(r => r.x))
  const minY = Math.min(...rects.map(r => r.y))
  return {
    spacedRects: rects.map(r => ({ ...r, x: r.x - minX, y: r.y - minY })),
    totalWidth: Math.max(...rects.map(r => r.x + r.w)) - minX,
    totalHeight: Math.max(...rects.map(r => r.y + r.h)) - minY,
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
