import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

function norm(v) { return v > 1 ? v / 255 : v }

function cmykToRgb(c, m, y, k) {
  const cn = norm(c), mn = norm(m), yn = norm(y), kn = norm(k)
  return { r: (1 - cn) * (1 - kn), g: (1 - mn) * (1 - kn), b: (1 - yn) * (1 - kn) }
}

const PATH_OP_COORD_COUNT = { 3: 2, 4: 2, 9: 6, 12: 0, 19: 4 }

function extractRectsFromConstructPath(args) {
  const pathOps = args[0], coords = args[1], rects = []
  let ci = 0
  for (const pathOp of pathOps) {
    const nCoords = PATH_OP_COORD_COUNT[pathOp] ?? 0
    if (pathOp === 19) {
      const x = coords[ci], y = coords[ci + 1], w = coords[ci + 2], h = coords[ci + 3]
      rects.push({ x: x + Math.min(0, w), y: y + Math.min(0, h), w: Math.abs(w), h: Math.abs(h) })
    }
    ci += nCoords
  }
  return rects
}

// ─── Load PDF ────────────────────────────────────────────────────────────────

export async function loadAIPDF(arrayBuffer) {
  try {
    return await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  } catch {
    throw new Error(
      'Bu .ai dosyası okunamadı. Illustrator\'da "Save As" → "PDF Compatible" seçeneğinin işaretli olduğundan emin olun.'
    )
  }
}

// ─── Artboard list ───────────────────────────────────────────────────────────

export async function getArtboards(pdf) {
  const artboards = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const thumbnail = await renderThumbnail(page, 120)
    artboards.push({
      pageNum: i,
      width: Math.round(vp.width),
      height: Math.round(vp.height),
      thumbnail,
    })
  }
  return artboards
}

async function renderThumbnail(page, maxSize) {
  const vp = page.getViewport({ scale: 1 })
  const scale = maxSize / Math.max(vp.width, vp.height)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.8)
}

// ─── Parse a specific page ───────────────────────────────────────────────────

export async function parseAIPage(pdf, pageNum = 1) {
  const page = await pdf.getPage(pageNum)
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
        y: pageHeight - pr.y - pr.h,
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
      const g = norm(args[0]); currentColor = { r: g, g: g, b: g }
    } else if (op === OPS.setFillCMYKColor) {
      currentColor = cmykToRgb(args[0], args[1], args[2], args[3])
    } else if (op === OPS.rectangle) {
      const x = args[0], y = args[1], w = args[2], h = args[3]
      pendingRects = [{ x: x + Math.min(0, w), y: y + Math.min(0, h), w: Math.abs(w), h: Math.abs(h) }]
    } else if (op === OPS.constructPath) {
      pendingRects = extractRectsFromConstructPath(args)
    } else if (op === OPS.fill || op === OPS.eoFill || op === OPS.fillStroke || op === OPS.eoFillStroke) {
      commitPending()
    } else if (op === OPS.endPath || op === OPS.closePath) {
      pendingRects = []
    }
  }

  return rects
}

// ─── Convenience wrapper (single-page / backwards compat) ───────────────────

export async function parseAIFile(arrayBuffer) {
  const pdf = await loadAIPDF(arrayBuffer)
  return parseAIPage(pdf, 1)
}
