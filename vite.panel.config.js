import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Segunda pasada del build: el panel en dist/panel/, con sus archivos aparte (livianos y
// cacheables). La web (vite.config.js) se arma antes y esta pasada no la toca.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: { input: 'panel/index.html' },
  },
})
