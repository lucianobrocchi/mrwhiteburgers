// Tests del cálculo de estadísticas. Se corren con:   node --test src/lib/statsCalc.test.mjs
// Los pedidos de abajo están armados a mano; los resultados esperados se
// calcularon aparte, sin pasar por el código.
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcular, frases, aCSV, sumarDias, listarDias, hoyART, diaSemanaDe, variacion } from './statsCalc.js'

// "Ahora" = sábado 10/10/2026, 15:00 en Argentina
const AHORA = new Date('2026-10-10T18:00:00Z')

let n = 0
const pedido = (d, h, total, items, extra = {}) => ({
  id: `${d.replace(/-/g, '')}-${String(++n).padStart(6, '0')}`,
  at: `${d}T${String(h + 3).padStart(2, '0')}:10:00Z`,
  d, h, w: diaSemanaDe(d), total, subtotal: total, discount: 0,
  zoneId: 'retiro', zone: 'Retiro en el local', src: 'directo', items, ...extra,
})
const burger = (id, nombre, s, q, u, x = []) => ({ k: 'b', id, n: nombre, s, sl: s, q, u, x })
const bebida = (nombre, sl, q, u) => ({ k: 'd', id: 'coca', n: nombre, s: sl, sl, q, u, x: [] })
const bacon = { id: 'bacon', n: 'Bacon', q: 1, p: 800 }
const medallon = { id: 'medallon', n: 'Medallón 110 gr', q: 1, p: 1600 }

const PEDIDOS = [
  // ─ semana actual (4/10 a 10/10) ─
  pedido('2026-10-10', 21, 22800, [burger(2, 'OKLAHOMA WHITE', 'doble', 1, 15000, [bacon]), bebida('Coca-Cola', '1,5 L', 1, 5000)], { zoneId: 'z1', zone: 'Zona 1', src: 'instagram' }),
  pedido('2026-10-10', 20, 15000, [burger(2, 'OKLAHOMA WHITE', 'doble', 1, 15000)]),
  pedido('2026-10-09', 21, 35000, [burger(1, 'OBRERA', 'triple', 2, 15500)], { zoneId: 'z2', zone: 'Zona 2', src: 'instagram' }),
  pedido('2026-10-09', 22, 20100, [burger(5, 'CURRI WHITE', 'simple', 1, 13500, [medallon]), bebida('Sprite', 'Lata', 2, 2500)], { src: 'facebook' }),
  pedido('2026-10-04', 20, 17000, [burger(3, 'BIG WHITE', 'doble', 1, 15000)], { zoneId: 'z1', zone: 'Zona 1', src: 'instagram' }),
  // ─ semana anterior (27/9 a 3/10) ─
  pedido('2026-10-03', 21, 10000, [burger(1, 'OBRERA', 'simple', 1, 10000)]),
  pedido('2026-09-30', 20, 20000, [burger(1, 'OBRERA', 'doble', 1, 20000)]),
]

test('fechas: se suman días y se listan rangos', () => {
  assert.equal(sumarDias('2026-10-10', -9), '2026-10-01')
  assert.equal(sumarDias('2026-10-31', 1), '2026-11-01')
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28')
  assert.deepEqual(listarDias('2026-10-08', '2026-10-10'), ['2026-10-08', '2026-10-09', '2026-10-10'])
  assert.equal(diaSemanaDe('2026-10-10'), 6) // sábado
})

test('"hoy" es el día de Argentina aunque en UTC ya sea mañana', () => {
  assert.equal(hoyART(new Date('2026-10-11T01:00:00Z')), '2026-10-10') // 22:00 ART
  assert.equal(hoyART(new Date('2026-10-11T03:00:00Z')), '2026-10-11') // 00:00 ART
})

test('7 días: totales, ticket y comparación con la semana anterior', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.deepEqual(s.rango, { desde: '2026-10-04', hasta: '2026-10-10', dias: 7 })
  assert.equal(s.actual.pedidos, 5)
  assert.equal(s.actual.ventas, 109900)           // 22.800 + 15.000 + 35.000 + 20.100 + 17.000
  assert.equal(Math.round(s.actual.ticket), 21980)
  assert.equal(s.actual.burgers, 6)
  assert.equal(s.actual.bebidas, 3)
  assert.equal(s.previo.pedidos, 2)
  assert.equal(s.previo.ventas, 30000)
  assert.equal(Math.round(s.delta.pedidos), 150)   // de 2 a 5
  assert.equal(Math.round(s.delta.ventas), 266)    // de 30.000 a 109.900
})

test('pedidos por día: rellena con cero los días sin pedidos', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.equal(s.porDia.length, 7)
  const por = Object.fromEntries(s.porDia.map((d) => [d.d, d.pedidos]))
  assert.deepEqual(por, {
    '2026-10-04': 1, '2026-10-05': 0, '2026-10-06': 0, '2026-10-07': 0,
    '2026-10-08': 0, '2026-10-09': 2, '2026-10-10': 2,
  })
  assert.equal(s.mejor.diaSemana.pedidos, 2)
})

test('por hora: 21 h y 20 h tienen 2 pedidos, 22 h tiene 1', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  const por = Object.fromEntries(s.porHora.map((x) => [x.h, x.pedidos]))
  assert.equal(por[20], 2)
  assert.equal(por[21], 2)
  assert.equal(por[22], 1)
  assert.equal(por[19], 0)
})

test('ranking de burgers: por unidades, desempata por ventas', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.deepEqual(s.burgers.map((b) => [b.nombre, b.unidades]), [
    ['OBRERA', 2],          // 2 u. y $31.000: gana el desempate contra Oklahoma ($30.000)
    ['OKLAHOMA WHITE', 2],
    ['BIG WHITE', 1],       // 1 u. y $15.000: gana el desempate contra Curri ($13.500)
    ['CURRI WHITE', 1],
  ])
  assert.equal(Math.round(s.burgers[0].pct), 33)
  assert.deepEqual(s.tamanos, { simple: 1, doble: 3, triple: 2 })
})

test('extras: cuántos pedidos los llevan, cuántos se vendieron y cuánto facturaron', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.equal(s.extras.pedidos, 2)
  assert.equal(Math.round(s.extras.pct), 40)
  assert.equal(s.extras.unidades, 2)
  assert.equal(s.extras.ventas, 2400)              // 800 + 1.600
  assert.deepEqual(s.extras.ranking.map((e) => e.id).sort(), ['bacon', 'medallon'])
})

test('extras: si piden 2 burgers con 2 bacon cada una, son 4 porciones', () => {
  const o = pedido('2026-10-10', 21, 40000, [burger(1, 'OBRERA', 'doble', 2, 14000, [{ id: 'bacon', n: 'Bacon', q: 2, p: 800 }])])
  const s = calcular([o], 'hoy', AHORA)
  assert.equal(s.extras.unidades, 4)
  assert.equal(s.extras.ventas, 3200)              // 4 × 800
})

test('bebidas: pedidos, unidades, ventas y ranking por producto', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.equal(s.bebidas.pedidos, 2)
  assert.equal(s.bebidas.unidades, 3)
  assert.equal(s.bebidas.ventas, 10000)            // 5.000 + 2 × 2.500
  assert.deepEqual(s.bebidas.ranking.map((b) => [b.nombre, b.unidades]), [['Sprite Lata', 2], ['Coca-Cola 1,5 L', 1]])
})

test('envío vs retiro y de dónde vienen los pedidos', () => {
  const s = calcular(PEDIDOS, '7', AHORA)
  assert.equal(s.entrega.envio, 3)
  assert.equal(s.entrega.retiro, 2)
  assert.equal(Math.round(s.entrega.pctEnvio), 60)
  const insta = s.origenes.find((o) => o.src === 'instagram')
  assert.equal(insta.pedidos, 3)
  assert.equal(insta.ventas, 74800)                // 22.800 + 35.000 + 17.000
  assert.equal(Math.round(insta.pct), 60)
  assert.equal(s.origenes[0].src, 'instagram')
})

test('ticket promedio según llevó extras o bebida', () => {
  const t = calcular(PEDIDOS, '7', AHORA).ticket
  assert.equal(Math.round(t.conExtras), 21450)     // (22.800 + 20.100) / 2
  assert.equal(Math.round(t.sinExtras), 22333)     // (15.000 + 35.000 + 17.000) / 3
  assert.equal(t.nConExtras, 2)
  assert.equal(t.nSinExtras, 3)
})

test('"hoy" y "todo" usan el rango correcto', () => {
  const hoy = calcular(PEDIDOS, 'hoy', AHORA)
  assert.equal(hoy.actual.pedidos, 2)
  assert.equal(hoy.rango.dias, 1)
  assert.equal(hoy.previo.pedidos, 2)              // el día anterior (9/10) también tuvo 2

  const todo = calcular(PEDIDOS, 'todo', AHORA)
  assert.equal(todo.actual.pedidos, 7)
  assert.equal(todo.rango.desde, '2026-09-30')
  assert.equal(todo.previo, null)                  // no hay "período anterior" de todo
  assert.equal(todo.delta.pedidos, null)
})

test('acumulado: lo que aporta la web desde el primer pedido', () => {
  const a = calcular(PEDIDOS, '7', AHORA).acumulado
  assert.equal(a.pedidos, 7)
  assert.equal(a.ventas, 139900)                   // 109.900 + 30.000
  assert.equal(a.desde, '2026-09-30')
  assert.equal(a.diasActivos, 5)
})

test('sin pedidos: no rompe ni devuelve NaN', () => {
  const s = calcular([], '30', AHORA)
  assert.equal(s.vacio, true)
  assert.equal(s.hayDatos, false)
  assert.equal(s.actual.ticket, 0)
  assert.equal(s.extras.pct, 0)
  assert.deepEqual(frases(s), [])
  const json = JSON.stringify(s)
  assert.ok(!/NaN|Infinity/.test(json), 'hay NaN o Infinity en el resultado')
})

test('un solo pedido tampoco da divisiones por cero', () => {
  // hoy (10/10) hay 1 pedido y ayer (9/10) hubo 2
  const s = calcular([PEDIDOS[1], PEDIDOS[2], PEDIDOS[3]], 'hoy', AHORA)
  assert.equal(s.actual.pedidos, 1)
  assert.equal(s.delta.pedidos, -50)
  // y sin nada con qué comparar, la variación es "no hay dato", no un número inventado
  assert.equal(calcular([PEDIDOS[1]], 'hoy', AHORA).delta.pedidos, null)
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(s)))
})

test('variación: null si no hay con qué comparar', () => {
  assert.equal(variacion(5, 0), null)
  assert.equal(variacion(5, undefined), null)
  assert.equal(variacion(5, null), null)
  assert.equal(variacion(150, 100), 50)
  assert.equal(variacion(50, 100), -50)
})

test('las frases salen solo con datos suficientes y sin valores raros', () => {
  const pocos = calcular([PEDIDOS[0], PEDIDOS[1]], '7', AHORA)
  assert.deepEqual(frases(pocos), []) // menos de 5 pedidos: no inventa tendencias

  const s = calcular(PEDIDOS, '7', AHORA)
  const f = frases(s, (x) => x.toUpperCase())
  assert.ok(f.length >= 4)
  assert.ok(f.every((t) => typeof t === 'string' && !/NaN|undefined|Infinity/.test(t)), f.join(' | '))
  assert.ok(f.some((t) => /más pedida/.test(t)))
  assert.ok(f.some((t) => /INSTAGRAM/.test(t)))
})

test('CSV: una fila por ítem, con BOM, comillas y separador ;', () => {
  const csv = aCSV([pedido('2026-10-10', 21, 1000, [burger(1, 'OBRERA "la clásica"', 'doble', 1, 1000)])])
  assert.ok(csv.startsWith('﻿'))
  const lineas = csv.replace('﻿', '').split('\n')
  assert.equal(lineas.length, 2)
  assert.match(lineas[0], /^fecha;hora;pedido;tipo/)
  assert.ok(lineas[1].includes('"OBRERA ""la clásica"""'), lineas[1])
})

test('los días de la semana quedan en plural ("los sábados", "los viernes")', () => {
  // 6 pedidos solo en sábado → "Los sábados..."; 6 solo en viernes → "Los viernes..."
  const hacer = (d) => Array.from({ length: 6 }, (_, i) =>
    pedido(d, 21, 10000 + i, [burger(1, 'OBRERA', 'doble', 1, 10000 + i)], { src: i % 2 ? 'instagram' : 'directo' }))
  const sab = frases(calcular(hacer('2026-10-10'), '7', AHORA)).find((f) => /concentran/.test(f))
  assert.match(sab, /^Los sábados concentran/)
  const vie = frases(calcular(hacer('2026-10-09'), '7', AHORA)).find((f) => /concentran/.test(f))
  assert.match(vie, /^Los viernes concentran/)
})
