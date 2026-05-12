import { useState, useCallback } from 'react'
import DropZone from './components/DropZone.jsx'
import PreviewPanel from './components/PreviewPanel.jsx'
import ValidationPanel from './components/ValidationPanel.jsx'
import ExportBar from './components/ExportBar.jsx'
import { parseAIFile } from './lib/parseAI.js'
import { parseSVGFile } from './lib/parseSVG.js'
import { detectGrid } from './lib/gridDetect.js'
import { mergeGrid, getSpacedRects } from './lib/mergeGrid.js'

export default function App() {
  const [fileName, setFileName] = useState(null)
  const [rawRects, setRawRects] = useState(null)
  const [gridData, setGridData] = useState(null)
  const [mergedData, setMergedData] = useState(null)
  const [spacedData, setSpacedData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [highlightedIds, setHighlightedIds] = useState([])

  const processFile = useCallback(async (file) => {
    setIsProcessing(true)
    setParseError(null)
    setRawRects(null)
    setGridData(null)
    setMergedData(null)
    setSpacedData(null)
    setHighlightedIds([])
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const ext = file.name.split('.').pop().toLowerCase()

      let rects
      if (ext === 'svg') {
        const text = new TextDecoder().decode(buffer)
        rects = parseSVGFile(text)
      } else {
        rects = await parseAIFile(buffer)
      }

      const grid = detectGrid(rects)
      const merged = mergeGrid(grid)
      const spaced = getSpacedRects(grid)

      setRawRects(rects)
      setGridData(grid)
      setMergedData(merged)
      setSpacedData(spaced)
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
            <button className="btn-ghost" onClick={() => {
              setFileName(null); setRawRects(null); setGridData(null)
              setMergedData(null); setParseError(null); setHighlightedIds([])
            }}>
              Yeni dosya
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!hasResult && !isProcessing && !parseError && (
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
