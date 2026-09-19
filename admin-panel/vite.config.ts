import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const publicEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('EXPO_PUBLIC_')),
  );
  return {
    plugins: [react()],
    base: '/',
    define: {
      'process.env': JSON.stringify({
        ...publicEnv,
        NODE_ENV: mode === 'production' ? 'production' : 'development',
      }),
    },
    envDir: path.resolve(__dirname, '..'),
    resolve: {
      alias: {
        '@app-lib': path.resolve(__dirname, '../lib'),
        '@app-data': path.resolve(__dirname, '../data'),
        // Lets shared files under ../lib that use the app's '@/...' alias resolve here too.
        // Only matches '@/...', so it never swallows the '@app-lib'/'@app-data' aliases above.
        '@': path.resolve(__dirname, '..'),
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
          headers: env.EXPO_ACCESS_TOKEN
            ? { 'Authorization': `Bearer ${env.EXPO_ACCESS_TOKEN}` }
            : {},
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
})
