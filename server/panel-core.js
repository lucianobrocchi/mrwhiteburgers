// ─── Lógica del panel (sin depender de dónde se guarde) ──────────────────
// Recibe un `store` con esta forma y no sabe si detrás hay Vercel Blob o una
// memoria de prueba:
//
//   store.name                         'blob' | 'memory'
//   store.getJson(path)                → { data, etag } | null
//   store.putJson(path, data, etag)    → etag nuevo; si el archivo cambió desde que se
//                                        leyó, lanza un error con code 'PRECONDITION'
//   store.listPaths(prefix)            → [path]
//
// Archivos que guarda:
//   config.json          lo que se edita desde el panel (stock, precios, avisos)
//   stats/AAAA-MM.json   los pedidos de cada mes (se lee/escribe uno por pedido)

import { randomUUID, createHash, timingSafeEqual } from 'node:crypto'

export const TZ = 'America/Argentina/Buenos_Aires'
const PATH_CONFIG = 'config.json'
const monthPath = (ym) => `stats/${ym}.json`

const MAX_ORDERS_PER_MONTH = 8000
const DUP_WINDOW_MS = 90_000   // el mismo pedido dos veces en 90 s = doble toque

// ─── Fecha y hora de Argentina ───────────────────────────────────────────
// El servidor corre en UTC. Con el local abierto de 19:30 a 22:30, los pedidos
// de después de las 21:00 caerían en el día siguiente si usáramos UTC. Por eso
// todo se cuenta con la hora de Buenos Aires.
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const fmtART = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23', weekday: 'short',
})

export function ahoraART(date = new Date()) {
  const p = Object.fromEntries(fmtART.formatToParts(date).map((x) => [x.type, x.value]))
  return {
    d: `${p.year}-${p.month}-${p.day}`,
    ym: `${p.year}-${p.month}`,
    h: Number(p.hour),
    w: WEEKDAYS[p.weekday],
  }
}

// ─── Validación del pedido (viene de un visitante: no se confía en nada) ──
const str = (v, n) => String(v ?? '').slice(0, n)
const int = (v, max) => {
  const x = Math.round(Number(v))
  return Number.isFinite(x) ? Math.min(Math.max(x, 0), max) : 0
}

export function sanitizeOrder(b, now = new Date()) {
  if (!b || !Array.isArray(b.items)) return null
  const items = b.items
    .slice(0, 20)
    .map((i) => ({
      k: i?.k === 'd' ? 'd' : 'b',
      id: str(i?.id, 20),
      n: str(i?.n, 40),
      s: str(i?.s, 12),
      sl: str(i?.sl, 16),
      ...(i?.f ? { f: str(i.f, 12) } : {}),
      q: int(i?.q, 50),
      u: int(i?.u, 200000),
      x: Array.isArray(i?.x)
        ? i.x.slice(0, 6)
            .map((e) => ({ id: str(e?.id, 20), n: str(e?.n, 40), q: int(e?.q, 10), p: int(e?.p, 20000) }))
            .filter((e) => e.q > 0 && e.n)
        : [],
    }))
    .filter((i) => i.q > 0 && i.n)
  if (!items.length) return null

  const t = ahoraART(now)
  return {
    id: `${t.d.replace(/-/g, '')}-${randomUUID().slice(0, 6)}`,
    at: now.toISOString(),
    d: t.d, h: t.h, w: t.w,
    total: int(b.total, 3_000_000),
    subtotal: int(b.subtotal, 3_000_000),
    discount: int(b.discount, 3_000_000),
    promo: str(b.promo, 40),
    zoneId: str(b.zoneId, 12),
    zone: str(b.zone, 30),
    src: str(b.src, 24).toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'directo',
    items,
  }
}

// Huella para detectar el mismo pedido enviado dos veces seguidas
const huella = (o) =>
  JSON.stringify([
    o.total, o.zoneId,
    o.items.map((i) => [i.k, i.id, i.s, i.f || '', i.q, i.x.map((e) => `${e.id}${e.q}`).join(',')]),
  ])

// El id del pedido empieza con la fecha: AAAAMMDD-xxxxxx → mes AAAA-MM
const mesDeId = (id) => (/^\d{8}-/.test(id) ? `${id.slice(0, 4)}-${id.slice(4, 6)}` : null)

// ─── Handler ─────────────────────────────────────────────────────────────
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
const sha = (s) => createHash('sha256').update(String(s)).digest()

export function createPanel({ store, env = {} }) {
  const PASS = env.PANEL_PASSWORD || ''
  const listo = !!(store && PASS)

  const claveOk = (dada) => !!PASS && timingSafeEqual(sha(dada ?? ''), sha(PASS))

  // Lee-modifica-escribe un archivo con escritura optimista: si otro proceso lo
  // cambió en el medio, vuelve a leer y reintenta. Así dos pedidos simultáneos
  // no se pisan.
  async function actualizar(path, cambiar, intentos = 14) {
    for (let n = 0; n < intentos; n++) {
      const actual = await store.getJson(path)
      const resultado = cambiar(actual?.data ?? null)
      if (resultado === undefined) return { cambio: false }
      try {
        await store.putJson(path, resultado, actual?.etag ?? null)
        return { cambio: true }
      } catch (e) {
        if (e?.code !== 'PRECONDITION') throw e
        // Alguien escribió primero. Esperamos un rato AL AZAR (cada vez más largo)
        // para que los que chocaron no vuelvan a chocar todos juntos.
        await pausa(Math.random() * 25 * (n + 1))
      }
    }
    throw new Error('Se pisaron muchos cambios a la vez, probá de nuevo.')
  }

  async function registrarPedido(pedido) {
    let duplicado = false
    let lleno = false
    await actualizar(monthPath(mesDeId(pedido.id) || ahoraART().ym), (mes) => {
      const orders = mes?.orders || []
      if (orders.length >= MAX_ORDERS_PER_MONTH) { lleno = true; return undefined }
      const f = huella(pedido)
      const reciente = orders.slice(-5).some(
        (o) => huella(o) === f && Date.parse(pedido.at) - Date.parse(o.at) < DUP_WINDOW_MS,
      )
      if (reciente) { duplicado = true; return undefined }
      return { month: mesDeId(pedido.id), orders: [...orders, pedido] }
    })
    return { duplicado, lleno }
  }

  async function leerPedidos(meses) {
    const paths = (await store.listPaths('stats/'))
      .filter((p) => /^stats\/\d{4}-\d{2}\.json$/.test(p))
      .sort()
      .reverse()
      .slice(0, meses)
    const archivos = await Promise.all(paths.map((p) => store.getJson(p)))
    const orders = archivos.flatMap((a) => a?.data?.orders || [])
    orders.sort((a, b) => (a.at < b.at ? 1 : -1)) // más nuevos primero
    return { orders, months: paths.map((p) => p.slice(6, 13)) }
  }

  return async function handler(req, res) {
    const action = String(req.query?.action || req.body?.action || '')
    const json = (code, obj) => res.status(code).json(obj)

    if (action === 'ping') {
      return json(200, { ok: true, configurado: listo, backend: store?.name || null, clave: !!PASS })
    }

    // Config para el sitio público (sin clave). Sin backend → 404 y el sitio
    // usa el config.json que viene con el build.
    if (action === 'public-config') {
      if (!store) return json(404, { error: 'sin backend' })
      try {
        const c = await store.getJson(PATH_CONFIG)
        if (!c?.data) return json(404, { error: 'sin config' })
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=60')
        return json(200, c.data)
      } catch {
        return json(404, { error: 'sin config' })
      }
    }

    if (!listo) {
      return json(501, {
        error: store
          ? 'Falta cargar PANEL_PASSWORD en Vercel.'
          : 'Falta conectar el almacenamiento (Vercel Blob) al proyecto.',
      })
    }

    // Registrar un pedido: público, lo dispara el cliente al pedir por WhatsApp
    if (action === 'order' && req.method === 'POST') {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const pedido = sanitizeOrder(body)
        if (!pedido) return json(400, { error: 'pedido inválido' })
        const r = await registrarPedido(pedido)
        if (r.lleno) return json(429, { error: 'límite del mes alcanzado' })
        return json(200, { ok: true, duplicado: r.duplicado })
      } catch (e) {
        return json(500, { error: e.message })
      }
    }

    // De acá en adelante hace falta la clave del panel
    const dada = req.headers?.['x-panel-key'] ?? req.query?.key ?? req.body?.key
    if (!claveOk(dada)) {
      await pausa(500) // frena un poco los intentos a ciegas
      return json(401, { error: 'Clave incorrecta.' })
    }

    try {
      if (action === 'login') return json(200, { ok: true, backend: store.name })

      if (action === 'get-config') {
        const c = await store.getJson(PATH_CONFIG)
        return json(200, { sha: c?.etag ?? null, config: c?.data ?? null })
      }

      if (action === 'save-config' && req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const config = body?.config
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
          return json(400, { error: 'config inválida' })
        }
        if (JSON.stringify(config).length > 200_000) return json(400, { error: 'config demasiado grande' })
        let nuevoSha = null
        try {
          nuevoSha = await store.putJson(PATH_CONFIG, config, body.sha ?? null)
        } catch (e) {
          if (e?.code === 'PRECONDITION') {
            return json(409, { error: 'Alguien más guardó cambios hace un momento. Recargá el panel y volvé a intentar.' })
          }
          throw e
        }
        return json(200, { ok: true, sha: nuevoSha })
      }

      if (action === 'stats') {
        const meses = Math.min(Math.max(Number(req.query?.months) || 6, 1), 24)
        const r = await leerPedidos(meses)
        return json(200, { ...r, generatedAt: new Date().toISOString() })
      }

      if (action === 'delete-order' && req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        const id = String(body?.id || '')
        const ym = mesDeId(id)
        if (!ym) return json(400, { error: 'id inválido' })
        let borrado = false
        await actualizar(monthPath(ym), (mes) => {
          if (!mes?.orders?.some((o) => o.id === id)) return undefined
          borrado = true
          return { ...mes, orders: mes.orders.filter((o) => o.id !== id) }
        })
        return borrado ? json(200, { ok: true }) : json(404, { error: 'no encontré ese pedido' })
      }

      return json(400, { error: 'acción desconocida' })
    } catch (e) {
      return json(500, { error: e.message })
    }
  }
}
