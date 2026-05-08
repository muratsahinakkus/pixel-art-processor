const TOLERANCE = 0.6 // points

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
