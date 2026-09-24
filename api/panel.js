// Función que corre en Vercel, en tu propio dominio.
//
// Resuelve dos cosas:
//  1. El panel ya no llama a api.github.com desde el navegador (que es lo que
//     bloquean los ad-blockers). Habla con /api/panel, mismo dominio del sitio.
//  2. El token deja de estar en el teléfono y vive en Vercel.
//
// Soporta dos lugares donde guardar, y elige solo el que esté disponible:
//
//  A) Vercel Blob  ← el más simple
//     En Vercel → Storage → Create Blob store → Connect to project.
//     Vercel inyecta BLOB_READ_WRITE_TOKEN solo, no hay que copiar nada.
//     Los cambios se ven al instante (no hay que recompilar el sitio).
//
//  B) GitHub
//     Requiere GITHUB_TOKEN (fine-grained, Contents: Read and write).
//     Guarda cada cambio como un commit, así queda historial.
//
// En los dos casos hace falta PANEL_PASSWORD: la clave para entrar al panel.
// Si no hay ninguno configurado, responde 501 y el panel cae al modo viejo.

import { put, list } from '@vercel/blob'

const REPO = 'lucianobrocchi/mrwhiteburgers'
const CONFIG_PATH = 'public/config.json'
const BRANCH = 'main'
const CONFIG_BLOB = 'config.json'
const STATS_BLOB = 'stats.json'
const STATS_PATH = 'stats.json'
const MAX_ULTIMOS = 40

const hayBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN
const hayGitHub = () => !!process.env.GITHUB_TOKEN
const backend = () => (hayBlob() ? 'blob' : hayGitHub() ? 'github' : null)

// ─── Vercel Blob ─────────────────────────────────────────────────────────
async function blobLeer(nombre) {
  const { blobs } = await list({ prefix: nombre, limit: 1 })
  const b = blobs.find((x) => x.pathname === nombre)
  if (!b) return null
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' })
  if (!r.ok) return null
  return r.json()
}

async function blobEscribir(nombre, data) {
  await put(nombre, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false, // así la URL es siempre la misma
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  })
}

// ─── GitHub ──────────────────────────────────────────────────────────────
const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'mrwhite-panel',
      ...(init.headers || {}),
    },
  })

async function ghLeer(path) {
  const r = await gh(`contents/${encodeURIComponent(path)}?ref=${BRANCH}`)
  if (r.status === 404) return { sha: null, data: null }
  if (!r.ok) throw new Error(`GitHub ${r.status} al leer ${path}`)
  const j = await r.json()
  return { sha: j.sha, data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')) }
}

async function ghEscribir(path, data, sha, mensaje) {
  const r = await gh(`contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: mensaje,
      content: Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    const err = new Error(e.message || `GitHub ${r.status} al guardar ${path}`)
    err.status = r.status
    throw err
  }
  return (await r.json()).content.sha
}

// ─── Operaciones, sin importar el backend ────────────────────────────────
async function leerConfig() {
  if (hayBlob()) return { sha: null, config: await blobLeer(CONFIG_BLOB) }
  const { sha, data } = await ghLeer(CONFIG_PATH)
  return { sha, config: data }
}

async function guardarConfig(config, sha, mensaje) {
  if (hayBlob()) { await blobEscribir(CONFIG_BLOB, config); return null }
  return ghEscribir(CONFIG_PATH, config, sha, mensaje)
}

async function leerStats() {
  if (hayBlob()) return (await blobLeer(STATS_BLOB)) || { byDay: {}, lastOrders: [] }
  const { data } = await ghLeer(STATS_PATH)
  return data || { byDay: {}, lastOrders: [] }
}

const hoyStr = () => new Date().toISOString().slice(0, 10)

// Suma un pedido a las estadísticas.
async function registrarPedido(pedido, intento = 0) {
  let sha = null
  let stats
  if (hayBlob()) {
    stats = (await blobLeer(STATS_BLOB)) || { byDay: {}, lastOrders: [] }
  } else {
    const r = await ghLeer(STATS_PATH)
    sha = r.sha
    stats = r.data || { byDay: {}, lastOrders: [] }
  }

  const dia = hoyStr()
  const d = stats.byDay[dia] || { orders: 0, total: 0, burgers: {} }
  d.orders += 1
  d.total += Number(pedido.total) || 0
  for (const it of pedido.items || []) {
    const k = String(it.id)
    d.burgers[k] = (d.burgers[k] || 0) + (Number(it.qty) || 0)
  }
  stats.byDay[dia] = d
  stats.lastOrders = [pedido, ...(stats.lastOrders || [])].slice(0, MAX_ULTIMOS)

  if (hayBlob()) { await blobEscribir(STATS_BLOB, stats); return true }
  try {
    await ghEscribir(STATS_PATH, stats, sha, `chore(stats): pedido ${dia}`)
  } catch (e) {
    if (e.status === 409 && intento < 2) return registrarPedido(pedido, intento + 1) // otro pedido escribió primero
    throw e
  }
  return true
}

export default async function handler(req, res) {
  const action = (req.query?.action || req.body?.action || '').toString()
  const modo = backend()
  const listo = !!(modo && process.env.PANEL_PASSWORD)

  if (action === 'ping') {
    return res.status(200).json({ ok: true, configurado: listo, backend: modo, clave: !!process.env.PANEL_PASSWORD })
  }

  // La config que lee el sitio público (sin clave). Si no hay backend, que el
  // sitio use el config.json que viene con el build.
  if (action === 'public-config') {
    if (!modo) return res.status(404).json({ error: 'sin backend' })
    try {
      const { config } = await leerConfig()
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30')
      return res.status(200).json(config || {})
    } catch {
      return res.status(404).json({ error: 'sin config' })
    }
  }

  if (!listo) {
    return res.status(501).json({
      error: modo
        ? 'Falta cargar PANEL_PASSWORD en Vercel.'
        : 'Falta conectar el almacenamiento (Vercel Blob) o cargar GITHUB_TOKEN.',
    })
  }

  // Registrar un pedido: público, lo dispara el cliente al pedir por WhatsApp
  if (action === 'order' && req.method === 'POST') {
    try {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const pedido = {
        at: new Date().toISOString(),
        items: (b.items || []).slice(0, 20).map((i) => ({
          id: i.id, name: String(i.name || '').slice(0, 40), size: i.size, qty: Number(i.qty) || 0,
        })),
        total: Number(b.total) || 0,
        zone: String(b.zone || '').slice(0, 30),
      }
      if (!pedido.items.length) return res.status(400).json({ error: 'pedido vacío' })
      await registrarPedido(pedido)
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // De acá para abajo hace falta la clave del panel
  const clave = req.headers['x-panel-key'] || req.query?.key || req.body?.key
  if (clave !== process.env.PANEL_PASSWORD) return res.status(401).json({ error: 'Clave incorrecta.' })

  try {
    if (action === 'login') return res.status(200).json({ ok: true, backend: modo })
    if (action === 'get-config') return res.status(200).json(await leerConfig())
    if (action === 'stats') return res.status(200).json(await leerStats())

    if (action === 'save-config' && req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const sha = await guardarConfig(b.config, b.sha, b.message || 'chore(config): cambios desde el panel')
      return res.status(200).json({ ok: true, sha })
    }

    return res.status(400).json({ error: 'acción desconocida' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
