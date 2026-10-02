// Plugin de Vite SOLO para desarrollo: sirve /api/panel con un almacén en memoria
// y la clave "dev", para poder probar el recorrido completo (pedido → estadísticas
// → panel) sin Vercel ni credenciales. No entra al build de producción.

import { Buffer } from 'node:buffer'
import { createPanel } from './panel-core.js'
import { memoryStore } from './memory-store.js'

export function devApi() {
  return {
    name: 'mrwhite-dev-api',
    apply: 'serve',
    configureServer(server) {
      const handler = createPanel({ store: memoryStore(), env: { PANEL_PASSWORD: 'dev' } })

      server.middlewares.use('/api/panel', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost')
          const query = Object.fromEntries(url.searchParams)

          let body
          if (req.method === 'POST') {
            const partes = []
            for await (const p of req) partes.push(p)
            const texto = Buffer.concat(partes).toString('utf8')
            try { body = JSON.parse(texto) } catch { body = texto }
          }

          const r = {
            status(c) { res.statusCode = c; return r },
            json(o) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(o))
              return r
            },
            setHeader: (k, v) => res.setHeader(k, v),
          }
          await handler({ method: req.method, query, body, headers: req.headers }, r)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e?.message || e) }))
        }
      })
    },
  }
}
