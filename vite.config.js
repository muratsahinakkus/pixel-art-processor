import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/pixel-art-processor/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
