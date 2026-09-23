// Función que corre en Vercel, en tu propio dominio.
//
// Resuelve dos cosas:
//  1. El panel ya no llama a api.github.com desde el navegador (que es lo que
//     bloquean los ad-blockers y algunos DNS). Habla con /api/panel, mismo
//     dominio que el sitio.
//  2. El token de GitHub deja de estar en el teléfono y vive en Vercel.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GITHUB_TOKEN    token fine-grained con Contents: Read and write
//   PANEL_PASSWORD  la clave para entrar al panel
//
// Si no están configuradas, el endpoint responde 501 y el panel cae solo al
// modo viejo (token pegado en el navegador).

const REPO = 'lucianobrocchi/mrwhiteburgers'
const CONFIG_PATH = 'public/config.json'
const STATS_PATH = 'stats.json' // fuera de public/: no se sirve al visitante
const BRANCH = 'main'
const MAX_ULTIMOS = 40

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

async function leer(path) {
  const r = await gh(`contents/${encodeURIComponent(path)}?ref=${BRANCH}`)
  if (r.status === 404) return { sha: null, data: null }
  if (!r.ok) throw new Error(`GitHub ${r.status} al leer ${path}`)
  const j = await r.json()
  const txt = Buffer.from(j.content, 'base64').toString('utf8')
  return { sha: j.sha, data: JSON.parse(txt) }
}

async function escribir(path, data, sha, mensaje) {
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

const hoyStr = () => new Date().toISOString().slice(0, 10)

// Suma un pedido a stats.json. Reintenta si otro pedido escribió al mismo tiempo.
async function registrarPedido(pedido, intento = 0) {
  const { sha, data } = await leer(STATS_PATH)
  const stats = data || { byDay: {}, lastOrders: [] }
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

  try {
    await escribir(STATS_PATH, stats, sha, `chore(stats): pedido ${dia}`)
  } catch (e) {
    // 409 = alguien escribió primero. Releemos y reintentamos una vez.
    if (e.status === 409 && intento < 2) return registrarPedido(pedido, intento + 1)
    throw e
  }
  return true
}

export default async function handler(req, res) {
  const { GITHUB_TOKEN, PANEL_PASSWORD } = process.env
  const action = (req.query?.action || req.body?.action || '').toString()

  if (action === 'ping') {
    return res.status(200).json({ ok: true, configurado: !!(GITHUB_TOKEN && PANEL_PASSWORD) })
  }
  if (!GITHUB_TOKEN || !PANEL_PASSWORD) {
    return res.status(501).json({ error: 'Falta configurar GITHUB_TOKEN y PANEL_PASSWORD en Vercel.' })
  }

  // Registrar un pedido: público (lo dispara el cliente al pedir por WhatsApp)
  if (action === 'order' && req.method === 'POST') {
    try {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const pedido = {
        at: new Date().toISOString(),
        items: (b.items || []).slice(0, 20).map((i) => ({
          id: i.id, name: String(i.name || '').slice(0, 40), size: i.size, qty: Number(i.qty) || 0,
        })),
        total: Number(b.total) || 0,
        cashTotal: Number(b.cashTotal) || 0,
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
  if (clave !== PANEL_PASSWORD) return res.status(401).json({ error: 'Clave incorrecta.' })

  try {
    if (action === 'login') return res.status(200).json({ ok: true })

    if (action === 'get-config') {
      const { sha, data } = await leer(CONFIG_PATH)
      return res.status(200).json({ sha, config: data })
    }

    if (action === 'save-config' && req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const sha = await escribir(CONFIG_PATH, b.config, b.sha, b.message || 'chore(config): cambios desde el panel')
      return res.status(200).json({ ok: true, sha })
    }

    if (action === 'stats') {
      const { data } = await leer(STATS_PATH)
      return res.status(200).json(data || { byDay: {}, lastOrders: [] })
    }

    return res.status(400).json({ error: 'acción desconocida' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
