import { useState, useCallback, useRef } from 'react'
import DropZone from './components/DropZone.jsx'
import ArtboardSelector from './components/ArtboardSelector.jsx'
import PreviewPanel from './components/PreviewPanel.jsx'
import ColorMergePanel from './components/ColorMergePanel.jsx'
import ValidationPanel from './components/ValidationPanel.jsx'
import ExportBar from './components/ExportBar.jsx'
import { loadAIPDF, getArtboards, parseAIPage } from './lib/parseAI.js'
import { parseSVGFile } from './lib/parseSVG.js'
import { detectGrid } from './lib/gridDetect.js'
import { mergeGrid, getSpacedRects } from './lib/mergeGrid.js'

export default function App() {
  const [fileName, setFileName] = useState(null)
  const [artboards, setArtboards] = useState(null)
  const [rawRects, setRawRects] = useState(null)
  const [gridData, setGridData] = useState(null)
  const [mergedData, setMergedData] = useState(null)
  const [spacedData, setSpacedData] = useState(null)
  const [artboardSize, setArtboardSize] = useState(null)
  const [prevSnapshot, setPrevSnapshot] = useState(null) // one-step undo for color merge
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [highlightedIds, setHighlightedIds] = useState([])

  const pdfRef = useRef(null)

  const resetAll = () => {
    setFileName(null)
    setArtboards(null)
    setRawRects(null)
    setGridData(null)
    setMergedData(null)
    setSpacedData(null)
    setArtboardSize(null)
    setPrevSnapshot(null)
    setParseError(null)
    setHighlightedIds([])
    pdfRef.current = null
  }

  const processRects = (rects, ext, abSize = null) => {
    const grid = detectGrid(rects)
    const merged = mergeGrid(grid)
    const spaced = getSpacedRects(grid, abSize)
    setRawRects(rects)
    setGridData(grid)
    setMergedData(merged)
    setSpacedData(spaced)
    setArtboardSize(abSize)
    window.gtag?.('event', 'file_processed', { file_type: ext })
  }

  const processFile = useCallback(async (file) => {
    setIsProcessing(true)
    setParseError(null)
    setRawRects(null)
    setGridData(null)
    setMergedData(null)
    setSpacedData(null)
    setArtboards(null)
    setArtboardSize(null)
    setHighlightedIds([])
    setFileName(file.name)
    pdfRef.current = null

    try {
      const buffer = await file.arrayBuffer()
      const ext = file.name.split('.').pop().toLowerCase()

      if (ext === 'svg') {
        const text = new TextDecoder().decode(buffer)
        const rects = parseSVGFile(text)
        processRects(rects, ext, null)
      } else {
        const pdf = await loadAIPDF(buffer)
        pdfRef.current = pdf

        if (pdf.numPages === 1) {
          const { rects, pageWidth, pageHeight } = await parseAIPage(pdf, 1)
          processRects(rects, ext, { w: pageWidth, h: pageHeight })
        } else {
          const abs = await getArtboards(pdf)
          setArtboards(abs)
        }
      }
    } catch (err) {
      setParseError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleColorMerge = useCallback((newRects) => {
    // Save current state for undo before applying
    setPrevSnapshot({ rawRects, gridData, mergedData, spacedData })
    const grid = detectGrid(newRects)
    const merged = mergeGrid(grid)
    const spaced = getSpacedRects(grid, artboardSize)
    setRawRects(newRects)
    setGridData(grid)
    setMergedData(merged)
    setSpacedData(spaced)
    setHighlightedIds([])
  }, [artboardSize, rawRects, gridData, mergedData, spacedData])

  const handleUndoColorMerge = useCallback(() => {
    if (!prevSnapshot) return
    setRawRects(prevSnapshot.rawRects)
    setGridData(prevSnapshot.gridData)
    setMergedData(prevSnapshot.mergedData)
    setSpacedData(prevSnapshot.spacedData)
    setPrevSnapshot(null)
    setHighlightedIds([])
  }, [prevSnapshot])

  const handleArtboardSelect = useCallback(async (pageNum) => {
    setIsProcessing(true)
    setParseError(null)
    setPrevSnapshot(null)
    try {
      const { rects, pageWidth, pageHeight } = await parseAIPage(pdfRef.current, pageNum)
      processRects(rects, 'ai', { w: pageWidth, h: pageHeight })
      // artboards is kept in state so user can go back
    } catch (err) {
      setParseError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleBackToArtboards = () => {
    setRawRects(null)
    setGridData(null)
    setMergedData(null)
    setSpacedData(null)
    setArtboardSize(null)
    setPrevSnapshot(null)
    setHighlightedIds([])
    // artboards and pdfRef are preserved
  }

  const hasResult = mergedData && rawRects && gridData

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">⬛</span>
          <h1>Pixel Art Processor</h1>
          {hasResult && artboards && (
            <button className="btn-ghost" onClick={handleBackToArtboards}>
              ← Artboard Seç
            </button>
          )}
          {fileName && !isProcessing && (
            <button className="btn-ghost" onClick={resetAll}>
              Yeni dosya
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!hasResult && !isProcessing && !parseError && !artboards && (
          <DropZone onFile={processFile} />
        )}

        {isProcessing && (
          <div className="status-box">
            <div className="spinner" />
            <p>Dosya işleniyor…</p>
          </div>
        )}

        {parseError && (
          <div className="error-box">
            <p className="error-icon">⚠️</p>
            <p className="error-title">Dosya okunamadı</p>
            <p className="error-msg">{parseError}</p>
            <button className="btn-primary" onClick={() => setParseError(null)}>
              Tekrar dene
            </button>
          </div>
        )}

        {artboards && !hasResult && !isProcessing && (
          <ArtboardSelector
            artboards={artboards}
            fileName={fileName}
            onSelect={handleArtboardSelect}
            onBack={resetAll}
          />
        )}

        {hasResult && (
          <>
            <PreviewPanel
              rawRects={rawRects}
              gridData={gridData}
              mergedData={mergedData}
              highlightedIds={highlightedIds}
              artboardSize={artboardSize}
            />
            <ColorMergePanel
              rawRects={rawRects}
              onApply={handleColorMerge}
              onUndo={handleUndoColorMerge}
              canUndo={!!prevSnapshot}
            />
            <ValidationPanel
              rawRects={rawRects}
              gridData={gridData}
              onHighlight={setHighlightedIds}
              fileName={fileName}
            />
          </>
        )}
      </main>

      {hasResult && (
        <ExportBar mergedData={mergedData} spacedData={spacedData} fileName={fileName} artboardSize={artboardSize} />
      )}
    </div>
  )
}
