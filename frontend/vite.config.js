import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'wailsjs': path.resolve(__dirname, './wailsjs'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Raises the warning threshold to 1000 kB (1 MB)
  }
})
