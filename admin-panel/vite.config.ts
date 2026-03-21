import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'), // Load .env from project root (shares VITE_PEXELS_API_KEY with main app)
  resolve: {
    alias: {
      '@app-lib': path.resolve(__dirname, '../lib'),
    },
  },
})
