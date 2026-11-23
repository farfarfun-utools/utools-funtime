import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'utools/dist',
    emptyOutDir: true,
    target: 'chrome120',
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, 'index.html'),
        widget: path.resolve(rootDir, 'widget.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
