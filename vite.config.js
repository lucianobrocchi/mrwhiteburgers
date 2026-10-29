import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApi } from './server/dev-api.js'
import { seoPlugin } from './scripts/seo.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi(), seoPlugin(process.env.SITE_URL)],
  base: './',
  // Archivos aparte con nombre único (Cloudflare los guarda un año, ver public/_headers): la página
  // pesa poco y el carrito (con el mapa) se baja recién cuando hace falta.
  build: {
    assetsInlineLimit: 4096,
  },
})
