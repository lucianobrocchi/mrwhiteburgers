#!/usr/bin/env node
// ─── Mide esquinas de La Plata sobre OpenStreetMap ───────────────────────
// Sirve para armar zonas de envío: cada zona es un rectángulo de la grilla
// (un rango de calles × otro rango de calles) y esto devuelve sus 4 esquinas
// reales, listas para pegar en src/lib/zones.js.
//
//   node scripts/zone-corners.mjs --zona 22,31 72,80
//   node scripts/zone-corners.mjs --zona 22,31 72,80 --zona 13,22 72,80
//   node scripts/zone-corners.mjs --punto 27,80
//   node scripts/zone-corners.mjs --refrescar --punto 27,80     (vuelve a bajar los datos)
//
// La Plata tiene dos familias de calles que se cruzan en ángulo recto:
//   A  1 a 31 en el casco (Av. 1 a Av. 31); sigue 115–131 hacia el NE y 132–203 hacia el SO
//   B  32 a 99 (Av. 32 a Av. 72 en el casco; 73–99 pasando la Av. 72); 485–532 NO; 600–671 SE
// Los números van siempre "calle A y calle B"; el orden en que se escriben da igual.
//
// Los datos vienen de la API Overpass (sin clave) y se guardan un día en la
// carpeta temporal para no pedirlos de nuevo en cada corrida.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const LOCAL = { lat: -34.955912, lng: -57.940273 } // 27 esq. 80
const BBOX = [-35.03, -58.05, -34.85, -57.82] // sur, oeste, norte, este
const CACHE = path.join(os.tmpdir(), 'mrwhite-osm-calles.json')
const UA = 'mrwhiteburgers-zone-tool/1.0 (lucianobrocchi@gmail.com)'
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// ─── Familias de calles ──────────────────────────────────────────────────
const familiaDe = (n) => ((n >= 1 && n <= 31) || (n >= 115 && n <= 210) ? 'A' : 'B')
const ANGULO = { A: 138, B: 48 } // dirección de las calles de cada familia (grados)
const TOLERANCIA = 22

// ─── Proyección plana alrededor del local ────────────────────────────────
const COS = Math.cos((LOCAL.lat * Math.PI) / 180)
const aPlano = (p) => ({ x: (p.lon - LOCAL.lng) * 111320 * COS, y: (p.lat - LOCAL.lat) * 110574 })
const aGeo = (p) => ({ lat: LOCAL.lat + p.y / 110574, lng: LOCAL.lng + p.x / (111320 * COS) })

// ─── Descarga (con cache) ────────────────────────────────────────────────
async function traerCalles(refrescar) {
  if (!refrescar && fs.existsSync(CACHE) && Date.now() - fs.statSync(CACHE).mtimeMs < 24 * 3600e3) {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  }
  const q =
    `[out:json][timeout:120];way["highway"]["name"~"^(Calle|Avenida) [0-9]+$"](${BBOX.join(',')});out geom tags;`
  let ultimoError = null
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (const url of SERVIDORES) {
      try {
        console.error(`Bajando calles de OpenStreetMap (${new URL(url).host})…`)
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': UA, Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(q),
          signal: AbortSignal.timeout(150_000),
        })
        const txt = await r.text()
        if (!r.ok || !txt.trim().startsWith('{')) throw new Error(`respuesta ${r.status}`)
        const datos = JSON.parse(txt)
        fs.writeFileSync(CACHE, JSON.stringify(datos))
        return datos
      } catch (e) {
        ultimoError = e
      }
    }
    await new Promise((r) => setTimeout(r, 4000))
  }
  throw new Error(`No pude bajar los datos de OpenStreetMap (${ultimoError?.message}). Probá de nuevo en un rato.`)
}

// Segmentos de una calle (solo los que van en la dirección de su familia)
function segmentosDeCalle(datos, numero) {
  const fam = familiaDe(numero)
  const re = new RegExp(`^(Calle|Avenida) ${numero}$`)
  const segs = []
  for (const w of datos.elements) {
    if (w.type !== 'way' || !w.geometry || !re.test(w.tags?.name || '')) continue
    const pts = w.geometry.map(aPlano)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      if (len < 1) continue
      let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      ang = ((ang % 180) + 180) % 180
      let d = Math.abs(ang - ANGULO[fam])
      d = Math.min(d, 180 - d)
      if (d <= TOLERANCIA) segs.push({ a, b, len })
    }
  }
  return soloLaPrincipal(segs, fam)
}

// A veces el mismo número se repite en OSM para calles que no son la misma
// (por ejemplo "Avenida 32" es el límite del casco y hay unos tramos sueltos de
// una "Calle 32" a 6 km de ahí). Me quedo con el grupo de tramos que más largo
// suma sobre una misma línea y descarto los que están lejos de esa línea.
function soloLaPrincipal(segs, fam) {
  if (segs.length < 2) return segs
  const eje = ((ANGULO[fam] + 90) * Math.PI) / 180 // perpendicular a las calles de la familia
  const off = (s) => ((s.a.x + s.b.x) / 2) * Math.cos(eje) + ((s.a.y + s.b.y) / 2) * Math.sin(eje)
  const conOff = segs.map((s) => ({ s, o: off(s) }))
  let mejor = null
  for (const c of conOff) {
    const peso = conOff.reduce((t, q) => (Math.abs(q.o - c.o) <= 300 ? t + q.s.len : t), 0)
    if (!mejor || peso > mejor.peso) mejor = { o: c.o, peso }
  }
  return conOff.filter((c) => Math.abs(c.o - mejor.o) <= 1200).map((c) => c.s)
}

// ─── Geometría ───────────────────────────────────────────────────────────
function cruce(s, t) {
  const rx = s.b.x - s.a.x, ry = s.b.y - s.a.y
  const sx = t.b.x - t.a.x, sy = t.b.y - t.a.y
  const den = rx * sy - ry * sx
  if (Math.abs(den) < 1e-9) return null
  const qx = t.a.x - s.a.x, qy = t.a.y - s.a.y
  const u = (qx * sy - qy * sx) / den
  const v = (qx * ry - qy * rx) / den
  if (u < 0 || u > 1 || v < 0 || v > 1) return null
  return { x: s.a.x + u * rx, y: s.a.y + u * ry }
}

function distPuntoSegmento(p, s) {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (s.a.x + t * dx), p.y - (s.a.y + t * dy))
}

// Recta que mejor representa a una calle cerca de un punto (mínimos cuadrados
// totales sobre los tramos que están a menos de `radio` metros). Promedia las
// dos manos de las avenidas dobles y no se deja engañar por un tramo suelto.
function rectaCerca(segs, centro, radio) {
  const cerca = segs.filter((s) => Math.min(distPuntoSegmento(centro, s)) <= radio)
  if (!cerca.length) return null
  let W = 0, mx = 0, my = 0
  for (const s of cerca) {
    const w = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)
    mx += w * (s.a.x + s.b.x) / 2; my += w * (s.a.y + s.b.y) / 2; W += w
  }
  mx /= W; my /= W
  let sxx = 0, syy = 0, sxy = 0
  for (const s of cerca) {
    const w = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)
    for (const p of [s.a, s.b]) {
      const dx = p.x - mx, dy = p.y - my
      sxx += w * dx * dx / 2; syy += w * dy * dy / 2; sxy += w * dx * dy / 2
    }
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  return { p: { x: mx, y: my }, d: { x: Math.cos(ang), y: Math.sin(ang) }, n: cerca.length }
}

function cruceRectas(r, q) {
  const den = r.d.x * q.d.y - r.d.y * q.d.x
  if (Math.abs(den) < 1e-6) return null
  const t = ((q.p.x - r.p.x) * q.d.y - (q.p.y - r.p.y) * q.d.x) / den
  return { x: r.p.x + t * r.d.x, y: r.p.y + t * r.d.y }
}

// Si dos calles no se tocan en OSM (hay huecos), se ajusta una recta a cada una
// con los tramos cercanos, se cruzan, y se repite alrededor del cruce hallado.
function cruceExtrapolado(sa, sb) {
  const todos = [...sa, ...sb]
  const pts = todos.map((s) => ({ x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 }))
  // Arranque: el punto medio de los dos tramos más cercanos entre sí
  let mejor = null
  for (const s of sa) for (const t of sb) {
    const d = Math.min(distPuntoSegmento(s.a, t), distPuntoSegmento(s.b, t), distPuntoSegmento(t.a, s), distPuntoSegmento(t.b, s))
    if (!mejor || d < mejor.d) mejor = { d, c: { x: (s.a.x + s.b.x + t.a.x + t.b.x) / 4, y: (s.a.y + s.b.y + t.a.y + t.b.y) / 4 } }
  }
  if (!mejor || !pts.length) return null
  let c = mejor.c
  let res = null
  for (let i = 0; i < 3; i++) {
    const r = rectaCerca(sa, c, 1500) || rectaCerca(sa, c, 4000)
    const q = rectaCerca(sb, c, 1500) || rectaCerca(sb, c, 4000)
    if (!r || !q) return null
    const x = cruceRectas(r, q)
    if (!x) return null
    c = x
    res = x
  }
  const hueco = Math.min(
    Math.min(...sa.map((s) => distPuntoSegmento(res, s))),
    Math.min(...sb.map((s) => distPuntoSegmento(res, s))),
  )
  return { punto: res, hueco: mejor.d, lejos: hueco }
}

// Esquina entre la calle A y la calle B: promedio de los cruces cercanos entre
// sí (las avenidas dobles dan dos cruces casi iguales) y, si hay varios grupos,
// el más cercano al local.
function esquina(datos, nA, nB, cache, soloRectas = false) {
  const key = `${nA}y${nB}${soloRectas ? 'r' : ''}`
  if (cache.has(key)) return cache.get(key)
  const sa = segmentosDeCalle(datos, nA)
  const sb = segmentosDeCalle(datos, nB)
  if (!sa.length) throw new Error(`No encontré la calle ${nA} en OpenStreetMap (zona de La Plata).`)
  if (!sb.length) throw new Error(`No encontré la calle ${nB} en OpenStreetMap (zona de La Plata).`)
  const hits = []
  for (const s of sa) for (const t of sb) {
    const c = cruce(s, t)
    if (c) hits.push(c)
  }
  let res
  if (hits.length && !soloRectas) {
    const grupos = []
    for (const h of hits) {
      const g = grupos.find((g) => Math.hypot(g.x - h.x, g.y - h.y) < 90)
      if (g) { g.pts.push(h); g.x = g.pts.reduce((a, p) => a + p.x, 0) / g.pts.length; g.y = g.pts.reduce((a, p) => a + p.y, 0) / g.pts.length }
      else grupos.push({ x: h.x, y: h.y, pts: [h] })
    }
    grupos.sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y))
    res = { ...aGeo(grupos[0]), aviso: grupos.length > 1 ? `hay ${grupos.length} cruces distintos, usé el más cercano al local` : '' }
  } else {
    const e = cruceExtrapolado(sa, sb)
    if (!e) throw new Error(`Las calles ${nA} y ${nB} no se cruzan.`)
    res = {
      ...aGeo(e.punto),
      aviso: `no se tocan en OSM (hueco de ${Math.round(e.hueco)} m): esquina calculada con la recta de cada calle` +
        (e.lejos > 400 ? `, a ${Math.round(e.lejos)} m del tramo mapeado más cercano` : ''),
    }
  }
  cache.set(key, res)
  return res
}

export { traerCalles, esquina, familiaDe, LOCAL }

// ─── Entrada (solo cuando se corre desde la terminal) ────────────────────
const comoScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

const par = (txt) => String(txt).split(',').map((n) => Number(n.trim()))

function separar(x, y) {
  // Devuelve [A, B] sin importar el orden en que se escribieron
  const fx = familiaDe(x), fy = familiaDe(y)
  if (fx === fy) throw new Error(`Las calles ${x} y ${y} son de la misma familia: tienen que ser una de cada una (ver arriba).`)
  return fx === 'A' ? [x, y] : [y, x]
}

const args = comoScript ? process.argv.slice(2) : []
const zonas = []
let punto = null
let refrescar = false
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--zona') { zonas.push([par(args[i + 1]), par(args[i + 2])]); i += 2 }
  else if (args[i] === '--punto') { punto = par(args[i + 1]); i += 1 }
  else if (args[i] === '--refrescar') refrescar = true
}
if (comoScript && !zonas.length && !punto) {
  console.error('Uso:\n  node scripts/zone-corners.mjs --zona 22,31 72,80\n  node scripts/zone-corners.mjs --punto 27,80')
  process.exit(1)
}

const fmt = (c) => `[${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}]`

if (comoScript) try {
  const datos = await traerCalles(refrescar)
  const cache = new Map()

  if (punto) {
    const [a, b] = separar(punto[0], punto[1])
    const c = esquina(datos, a, b, cache)
    console.log(`Calle ${a} y calle ${b}: ${fmt(c)}${c.aviso ? `   ⚠ ${c.aviso}` : ''}`)
  }

  for (const [p1, p2] of zonas) {
    // Cada par puede venir en cualquier orden: se detecta cuál es la familia A
    const f1 = familiaDe(p1[0])
    const [parA, parB] = f1 === 'A' ? [p1, p2] : [p2, p1]
    const [a1, a2] = parA
    const [b1, b2] = parB
    // Convención de zones.js: A2×B2 → A1×B2 → A1×B1 → A2×B1
    const esquinas = [[a2, b2], [a1, b2], [a1, b1], [a2, b1]].map(([a, b]) => ({ a, b, c: esquina(datos, a, b, cache) }))
    console.log(`\n// De ${a1} a ${a2} · de ${b1} a ${b2}`)
    console.log(`// ${esquinas.map((e) => `${e.a}y${e.b}`).join(' → ')}`)
    console.log('polygon: [')
    for (const e of esquinas) console.log(`  ${fmt(e.c)},${e.c.aviso ? `   // ⚠ ${e.a}y${e.b}: ${e.c.aviso}` : ''}`)
    console.log(']')
  }
} catch (e) {
  console.error('✖ ' + e.message)
  process.exit(1)
}
