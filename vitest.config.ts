import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup-env.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      '@react-native-async-storage/async-storage': fileURLToPath(new URL('./tests/mocks/async-storage.ts', import.meta.url)),
      'react-native': fileURLToPath(new URL('./tests/mocks/react-native.ts', import.meta.url)),
    },
  },
});
