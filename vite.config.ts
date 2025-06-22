import { defineConfig } from 'vite'

export default defineConfig({
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