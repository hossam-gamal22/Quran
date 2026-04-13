import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@app-lib': path.resolve(__dirname, '../lib'),
      '@app-data': path.resolve(__dirname, '../data'),
      // Force single React instance — prevents duplicate React from root workspace
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/expo-push': {
        target: 'https://api.expo.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/expo-push/, '/v2/push/send'),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
