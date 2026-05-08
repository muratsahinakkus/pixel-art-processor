import { useState, useRef } from 'react'

export default function DropZone({ onFile }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndLoad(file)
  }

  function handleInput(e) {
    const file = e.target.files[0]
    if (file) validateAndLoad(file)
  }

  function validateAndLoad(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'ai' && ext !== 'svg') {
      alert('Sadece .ai ve .svg dosyaları kabul edilmektedir.')
      return
    }
    onFile(file)
  }

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Dosya yükle"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ai,.svg"
        onChange={handleInput}
        style={{ display: 'none' }}
      />
      <div className="dropzone-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="12" height="12" rx="1" fill="var(--pixel-a)" />
          <rect x="18" y="4" width="12" height="12" rx="1" fill="var(--pixel-b)" />
          <rect x="32" y="4" width="12" height="12" rx="1" fill="var(--pixel-c)" />
          <rect x="4" y="18" width="12" height="12" rx="1" fill="var(--pixel-d)" />
          <rect x="18" y="18" width="12" height="12" rx="1" fill="var(--pixel-a)" />
          <rect x="32" y="18" width="12" height="12" rx="1" fill="var(--pixel-b)" />
          <rect x="4" y="32" width="12" height="12" rx="1" fill="var(--pixel-c)" />
          <rect x="18" y="32" width="12" height="12" rx="1" fill="var(--pixel-d)" />
          <rect x="32" y="32" width="12" height="12" rx="1" fill="var(--pixel-a)" />
        </svg>
      </div>
      <p className="dropzone-title">
        {isDragging ? 'Bırakın!' : 'Dosyayı buraya sürükleyin'}
      </p>
      <p className="dropzone-sub">veya tıklayarak seçin</p>
      <p className="dropzone-hint">.ai · .svg · Maks 20×20 grid</p>
    </div>
  )
}
