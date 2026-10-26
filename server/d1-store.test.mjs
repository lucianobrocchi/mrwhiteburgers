// node --test server/d1-store.test.mjs
// El panel completo (panel-core) corriendo sobre una base SQLite real disfrazada de D1:
// prueba que dar de alta pedidos, config y borrados anda igual que con el almacén de memoria.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createPanel, ahoraART } from './panel-core.js'
import { d1Store } from './d1-store.js'

function d1Falsa() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'))
  return {
    prepare(sql) {
      return {
        bind(...args) {
          const st = db.prepare(sql)
          return {
            run: async () => ({ meta: { changes: Number(st.run(...args).changes) } }),
            first: async () => st.get(...args) ?? null,
            all: async () => ({ results: st.all(...args) }),
          }
        },
      }
    },
  }
}

const CLAVE = 'clave-de-prueba'
const mkRes = () => ({
  code: 200, body: null, headers: {},
  status(c) { this.code = c; return this },
  json(o) { this.body = o; return this },
  setHeader(k, v) { this.headers[k] = v },
})
const llamar = async (h, { action, method = 'GET', body, key, query = {} }) => {
  const res = mkRes()
  await h({ query: { action, ...query }, method, body, headers: key ? { 'x-panel-key': key } : {} }, res)
  return res
}
const pedido = (extra = {}) => ({
  items: [{ k: 'b', id: 1, n: 'OBRERA', s: 'doble', sl: 'Doble', q: 1, u: 14000, x: [{ id: 'bacon', n: 'Bacon', q: 1, p: 800 }] }],
  total: 14800, zoneId: 'z1', zone: 'Zona 1', src: 'instagram', ...extra,
})
const nuevo = (site = 'mrwhite', db = d1Falsa()) => ({ db, h: createPanel({ store: d1Store(db, site), env: { PANEL_PASSWORD: CLAVE } }) })

test('D1: registra un pedido (una fila) y lo devuelve en las estadísticas, solo con clave', async () => {
  const { h } = nuevo()
  assert.equal((await llamar(h, { action: 'order', method: 'POST', body: pedido() })).code, 200)
  assert.equal((await llamar(h, { action: 'stats' })).code, 401)
  const st = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(st.body.orders.length, 1)
  const o = st.body.orders[0]
  assert.equal(o.total, 14800)
  assert.equal(o.zoneId, 'z1')
  assert.equal(o.items[0].x[0].n, 'Bacon')
  assert.equal(o.d, ahoraART().d)
  assert.deepEqual(st.body.months, [ahoraART().ym])
})

test('D1: el mismo pedido dos veces seguidas cuenta una sola vez y los distintos no se confunden', async () => {
  const { h } = nuevo()
  await llamar(h, { action: 'order', method: 'POST', body: pedido() })
  assert.equal((await llamar(h, { action: 'order', method: 'POST', body: pedido() })).body.duplicado, true)
  await llamar(h, { action: 'order', method: 'POST', body: pedido({ total: 99000, items: [{ k: 'b', id: 2, n: 'BIG WHITE', s: 'triple', q: 1, u: 16500 }] }) })
  assert.equal((await llamar(h, { action: 'stats', key: CLAVE })).body.orders.length, 2)
})

test('D1: 25 pedidos al mismo tiempo se guardan todos', async () => {
  const { h } = nuevo()
  await Promise.all(Array.from({ length: 25 }, (_, i) =>
    llamar(h, { action: 'order', method: 'POST', body: pedido({ total: 10000 + i, items: [{ k: 'b', id: i, n: `B${i}`, s: 'doble', q: 1, u: 10000 + i }] }) })))
  assert.equal((await llamar(h, { action: 'stats', key: CLAVE })).body.orders.length, 25)
})

test('D1: se puede borrar un pedido, y un cliente no borra los de otro', async () => {
  const a = nuevo('mrwhite')
  const b = nuevo('otro', a.db)
  await llamar(a.h, { action: 'order', method: 'POST', body: pedido() })
  const id = (await llamar(a.h, { action: 'stats', key: CLAVE })).body.orders[0].id
  assert.equal((await llamar(b.h, { action: 'stats', key: CLAVE })).body.orders.length, 0)
  assert.equal((await llamar(b.h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id } })).code, 404)
  assert.equal((await llamar(a.h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id } })).code, 200)
  assert.equal((await llamar(a.h, { action: 'stats', key: CLAVE })).body.orders.length, 0)
  assert.equal((await llamar(a.h, { action: 'delete-order', method: 'POST', key: CLAVE, body: { id: 'xx' } })).code, 400)
})

test('D1: la config se guarda, el sitio público la ve y la segunda edición con versión vieja recibe aviso', async () => {
  const { h } = nuevo()
  assert.equal((await llamar(h, { action: 'public-config' })).code, 404)
  const g1 = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { ticker: 'hola' }, sha: null } })
  assert.equal(g1.code, 200)
  assert.equal((await llamar(h, { action: 'public-config' })).body.ticker, 'hola')
  const g2 = await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { ticker: 'dos' }, sha: g1.body.sha } })
  assert.equal(g2.code, 200)
  assert.equal((await llamar(h, { action: 'save-config', method: 'POST', key: CLAVE, body: { config: { ticker: 'pisado' }, sha: g1.body.sha } })).code, 409)
  assert.equal((await llamar(h, { action: 'get-config', key: CLAVE })).body.config.ticker, 'dos')
})

test('D1: los eventos del recorrido se suman por día', async () => {
  const { h } = nuevo()
  for (let i = 0; i < 3; i++) await llamar(h, { action: 'event', method: 'POST', body: { e: { 's:visita': 1 } } })
  const st = await llamar(h, { action: 'stats', key: CLAVE })
  assert.equal(st.body.events[ahoraART().d]['s:visita'], 3)
})
