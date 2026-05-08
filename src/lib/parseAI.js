import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

// Illustrator stores RGB as Uint8ClampedArray (0-255); normalize to 0-1
function norm(v) {
  return v > 1 ? v / 255 : v
}

function cmykToRgb(c, m, y, k) {
  // inputs may be 0-255 or 0-1; normalize first
  const cn = norm(c), mn = norm(m), yn = norm(y), kn = norm(k)
  return {
    r: (1 - cn) * (1 - kn),
    g: (1 - mn) * (1 - kn),
    b: (1 - yn) * (1 - kn),
  }
}

// Illustrator emits rectangles as constructPath with op-code 19 (RECT),
// not as the native PDF `re` operator.
// Args layout: [opsArray, coordsArray, boundsArray]
//   opsArray[i] === 19 → RECT, consuming 4 coords: x, y, w, h
//   opsArray[i] === 3  → moveTo  (2 coords)
//   opsArray[i] === 4  → lineTo  (2 coords)
//   opsArray[i] === 9  → curveTo (6 coords)
//   opsArray[i] === 12 → closePath (0 coords)
const PATH_OP_COORD_COUNT = { 3: 2, 4: 2, 9: 6, 12: 0, 19: 4 }

function extractRectsFromConstructPath(args) {
  const pathOps = args[0]
  const coords = args[1]
  const rects = []
  let ci = 0

  for (const pathOp of pathOps) {
    const nCoords = PATH_OP_COORD_COUNT[pathOp] ?? 0
    if (pathOp === 19) {
      const x = coords[ci], y = coords[ci + 1]
      const w = coords[ci + 2], h = coords[ci + 3]
      rects.push({
        x: x + Math.min(0, w),
        y: y + Math.min(0, h),
        w: Math.abs(w),
        h: Math.abs(h),
      })
    }
    ci += nCoords
  }
  return rects
}

export async function parseAIFile(arrayBuffer) {
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  } catch (e) {
    throw new Error(
      'Bu .ai dosyası okunamadı. Illustrator\'da "Save As" → "PDF Compatible" seçeneğinin işaretli olduğundan emin olun.'
    )
  }

  if (pdf.numPages > 1) {
    console.warn('Birden fazla sayfa tespit edildi, sadece ilk sayfa işleniyor.')
  }

  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const pageHeight = viewport.height

  const opList = await page.getOperatorList()
  const { fnArray, argsArray } = opList
  const OPS = pdfjsLib.OPS

  const rects = []
  let currentColor = { r: 0.5, g: 0.5, b: 0.5 }
  let pendingRects = []
  const colorStack = []

  const commitPending = () => {
    for (const pr of pendingRects) {
      rects.push({
        x: pr.x,
        y: pageHeight - pr.y - pr.h,  // flip Y: PDF is bottom-left
        w: pr.w,
        h: pr.h,
        color: { ...currentColor },
      })
    }
    pendingRects = []
  }

  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i]
    const args = argsArray[i]

    if (op === OPS.save) {
      colorStack.push({ ...currentColor })
    } else if (op === OPS.restore) {
      if (colorStack.length > 0) currentColor = colorStack.pop()
      pendingRects = []

    } else if (op === OPS.setFillRGBColor) {
      currentColor = { r: norm(args[0]), g: norm(args[1]), b: norm(args[2]) }
    } else if (op === OPS.setFillGray) {
      const g = norm(args[0])
      currentColor = { r: g, g: g, b: g }
    } else if (op === OPS.setFillCMYKColor) {
      currentColor = cmykToRgb(args[0], args[1], args[2], args[3])

    // Native PDF rectangle operator (some files use this)
    } else if (op === OPS.rectangle) {
      const x = args[0], y = args[1], w = args[2], h = args[3]
      pendingRects = [{
        x: x + Math.min(0, w),
        y: y + Math.min(0, h),
        w: Math.abs(w),
        h: Math.abs(h),
      }]

    // Illustrator's batched path operator (used instead of `re`)
    } else if (op === OPS.constructPath) {
      pendingRects = extractRectsFromConstructPath(args)

    } else if (
      op === OPS.fill ||
      op === OPS.eoFill ||
      op === OPS.fillStroke ||
      op === OPS.eoFillStroke
    ) {
      commitPending()
    } else if (op === OPS.endPath || op === OPS.closePath) {
      pendingRects = []
    }
  }

  return rects
}
