// Tests del backend del panel. Se corren con:   node --test server/
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPanel, sanitizeOrder, ahoraART } from './panel-core.js'
import { memoryStore } from './memory-store.js'

const CLAVE = 'clave-de-prueba'

const mkRes = () => ({
  code: 200, body: null, headers: {},
  status(c) { this.code = c; return this },
  json(o) { this.body = o; return this },
  setHeader(k, v) { this.headers[k] = v },
})
const llamar = async (handler, { action, method = 'GET', body, key, query = {} }) => {
  const res = mkRes()
  await handler({ query: { action, ...query }, method, body, headers: key ? { 'x-panel-key': key } : {} }, res)
  return res
}
const pedido = (extra = {}) => ({
  items: [{ k: 'b', id: 1, n: 'OBRERA', s: 'doble', sl: 'Doble', q: 1, u: 14000, x: [{ id: 'bacon', n: 'Bacon', q: 1, p: 800 }] }],
  total: 14800, zoneId: 'z1', zone: 'Zona 1', src: 'instagram', ...extra,
})
const nuevo = (opts) => {
  const store = memoryStore(opts)
  return { store, h: createPanel({ store, env: { PANEL_PASSWORD: CLAVE } }) }
}

// ─── Zona horaria ────────────────────────────────────────────────────────
test('la hora es la de Argentina, no UTC (un pedido de las 22:30 no pasa al día siguiente)', () => {
  // 01:30 UTC del 3/10 = 22:30 del viernes 2/10 en Buenos Aires
  const a = ahoraART(new Date('2026-10-03T01:30:00Z'))
  assert.equal(a.d, '2026-10-02')
  assert.equal(a.h, 22)
  assert.equal(a.w, 5) // viernes
  assert.equal(a.ym, '2026-10')
  // 02:59 UTC del 1/11 = 23:59 del 31/10: todavía es octubre en Argentina
  assert.equal(ahoraART(new Date('2026-11-01T02:59:00Z')).ym, '2026-10')
  // 03:00 UTC = 00:00 ART: ahí recién cambia
  assert.equal(ahoraART(new Date('2026-11-01T03:00:00Z')).ym, '2026-11')
})

// ─── Validación ──────────────────────────────────────────────────────────
test('sanitizeOrder descarta pedidos vacíos o basura', () => {
  assert.equal(sanitizeOrder(null), null)
  assert.equal(sanitizeOrder({}), null)
  assert.equal(sanitizeOrder({ items: [] }), null)
  assert.equal(sanitizeOrder({ items: [{ n: 'X', q: 0 }] }), null)
  assert.equal(sanitizeOrder({ items: [{ q: 2 }] }), null) // sin nombre
})

test('sanitizeOrder recorta y limita lo que manda el visitante', () => {
  const o = sanitizeOrder({
    items: [{ k: 'b', id: 1, n: 'A'.repeat(500), s: 'doble', q: 9999, u: -5, x: [{ id: 'z', n: 'E', q: 99, p: 1e12 }] }],
    total: 1e12, src: 'Instagram<script>',
  })
  assert.equal(o.items[0].n.length, 40)
  assert.equal(o.items[0].q, 50)
  assert.equal(o.items[0].u, 0)
  assert.equal(o.items[0].x[0].q, 10)
  assert.equal(o.items[0].x[0].p, 20000)
  assert.equal(o.total, 3_000_000)
  assert.equal(o.src, 'instagramscript') // sin símbolos raros
})

// ─── Pedidos y estadísticas ──────────────────────────────────────────────
test('sin clave configurada responde 501 y no registra nada', async () => {
  const h = createPanel({ store: memoryStore(), env: {} })
  assert.equal((await llamar(h, { action: 'order', method: 'POST', body: pedido() })).code, 501)
  const ping = await llamar(h, { action: 'ping' })
  assert.equal(ping.body.configurado, false)
})

test('sin store (Blob no conectado) avisa y el sitio cae al archivo', async () => {
  const h = createPanel({ store: null, env: { PANEL_PASSWORD: CLAVE } })
  assert.equal((await llamar(h, { action: 'public-config' })).code, 404)
  assert.equal((await llamar(h, { action: 'order', method: 'POST', body: pedido() })).code, 501)
})

test('registra un pedido y lo devuelve en las estadísticas (solo con clave)', async () => {
  const { h } = nuevo()
  const r = await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  assert.equal(r.code, 200)

  assert.equal((await llamar(h, { action: 'stats' })).code, 401)
  assert.equal((await llamar(h, { action: 'stats', key: 'mala' })).code, 401)

  const s = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(s.code, 200)
  assert.equal(s.body.orders.length, 1)
  const o = s.body.orders[0]
  assert.equal(o.total, 14800)
  assert.equal(o.src, 'instagram')
  assert.equal(o.items[0].x[0].id, 'bacon')
  assert.match(o.id, /^\d{8}-[0-9a-f]{6}$/)
})

test('el mismo pedido enviado dos veces seguidas cuenta una sola vez', async () => {
  const { h } = nuevo()
  await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  const dos = await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  assert.equal(dos.body.duplicado, true)
  const s = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(s.body.orders.length, 1)
})

test('pedidos distintos no se confunden con duplicados', async () => {
  const { h } = nuevo()
  await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  await llamar(h, { action: 'order', method: 'POST', body: pedido({ total: 20000, items: [{ k: 'b', id: 2, n: 'BIG WHITE', s: 'triple', q: 1, u: 16500, x: [] }] }) })
  const s = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(s.body.orders.length, 2)
})

test('25 pedidos AL MISMO TIEMPO se guardan todos (no se pisan)', async () => {
  // latencia simulada entre leer y escribir: ahí es donde se perdería alguno
  const { h } = nuevo({ latencia: 15 })
  await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      llamar(h, {
        action: 'order', method: 'POST',
        body: pedido({ total: 10000 + i, items: [{ k: 'b', id: 1, n: 'OBRERA', s: 'doble', q: i + 1, u: 14000, x: [] }] }),
      }),
    ),
  )
  const s = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(s.body.orders.length, 25)
  assert.equal(new Set(s.body.orders.map((o) => o.id)).size, 25) // ids únicos
})

test('se puede borrar un pedido (por ejemplo uno de prueba)', async () => {
  const { h } = nuevo()
  await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  const [o] = (await llamar(h, { action: 'stats', key: CLAVE })).body.orders

  assert.equal((await llamar(h, { action: 'delete-order', method: 'POST', body: { id: o.id } })).code, 401)
  assert.equal((await llamar(h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id: o.id } })).code, 200)
  assert.equal((await llamar(h, { action: 'stats', key: CLAVE })).body.orders.length, 0)
  assert.equal((await llamar(h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id: o.id } })).code, 404)
  assert.equal((await llamar(h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id: 'basura' } })).code, 400)
})

test('las estadísticas juntan varios meses, más nuevos primero', async () => {
  const { h, store } = nuevo()
  await store.putJson('stats/2026-09.json', { orders: [{ id: '20260915-aaaaaa', at: '2026-09-15T23:00:00Z', total: 1, items: [] }] }, null)
  await store.putJson('stats/2026-10.json', { orders: [{ id: '20261002-bbbbbb', at: '2026-10-02T23:00:00Z', total: 2, items: [] }] }, null)
  const s = await llamar(h, { action: 'stats', key: CLAVE })
  assert.deepEqual(s.body.months, ['2026-10', '2026-09'])
  assert.deepEqual(s.body.orders.map((o) => o.total), [2, 1])
  const uno = await llamar(h, { action: 'stats', key: CLAVE, query: { months: '1' } })
  assert.equal(uno.body.orders.length, 1)
})

// ─── Config del panel ────────────────────────────────────────────────────
test('la config se guarda, se lee y el sitio público la ve (sin clave)', async () => {
  const { h } = nuevo()
  assert.equal((await llamar(h, { action: 'public-config' })).code, 404) // todavía no hay

  assert.equal((await llamar(h, { action: 'save-config', method: 'POST', body: { config: { stock: { 'extra:bacon': true } } } })).code, 401)
  const g0 = await llamar(h, { action: 'get-config', key: CLAVE })
  assert.equal(g0.body.config, null)

  const s = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { stock: { 'extra:bacon': true } }, sha: g0.body.sha } })
  assert.equal(s.code, 200)

  const pub = await llamar(h, { action: 'public-config' })
  assert.equal(pub.code, 200)
  assert.deepEqual(pub.body.stock, { 'extra:bacon': true })
  assert.match(pub.headers['Cache-Control'], /s-maxage/)
})

test('dos personas editando a la vez: la segunda recibe aviso en vez de pisar a la primera', async () => {
  const { h } = nuevo()
  await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 1 } } })
  const luciano = (await llamar(h, { action: 'get-config', key: CLAVE })).body   // lee v1
  const joaco = (await llamar(h, { action: 'get-config', key: CLAVE })).body     // lee v1

  assert.equal((await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 2 }, sha: luciano.sha } })).code, 200)
  const choque = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 3 }, sha: joaco.sha } })
  assert.equal(choque.code, 409)
  assert.match(choque.body.error, /Recargá/)
  assert.equal((await llamar(h, { action: 'get-config', key: CLAVE })).body.config.v, 2) // se conservó la de Luciano
})

test('rechaza configs inválidas', async () => {
  const { h } = nuevo()
  for (const config of [null, 'texto', [1, 2], 5]) {
    assert.equal((await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config } })).code, 400)
  }
})

test('la clave se compara bien (no acepta prefijos ni vacía)', async () => {
  const { h } = nuevo()
  for (const k of ['', 'clave', CLAVE + 'x', undefined]) {
    assert.equal((await llamar(h, { action: 'login', key: k })).code, 401, `aceptó "${k}"`)
  }
  assert.equal((await llamar(h, { action: 'login', key: CLAVE })).code, 200)
})

test('guardar dos veces seguidas en la misma sesión funciona (el panel usa la versión nueva)', async () => {
  const { h } = nuevo()
  const g = (await llamar(h, { action: 'get-config', key: CLAVE })).body
  const uno = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 1 }, sha: g.sha } })
  assert.equal(uno.code, 200)
  assert.ok(uno.body.sha, 'el servidor tiene que devolver la versión nueva')
  const dos = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 2 }, sha: uno.body.sha } })
  assert.equal(dos.code, 200, 'el segundo guardado fue rechazado')
  const tres = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { v: 3 }, sha: dos.body.sha } })
  assert.equal(tres.code, 200)
  assert.equal((await llamar(h, { action: 'get-config', key: CLAVE })).body.config.v, 3)
})
