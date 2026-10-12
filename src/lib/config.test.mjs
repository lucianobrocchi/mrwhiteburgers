// Tests de la carga de la config del sitio. Se corren con:   node --test src/lib/config.test.mjs
//
// Las promos viven en la config, así que si la config llega mal (servidor caído,
// archivo roto, respuesta vacía) el sitio tiene que seguir andando y SIN promos
// inventadas. Y cuando Joaco cambia algo con la página abierta, el refresco no puede
// pisar lo bueno con algo más viejo.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as C from './config.js'

// Respuesta de fetch falsa: { status, body } | { bad: true } (JSON roto) | Error (red caída)
function simular(rutas) {
  const llamadas = []
  globalThis.fetch = async (url) => {
    const u = String(url)
    llamadas.push(u)
    const clave = u.includes('public-config') ? 'servidor' : 'archivo'
    const r = typeof rutas[clave] === 'function' ? rutas[clave]() : rutas[clave]
    if (r instanceof Error) throw r
    if (!r) return { ok: false, status: 404, json: async () => ({}) }
    return {
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      json: async () => {
        if (r.bad) throw new SyntaxError('Unexpected token < in JSON')
        return r.body
      },
    }
  }
  return llamadas
}

const promoGuardada = { id: 'a', enabled: true, kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-12' }

test('sin servidor ni archivo: queda la config por defecto, sin promos', async () => {
  simular({ servidor: new Error('red caída'), archivo: new Error('red caída') })
  const c = await C.loadConfig()
  assert.deepEqual(c.promos, [])
  assert.deepEqual(C.getConfig().promos, [])
  assert.equal(C.getConfig().today.closed, false)
})

test('el servidor manda la config (con promos): se usa y se completa con los valores por defecto', async () => {
  const llamadas = simular({ servidor: { body: { ticker: 'hola', promos: [promoGuardada], today: { note: 'x' } } } })
  const c = await C.loadConfig()
  assert.equal(c.ticker, 'hola')
  assert.deepEqual(c.promos, [promoGuardada])
  assert.equal(c.today.note, 'x')
  assert.equal(c.today.closed, false) // lo que falta cae al valor por defecto
  assert.deepEqual(c.prices, {})
  assert.equal(llamadas.length, 1, 'no hace falta el archivo si el servidor contestó')
})

test('config vieja sin el campo promos: sigue andando, promos = []', async () => {
  simular({ servidor: { body: { ticker: 'viejo', stock: { 'extra:bacon': true } } } })
  const c = await C.loadConfig()
  assert.deepEqual(c.promos, [])
  assert.equal(c.ticker, 'viejo')
})

test('servidor sin config (404): se usa el archivo que viene con el sitio', async () => {
  const llamadas = simular({ servidor: { status: 404, body: { error: 'sin config' } }, archivo: { body: { ticker: 'del archivo', promos: [promoGuardada] } } })
  const c = await C.loadConfig()
  assert.equal(c.ticker, 'del archivo')
  assert.deepEqual(c.promos, [promoGuardada])
  assert.equal(llamadas.length, 2)
  assert.match(llamadas[1], /config\.json\?t=\d+/)
})

test('respuestas raras del servidor ({}, null, lista, texto, HTML) no se aplican: se usa el archivo', async () => {
  for (const rara of [{ body: {} }, { body: null }, { body: [1, 2] }, { body: 'texto' }, { body: 5 }, { bad: true }, new Error('x')]) {
    simular({ servidor: rara, archivo: { body: { ticker: 'archivo ok' } } })
    const c = await C.loadConfig()
    assert.equal(c.ticker, 'archivo ok', JSON.stringify(rara))
    assert.equal(Array.isArray(c.promos), true)
  }
})

test('el archivo roto o vacío tampoco rompe nada: queda lo que había', async () => {
  simular({ servidor: new Error('x'), archivo: { body: { ticker: 'bueno' } } })
  await C.loadConfig()
  for (const rara of [{ body: [] }, { body: null }, { body: {} }, { bad: true }, { status: 500 }, new Error('x')]) {
    simular({ servidor: new Error('x'), archivo: rara })
    const c = await C.loadConfig()
    assert.equal(c.ticker, 'bueno', JSON.stringify(rara))
  }
})

test('promos con basura en la config se guardan tal cual (las ignora promosActivas) y no tiran', async () => {
  simular({ servidor: { body: { promos: 'basura' } } })
  assert.equal((await C.loadConfig()).promos, 'basura')
  simular({ servidor: { body: { promos: null } } })
  assert.equal((await C.loadConfig()).promos, null)
})

// ─── Refresco con la página abierta ──────────────────────────────────────
test('refresco: no vuelve a pedir la config si se leyó hace poco', async () => {
  simular({ servidor: { body: { ticker: 'v1' } } })
  await C.loadConfig()
  const llamadas = simular({ servidor: { body: { ticker: 'v2' } } })
  assert.equal(C.refrescarSiHaceFalta(Date.now() + 1000), null)
  assert.equal(llamadas.length, 0)
  assert.equal(C.getConfig().ticker, 'v1')
})

test('refresco: pasado el tiempo trae lo nuevo (una promo apagada en el panel deja de valer)', async () => {
  simular({ servidor: { body: { promos: [promoGuardada] } } })
  await C.loadConfig()
  assert.equal(C.getConfig().promos[0].enabled, true)
  const llamadas = simular({ servidor: { body: { promos: [{ ...promoGuardada, enabled: false }] } } })
  const p = C.refrescarSiHaceFalta(Date.now() + C.REFRESCO_MS + 1)
  assert.ok(p, 'lanza el pedido')
  assert.equal(C.refrescarSiHaceFalta(Date.now() + C.REFRESCO_MS + 1), p, 'no lanza dos a la vez')
  await p
  assert.equal(llamadas.length, 1)
  assert.equal(C.getConfig().promos[0].enabled, false)
})

test('refresco: si el servidor falla no se vuelve al archivo (que puede ser más viejo) y no se pierde lo que había', async () => {
  simular({ servidor: { body: { ticker: 'reciente', promos: [promoGuardada] } } })
  await C.loadConfig()
  for (const falla of [{ status: 404, body: {} }, new Error('red'), { bad: true }, { body: {} }]) {
    const llamadas = simular({ servidor: falla, archivo: { body: { ticker: 'archivo viejo', promos: [] } } })
    await C.refrescarSiHaceFalta(Date.now() + C.REFRESCO_MS + 1)
    assert.equal(C.getConfig().ticker, 'reciente', JSON.stringify(falla))
    assert.deepEqual(C.getConfig().promos, [promoGuardada])
    assert.equal(llamadas.some((u) => u.includes('config.json')), false, 'no toca el archivo')
  }
})

test('refresco: si la config no cambió no se reemplaza (nadie se vuelve a dibujar de más)', async () => {
  simular({ servidor: { body: { ticker: 'igual', promos: [promoGuardada] } } })
  await C.loadConfig()
  const antes = C.getConfig()
  simular({ servidor: { body: { ticker: 'igual', promos: [promoGuardada] } } })
  await C.refrescarSiHaceFalta(Date.now() + C.REFRESCO_MS + 1)
  assert.equal(C.getConfig(), antes, 'mismo objeto')
  simular({ servidor: { body: { ticker: 'otro', promos: [promoGuardada] } } })
  await C.refrescarSiHaceFalta(Date.now() + C.REFRESCO_MS + 1)
  assert.notEqual(C.getConfig(), antes)
  assert.equal(C.getConfig().ticker, 'otro')
})
