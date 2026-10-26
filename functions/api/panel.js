// /api/panel en Cloudflare Pages: la misma lógica de siempre (server/panel-core.js)
// pero guardando en D1 (server/d1-store.js). La versión de Vercel sigue en api/panel.js.
//
// Variables del proyecto: DB (binding D1), SITE_ID (texto) y PANEL_PASSWORD (secreto).

import { createPanel } from '../../server/panel-core.js'
import { d1Store } from '../../server/d1-store.js'

export async function onRequest({ request, env }) {
  const store = env.DB && env.SITE_ID ? d1Store(env.DB, env.SITE_ID) : null
  const handler = createPanel({ store, env: { PANEL_PASSWORD: env.PANEL_PASSWORD } })

  const url = new URL(request.url)
  let body
  if (request.method === 'POST') {
    const txt = await request.text()
    try { body = txt ? JSON.parse(txt) : undefined } catch { body = undefined }
  }
  const req = {
    method: request.method,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v])),
    body,
  }
  const res = {
    code: 200, cuerpo: null, cabeceras: {},
    status(c) { this.code = c; return this },
    json(o) { this.cuerpo = o; return this },
    setHeader(k, v) { this.cabeceras[k] = v },
  }
  await handler(req, res)
  return new Response(JSON.stringify(res.cuerpo), {
    status: res.code,
    headers: { 'Content-Type': 'application/json', ...res.cabeceras },
  })
}
