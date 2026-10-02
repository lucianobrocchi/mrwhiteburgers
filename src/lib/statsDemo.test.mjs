// Verifica que los datos de ejemplo sean coherentes y que el motor de
// estadísticas los procese sin problemas.   node --test src/lib/statsDemo.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { generarDemo } from './statsDemo.js'
import { calcular, frases } from './statsCalc.js'

const catalogo = {
  burgers: [
    { id: 5, name: 'CURRI WHITE',  prices: { simple: 13500, doble: 15000, triple: 16500 } },
    { id: 1, name: 'OBRERA',       prices: { simple: 12500, doble: 14000, triple: 15500 } },
    { id: 4, name: 'LA CHEESE JOA', prices: { simple: 12000, doble: 13000, triple: 15000 } },
    { id: 3, name: 'BIG WHITE',    prices: { simple: 13500, doble: 15000, triple: 16500 } },
    { id: 2, name: 'OKLAHOMA WHITE', prices: { simple: 13500, doble: 15000, triple: 16500 } },
    { id: 6, name: 'LA JOA WHITE', prices: { simple: 13500, doble: 15000, triple: 16000 } },
  ],
  extras: [
    { id: 'medallon', name: 'Medallón 110 gr', price: 1600 },
    { id: 'cheddar', name: 'Cheddar', price: 1000 },
    { id: 'bacon', name: 'Bacon', price: 800 },
  ],
  bebidas: [
    { drink: { id: 'coca', name: 'Coca-Cola / Sprite' }, size: { id: '15', label: '1,5 L', price: 5000 }, flavor: { id: 'coca', label: 'Coca-Cola' }, peso: 0.3 },
    { drink: { id: 'coca', name: 'Coca-Cola / Sprite' }, size: { id: 'lata', label: 'Lata', price: 2500 }, flavor: { id: 'sprite', label: 'Sprite' }, peso: 0.2 },
    { drink: { id: 'aquarius', name: 'Aquarius' }, size: { id: '15', label: '1,5 L', price: 3500 }, peso: 0.2 },
  ],
}
const AHORA = new Date('2026-10-10T18:00:00Z')

test('genera pedidos de ejemplo coherentes', () => {
  const orders = generarDemo({ ...catalogo, now: AHORA })
  assert.ok(orders.length > 100, `pocos pedidos: ${orders.length}`)
  for (const o of orders) {
    assert.ok(o.demo === true)
    assert.ok(o.items.length >= 1)
    // el total = lo de los ítems (con extras) + el envío de la zona
    const envio = { retiro: 0, otra: 0, z1: 2000, z2: 4000 }[o.zoneId]
    const items = o.items.reduce((s, i) => s + i.q * (i.u + i.x.reduce((t, e) => t + e.p * e.q, 0)), 0)
    assert.equal(o.total, items + envio, `total mal en ${o.id}`)
    assert.ok(o.h >= 19 && o.h <= 22)
    assert.notEqual(o.w, 2, 'el martes no se abre')
  }
})

test('es determinístico: misma fecha, mismos datos', () => {
  const a = generarDemo({ ...catalogo, now: AHORA })
  const b = generarDemo({ ...catalogo, now: AHORA })
  assert.equal(JSON.stringify(a), JSON.stringify(b))
})

test('el motor de estadísticas lo procesa y da frases sin valores raros', () => {
  const orders = generarDemo({ ...catalogo, now: AHORA })
  for (const r of ['hoy', '7', '30', 'todo']) {
    const s = calcular(orders, r, AHORA)
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(s)), `valores raros en rango ${r}`)
  }
  const s = calcular(orders, '30', AHORA)
  const f = frases(s)
  assert.ok(f.length >= 5, f.join('\n'))
  assert.ok(f.every((t) => !/NaN|undefined|Infinity/.test(t)))
  // la burger más pedida del ejemplo tiene que ser la de más peso
  assert.equal(s.burgers[0].nombre, 'OKLAHOMA WHITE')
})
