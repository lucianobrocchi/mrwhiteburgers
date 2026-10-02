import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { devApi } from './server/dev-api.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), devApi()],
  base: './',
  build: {
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})
