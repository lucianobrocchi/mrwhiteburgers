#!/usr/bin/env node
// ─── Arma el mapa de zonas de envío ──────────────────────────────────────
// Parte la ciudad en rectángulos de la grilla de La Plata (rango de calles A ×
// rango de calles B), mide las esquinas reales sobre OpenStreetMap
// (scripts/zone-corners.mjs) y le asigna a cada rectángulo una zona según qué tan
// lejos queda, de su punto más lejano, del local (27 esq. 80).
//
//   node scripts/build-zones.mjs            → escribe src/lib/zoneSectors.js
//
// Para cambiar la cobertura se tocan las listas CALLES_A / CALLES_B (los bordes
// de los rectángulos) o la tabla HASTA_KM (hasta cuántos km llega cada zona).
// Los precios y colores de cada zona no van acá: están en src/lib/zones.js.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { traerCalles, esquina, LOCAL } from './zone-corners.mjs'

// Bordes de los rectángulos. Van en el orden en que se recorren en el mapa y son
// el límite de reparto que dio el local: hasta la 137 (SO), hasta la 32 (NO) y
// hasta la 1 o la 122 (NE; la 122 queda pasando la Av. 1).
//   A: de NE a SO   (122…115 pasan la Av. 1; 1…31 es el casco; 132…137 pasan la Av. 31)
//   B: de NO a SE   (32…72 es el casco; 73…90 pasa la Av. 72)
const CALLES_A = [122, 1, 13, 22, 31, 137]
const CALLES_B = [32, 44, 60, 72, 80, 90]

// Una zona llega hasta tantos km (en línea recta) del local, medidos hasta la
// esquina más lejana del rectángulo. Zona 1 hasta 1,5 km, Zona 2 hasta 3 km…
// Lo que pase del último valor queda fuera ("Otra zona", a coordinar).
const HASTA_KM = [1.5, 3, 4.5, 6, 8]

const COS = Math.cos((LOCAL.lat * Math.PI) / 180)
const km = (c) => Math.hypot((c.lng - LOCAL.lng) * 111320 * COS, (c.lat - LOCAL.lat) * 110574) / 1000
const zonaDe = (d) => {
  const i = HASTA_KM.findIndex((h) => d <= h)
  return i === -1 ? 0 : i + 1
}

const datos = await traerCalles(false)
const cache = new Map()
const sectores = []
const avisos = []

for (let i = 0; i < CALLES_A.length - 1; i++) {
  for (let j = 0; j < CALLES_B.length - 1; j++) {
    const [a1, a2] = [CALLES_A[i], CALLES_A[i + 1]]
    const [b1, b2] = [CALLES_B[j], CALLES_B[j + 1]]
    // Mismo orden que el resto del sitio: A1×B1 → A2×B1 → A2×B2 → A1×B2
    const pares = [[a1, b1], [a2, b1], [a2, b2], [a1, b2]]
    const cs = pares.map(([a, b]) => {
      const c = esquina(datos, a, b, cache)
      if (c.aviso && /a \d+ m del tramo/.test(c.aviso)) avisos.push(`${a}y${b}: ${c.aviso}`)
      return c
    })
    const d = Math.max(...cs.map(km))
    const zona = zonaDe(d)
    if (!zona) { avisos.push(`rectángulo ${a1}-${a2} × ${b1}-${b2} queda fuera (${d.toFixed(1)} km)`); continue }
    sectores.push({
      zona, a: [a1, a2], b: [b1, b2], km: Math.round(d * 10) / 10,
      polygon: cs.map((c) => [Number(c.lat.toFixed(6)), Number(c.lng.toFixed(6))]),
    })
  }
}

// Une rectángulos vecinos de la misma zona para describirla con pocos tramos
// ("De 22 a 31 · de 72 a 90" en vez de dos rectángulos sueltos).
const calles = {}
for (let z = 1; z <= HASTA_KM.length; z++) {
  let rects = sectores
    .filter((s) => s.zona === z)
    .map((s) => ({ ia: [CALLES_A.indexOf(s.a[0]), CALLES_A.indexOf(s.a[1])], ib: [CALLES_B.indexOf(s.b[0]), CALLES_B.indexOf(s.b[1])] }))
  let cambio = true
  while (cambio) {
    cambio = false
    outer: for (let p = 0; p < rects.length; p++) {
      for (let q = p + 1; q < rects.length; q++) {
        const r = rects[p], t = rects[q]
        const mismoA = r.ia[0] === t.ia[0] && r.ia[1] === t.ia[1]
        const mismoB = r.ib[0] === t.ib[0] && r.ib[1] === t.ib[1]
        let nuevo = null
        if (mismoA && (r.ib[1] === t.ib[0] || t.ib[1] === r.ib[0])) nuevo = { ia: r.ia, ib: [Math.min(r.ib[0], t.ib[0]), Math.max(r.ib[1], t.ib[1])] }
        else if (mismoB && (r.ia[1] === t.ia[0] || t.ia[1] === r.ia[0])) nuevo = { ia: [Math.min(r.ia[0], t.ia[0]), Math.max(r.ia[1], t.ia[1])], ib: r.ib }
        if (nuevo) { rects = rects.filter((_, k) => k !== p && k !== q); rects.push(nuevo); cambio = true; break outer }
      }
    }
  }
  calles[z] = rects
    .sort((r, t) => r.ia[0] - t.ia[0] || r.ib[0] - t.ib[0])
    .map((r) => `De ${CALLES_A[r.ia[0]]} a ${CALLES_A[r.ia[1]]} · de ${CALLES_B[r.ib[0]]} a ${CALLES_B[r.ib[1]]}`)
}

// ─── Archivo de salida ───────────────────────────────────────────────────
const aqui = path.dirname(fileURLToPath(import.meta.url))
const salida = path.join(aqui, '..', 'src', 'lib', 'zoneSectors.js')
const lineas = sectores.map((s) =>
  `  { zona: ${s.zona}, a: [${s.a}], b: [${s.b}], km: ${s.km}, polygon: ${JSON.stringify(s.polygon)} },`)
const txt = `// GENERADO por scripts/build-zones.mjs — no se edita a mano (se vuelve a correr el script).
// Cada sector es un rectángulo de la grilla de La Plata: 'a' son las calles del
// primer sentido (1 a 31 y 115+/132+), 'b' las del otro (32 a 99, 485+/600+),
// 'km' es la distancia del local a su esquina más lejana y 'zona' a cuál pertenece.
// Las esquinas son cruces de calles medidos sobre OpenStreetMap.

export const SECTORES = [
${lineas.join('\n')}
]

// Cada zona descripta como tramos de calles (rectángulos vecinos ya unidos)
export const CALLES_DE_ZONA = ${JSON.stringify(calles, null, 2)}
`
fs.writeFileSync(salida, txt)

const porZona = {}
for (const s of sectores) porZona[s.zona] = (porZona[s.zona] || 0) + 1
console.log(`Listo: ${sectores.length} rectángulos → ${path.relative(process.cwd(), salida)}`)
console.log('Rectángulos por zona:', porZona)
for (const z of Object.keys(calles)) console.log(`Zona ${z}: ${calles[z].join(' | ')}`)
if (avisos.length) console.log('\nAvisos:\n  ' + avisos.join('\n  '))
