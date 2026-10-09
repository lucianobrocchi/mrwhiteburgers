// ─── Zonas de envío ──────────────────────────────────────────────────────
// La ciudad se parte en rectángulos de la grilla de La Plata (un rango de
// calles × otro rango de calles). Cada rectángulo pertenece a una zona según qué
// tan lejos queda del local, y cada zona tiene un precio. Los rectángulos y sus
// esquinas (cruces de calles medidos sobre OpenStreetMap) están en
// zoneSectors.js, que genera `node scripts/build-zones.mjs`.
//
// Acá se cambia lo que se ve y se cobra: nombre, precio, color y hasta dónde
// llega cada zona. Para mover los límites o agregar rectángulos, se corre el
// script de arriba.

import { SECTORES, CALLES_DE_ZONA } from './zoneSectors.js'

export const LOCAL = { lat: -34.955912, lng: -57.940273 } // 27 esq. 80

export const PICKUP = { id: 'retiro', name: 'Retiro en el local', price: 0 }

// Para el que vive fuera de las zonas ya definidas: no inventamos un precio,
// se arregla por WhatsApp. price: null = "a coordinar".
export const OTHER = {
  id: 'otra',
  name: 'Otra zona',
  price: null,
  bounds: 'Fuera de estas zonas · lo coordinamos por WhatsApp',
}

// Precio y color de cada zona (n = número de zona = el que usa zoneSectors.js)
const TABLA = [
  { n: 1, price: 2000,  color: '#4ADE80', hasta: '1,5 km' },
  { n: 2, price: 4000,  color: '#F0C832', hasta: '3 km' },
  { n: 3, price: 6000,  color: '#FB923C', hasta: '4,5 km' },
  { n: 4, price: 8000,  color: '#F87171', hasta: '6 km' },
  { n: 5, price: 10000, color: '#C084FC', hasta: '8 km' },
]

export const ZONES = TABLA.map((t) => ({
  id: `z${t.n}`,
  name: `Zona ${t.n}`,
  price: t.price,
  color: t.color,
  bounds: `Hasta ${t.hasta} del local`,
  calles: CALLES_DE_ZONA[t.n] || [],
  sectores: SECTORES.filter((s) => s.zona === t.n),
}))

export { SECTORES }

export const findZone = (id) =>
  id === PICKUP.id ? PICKUP : id === OTHER.id ? OTHER : ZONES.find((z) => z.id === id) || null

// Precio efectivo de una zona: el del panel si lo hay, si no el del código.
export const zonePrice = (z, cfg) => {
  const o = cfg?.zones?.[z?.id]?.price
  return typeof o === 'number' ? o : z?.price
}

export const formatZonePrice = (z) =>
  !z ? '' : z.price == null ? 'A coordinar' : z.price === 0 ? 'Sin cargo' : '$' + z.price.toLocaleString('es-AR')

// ─── ¿En qué zona queda "calle X y calle Y"? ────────────────────────────
// La Plata tiene dos numeraciones que se cruzan en ángulo recto:
//   A  1 a 31 (casco) · 115 a 131 pasando la Av. 1 · 132 en adelante pasando la Av. 31
//   B  32 a 99 (Av. 32 a Av. 72 en el casco) · 485 a 532 al NO · 600 en adelante al SE
// Cada número se pasa a su lugar sobre el eje (NE→SO para A, NO→SE para B) para
// poder preguntar si cae entre los dos bordes de un rectángulo.
const familiaDe = (n) => {
  if ((n >= 1 && n <= 31) || (n >= 115 && n <= 210)) return 'A'
  if ((n >= 32 && n <= 99) || (n >= 485 && n <= 532) || (n >= 600 && n <= 680)) return 'B'
  return null
}
const posA = (n) => (n >= 115 ? (n <= 131 ? -(n - 114) : 31 + (n - 131)) : n)
const posB = (n) => (n >= 485 ? n - 500 : n)
const entre = (x, p, q) => x >= Math.min(p, q) && x <= Math.max(p, q)

// Devuelve { zona, a, b } | { fuera: true } | { error: 'numero' | 'misma' }.
// En el borde entre dos zonas gana la más barata (la calle del límite es de la de adentro).
export function zonaDeCalles(x, y) {
  const fx = familiaDe(x)
  const fy = familiaDe(y)
  if (!fx || !fy) return { error: 'numero' }
  if (fx === fy) return { error: 'misma' }
  const [a, b] = fx === 'A' ? [x, y] : [y, x]
  const pa = posA(a)
  const pb = posB(b)
  const hits = SECTORES.filter(
    (s) => entre(pa, posA(s.a[0]), posA(s.a[1])) && entre(pb, posB(s.b[0]), posB(s.b[1])),
  )
  if (!hits.length) return { fuera: true, a, b }
  const mejor = hits.reduce((m, h) => (h.zona < m.zona ? h : m))
  return { zona: ZONES[mejor.zona - 1], a, b }
}
