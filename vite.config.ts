import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __DEV_TOOLS__: JSON.stringify(mode !== 'final'),
    __APP_VERSION__: JSON.stringify('1.0.0-rc.1'),
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        control: resolve('index.html'),
        overlay: resolve('overlay.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}))
