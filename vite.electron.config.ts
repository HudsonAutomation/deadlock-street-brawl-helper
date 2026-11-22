import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  publicDir: false,
  define: {
    __DEV_TOOLS__: JSON.stringify(mode !== 'final'),
    __APP_VERSION__: JSON.stringify('1.0.0-rc.1'),
  },
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist/electron',
    emptyOutDir: false,
    rollupOptions: {
      input: 'electron/main.ts',
      external: ['electron'],
      output: { format: 'es', entryFileNames: 'main.js' },
    },
  },
}))
