import { buildSVGString, downloadSVG } from './exportSVG.js'

const TOLERANCE = 0.6 // points

// Border color #ededed in 0-1 range (same as mergeGrid.js)
const BORDER_R = 237 / 255
const BORDER_G = 237 / 255
const BORDER_B = 237 / 255
const BORDER_TOL = 0.02

function isBorderColor(c) {
  return (
    Math.abs(c.r - BORDER_R) <= BORDER_TOL &&
    Math.abs(c.g - BORDER_G) <= BORDER_TOL &&
    Math.abs(c.b - BORDER_B) <= BORDER_TOL
  )
}

// Rebuild every pixel at exactly the right size and spacing,
// strip gray borders, normalize to (0,0). Download as SVG.
export function fixAndDownload(gridData, expectedPixelSize, expectedGapSize, fileName) {
  const { grid, colCount, rowCount } = gridData
  const step = expectedPixelSize + expectedGapSize

  // Build matrix
  const matrix = []
  for (let r = 0; r < rowCount; r++) {
    matrix[r] = []
    for (let c = 0; c < colCount; c++) {
      matrix[r][c] = grid[`${r}-${c}`] || null
    }
  }

  // Strip gray border rows/cols
  const isGrayRow = (r, l, ri) =>
    matrix[r].slice(l, ri + 1).every(cell => !cell || isBorderColor(cell.color))
  const isGrayCol = (c, t, b) =>
    matrix.slice(t, b + 1).every(row => !row[c] || isBorderColor(row[c].color))

  let top = 0, bottom = rowCount - 1, left = 0, right = colCount - 1
  while (top <= bottom && isGrayRow(top, left, right)) top++
  while (bottom >= top && isGrayRow(bottom, left, right)) bottom--
  while (left <= right && isGrayCol(left, top, bottom)) left++
  while (right >= left && isGrayCol(right, top, bottom)) right--

  const fixedRects = []
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = matrix[r][c]
      if (!cell || isBorderColor(cell.color)) continue
      fixedRects.push({
        x: (c - left) * step,
        y: (r - top) * step,
        w: expectedPixelSize,
        h: expectedPixelSize,
        color: cell.color,
      })
    }
  }

  const cols = right - left + 1
  const rows = bottom - top + 1
  const totalWidth = (cols - 1) * step + expectedPixelSize
  const totalHeight = (rows - 1) * step + expectedPixelSize

  const svg = buildSVGString(fixedRects, totalWidth, totalHeight)
  downloadSVG(svg, fileName, '_fixed')
}

export function validate(rawRects, gridData, expectedPixelSize, expectedGapSize) {
  const errors = []
  const { xClusters, yClusters, pixelSize } = gridData

  // Check pixel sizes
  rawRects.forEach((rect, i) => {
    const wDiff = Math.abs(rect.w - expectedPixelSize)
    const hDiff = Math.abs(rect.h - expectedPixelSize)
    if (wDiff > TOLERANCE || hDiff > TOLERANCE) {
      errors.push({
        id: `size-${i}`,
        type: 'WRONG_PIXEL_SIZE',
        rectIndex: i,
        rect,
        message: `Piksel boyutu hatalı: beklenen ${expectedPixelSize}pt, bulunan ${round(rect.w)}×${round(rect.h)}pt`,
      })
    }
  })

  // Check horizontal gaps between adjacent columns
  for (let i = 1; i < xClusters.length; i++) {
    const gap = xClusters[i].canonical - xClusters[i - 1].canonical - pixelSize
    if (Math.abs(gap - expectedGapSize) > TOLERANCE) {
      errors.push({
        id: `gap-x-${i}`,
        type: 'WRONG_GAP_H',
        colIndex: i - 1,
        message: `Yatay boşluk hatası (sütun ${i - 1}→${i}): beklenen ${expectedGapSize}pt, bulunan ${round(gap)}pt`,
      })
    }
  }

  // Check vertical gaps between adjacent rows
  for (let i = 1; i < yClusters.length; i++) {
    const gap = yClusters[i].canonical - yClusters[i - 1].canonical - pixelSize
    if (Math.abs(gap - expectedGapSize) > TOLERANCE) {
      errors.push({
        id: `gap-y-${i}`,
        type: 'WRONG_GAP_V',
        rowIndex: i - 1,
        message: `Dikey boşluk hatası (satır ${i - 1}→${i}): beklenen ${expectedGapSize}pt, bulunan ${round(gap)}pt`,
      })
    }
  }

  return errors
}

function round(n) {
  return Math.round(n * 10) / 10
}
