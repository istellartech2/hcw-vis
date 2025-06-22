import { defineConfig } from 'vite'
// @ts-expect-error - @tailwindcss/vite doesn't ship with TypeScript types
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          satellite: ['satellite.js']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})