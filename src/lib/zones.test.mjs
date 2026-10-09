// Zonas de envío: node --test src/lib/zones.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { ZONES, SECTORES, LOCAL, PICKUP, OTHER, findZone, zonePrice, formatZonePrice, zonaDeCalles } from './zones.js'

const COS = Math.cos((LOCAL.lat * Math.PI) / 180)
const aPlano = ([lat, lng]) => ({ x: (lng - LOCAL.lng) * 111320 * COS, y: (lat - LOCAL.lat) * 110574 })

// Punto dentro de un polígono (ray casting) en coordenadas planas
function dentro(p, poly) {
  let ok = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ok = !ok
  }
  return ok
}
const centro = (poly) => ({ x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length })

test('las zonas que ya existían conservan nombre, id y precio', () => {
  assert.equal(findZone('z1').name, 'Zona 1')
  assert.equal(findZone('z1').price, 2000)
  assert.equal(findZone('z2').price, 4000)
  assert.equal(findZone('retiro'), PICKUP)
  assert.equal(findZone('otra'), OTHER)
  assert.equal(findZone('nope'), null)
})

test('hay 5 zonas con precio creciente y todas tienen rectángulos', () => {
  assert.equal(ZONES.length, 5)
  const precios = ZONES.map((z) => z.price)
  assert.deepEqual([...precios].sort((a, b) => a - b), precios)
  assert.equal(new Set(ZONES.map((z) => z.color)).size, 5)
  for (const z of ZONES) {
    assert.ok(z.sectores.length > 0, `${z.name} sin rectángulos`)
    assert.ok(z.calles.length > 0, `${z.name} sin descripción de calles`)
  }
})

test('cada rectángulo tiene 4 esquinas válidas de La Plata y un km coherente', () => {
  for (const s of SECTORES) {
    assert.equal(s.polygon.length, 4)
    for (const [lat, lng] of s.polygon) {
      assert.ok(lat < -34.8 && lat > -35.1 && lng < -57.8 && lng > -58.1, `fuera de La Plata: ${lat},${lng}`)
    }
    const dMax = Math.max(...s.polygon.map(aPlano).map((p) => Math.hypot(p.x, p.y))) / 1000
    assert.ok(Math.abs(dMax - s.km) < 0.06, `km incorrecto en ${s.a}x${s.b}: ${dMax} vs ${s.km}`)
  }
})

test('los rectángulos no se pisan entre sí', () => {
  const polys = SECTORES.map((s) => s.polygon.map(aPlano))
  for (let i = 0; i < polys.length; i++) {
    for (let j = 0; j < polys.length; j++) {
      if (i === j) continue
      // El centro de un rectángulo nunca puede caer dentro de otro
      assert.ok(!dentro(centro(polys[i]), polys[j]), `se pisan ${SECTORES[i].a}x${SECTORES[i].b} y ${SECTORES[j].a}x${SECTORES[j].b}`)
    }
  }
})

test('el local queda dentro de la Zona 1', () => {
  const z1 = ZONES[0].sectores.map((s) => s.polygon.map(aPlano))
  // El local está justo sobre el borde entre dos rectángulos: probamos un punto apenas hacia adentro
  const cerca = { x: 20, y: 5 }
  assert.ok(z1.some((p) => dentro(cerca, p)) || z1.some((p) => dentro({ x: -20, y: -5 }, p)))
})

test('zonaDeCalles: esquinas conocidas', () => {
  assert.equal(zonaDeCalles(27, 80).zona.id, 'z1') // el local
  assert.equal(zonaDeCalles(80, 27).zona.id, 'z1') // el orden no importa
  assert.equal(zonaDeCalles(25, 75).zona.id, 'z1')
  assert.equal(zonaDeCalles(15, 75).zona.id, 'z2') // de 13 a 22 · de 72 a 80
  assert.equal(zonaDeCalles(30, 66).zona.id, 'z2') // de 22 a 31 · de 60 a 72
  assert.equal(zonaDeCalles(12, 60).zona.name.startsWith('Zona'), true)
  assert.equal(zonaDeCalles(136, 80).zona.id, 'z2') // pasando la Av. 31 hacia el SO
  assert.equal(zonaDeCalles(120, 55).zona.name.startsWith('Zona'), true) // pasando la Av. 1 hacia el NE (hasta la 122)
  assert.equal(zonaDeCalles(137, 70).zona.name.startsWith('Zona'), true) // la 137 es el límite hacia el SO
  assert.equal(zonaDeCalles(10, 32).zona.name.startsWith('Zona'), true) // la 32 es el límite hacia el NO
})

test('zonaDeCalles: en el borde entre dos zonas gana la más barata', () => {
  // Calle 22 es el borde entre [13,22] y [22,31]; con calle 80 entre Zona 1 y Zona 2
  assert.equal(zonaDeCalles(22, 80).zona.id, 'z1')
  assert.equal(zonaDeCalles(31, 72).zona.id, 'z1')
})

test('zonaDeCalles: fuera de las zonas y entradas inválidas', () => {
  assert.equal(zonaDeCalles(10, 700).error, 'numero')
  assert.equal(zonaDeCalles(0, 60).error, 'numero')
  assert.equal(zonaDeCalles(12, 20).error, 'misma') // las dos son de la numeración 1-31
  assert.equal(zonaDeCalles(60, 80).error, 'misma') // las dos son de la numeración 32-99
  assert.equal(zonaDeCalles(140, 60).fuera, true) // más allá de la 137
  assert.equal(zonaDeCalles(12, 530).fuera, true) // más allá de la 32 (hacia el NO)
  assert.equal(zonaDeCalles(125, 60).fuera, true) // más allá de la 122 (hacia el NE)
  assert.equal(zonaDeCalles(12, 95).fuera, true) // más allá de la 90 (hacia el SE)
  assert.equal(zonaDeCalles(12, 650).fuera, true)
})

test('el precio del panel pisa al del código', () => {
  const z = ZONES[2]
  assert.equal(zonePrice(z, {}), z.price)
  assert.equal(zonePrice(z, { zones: { [z.id]: { price: 5500 } } }), 5500)
  assert.equal(formatZonePrice({ price: 2000 }), '$2.000')
  assert.equal(formatZonePrice({ price: null }), 'A coordinar')
  assert.equal(formatZonePrice({ price: 0 }), 'Sin cargo')
})
