import { useState, useCallback, useRef } from 'react'
import DropZone from './components/DropZone.jsx'
import ArtboardSelector from './components/ArtboardSelector.jsx'
import PreviewPanel from './components/PreviewPanel.jsx'
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
    setParseError(null)
    setHighlightedIds([])
    pdfRef.current = null
  }

  const processRects = (rects) => {
    const grid = detectGrid(rects)
    const merged = mergeGrid(grid)
    const spaced = getSpacedRects(grid)
    setRawRects(rects)
    setGridData(grid)
    setMergedData(merged)
    setSpacedData(spaced)
    fetch('https://api.countapi.xyz/hit/pap-otsimo-murat/usage').catch(() => {})
  }

  const processFile = useCallback(async (file) => {
    setIsProcessing(true)
    setParseError(null)
    setRawRects(null)
    setGridData(null)
    setMergedData(null)
    setSpacedData(null)
    setArtboards(null)
    setHighlightedIds([])
    setFileName(file.name)
    pdfRef.current = null

    try {
      const buffer = await file.arrayBuffer()
      const ext = file.name.split('.').pop().toLowerCase()

      if (ext === 'svg') {
        const text = new TextDecoder().decode(buffer)
        const rects = parseSVGFile(text)
        processRects(rects)
      } else {
        const pdf = await loadAIPDF(buffer)
        pdfRef.current = pdf

        if (pdf.numPages === 1) {
          const rects = await parseAIPage(pdf, 1)
          processRects(rects)
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

  const handleArtboardSelect = useCallback(async (pageNum) => {
    setIsProcessing(true)
    setParseError(null)
    try {
      const rects = await parseAIPage(pdfRef.current, pageNum)
      processRects(rects)
      setArtboards(null)
    } catch (err) {
      setParseError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const hasResult = mergedData && rawRects && gridData

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">⬛</span>
          <h1>Pixel Art Processor</h1>
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

        {artboards && !isProcessing && (
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
        <ExportBar mergedData={mergedData} spacedData={spacedData} fileName={fileName} />
      )}
    </div>
  )
}
