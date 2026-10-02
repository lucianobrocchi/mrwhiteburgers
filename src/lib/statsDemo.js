// ─── Datos de EJEMPLO para el panel ──────────────────────────────────────
// Sirven para mostrar cómo se ve el panel cuando todavía no hay pedidos
// reales (por ejemplo, para enseñárselo al dueño). Nunca se guardan y el panel
// los marca siempre como ejemplo.
//
// Es determinístico: con la misma fecha genera siempre los mismos datos, así no
// cambian cada vez que se abre.

import { hoyART, sumarDias, diaSemanaDe, listarDias } from './statsCalc.js'

function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const elegir = (rnd, opciones) => {
  const total = opciones.reduce((s, o) => s + o[1], 0)
  let x = rnd() * total
  for (const [v, p] of opciones) { x -= p; if (x <= 0) return v }
  return opciones[opciones.length - 1][0]
}

// Pedidos por día según el día de la semana (el martes no se abre)
const BASE_POR_DIA = { 0: 10, 1: 6, 2: 0, 3: 5, 4: 7, 5: 12, 6: 15 }
const HORAS = [[19, 0.12], [20, 0.30], [21, 0.38], [22, 0.20]]
const ZONAS = [
  [{ id: 'retiro', nombre: 'Retiro en el local', envio: 0 }, 0.34],
  [{ id: 'z1', nombre: 'Zona 1', envio: 2000 }, 0.40],
  [{ id: 'z2', nombre: 'Zona 2', envio: 4000 }, 0.14],
  [{ id: 'otra', nombre: 'Otra zona', envio: 0 }, 0.12],
]
const ORIGENES = [['instagram', 0.52], ['directo', 0.24], ['facebook', 0.11], ['google', 0.07], ['whatsapp', 0.06]]
const POPULARIDAD_BURGER = {
  'OKLAHOMA WHITE': 0.26, 'CURRI WHITE': 0.20, 'OBRERA': 0.16,
  'BIG WHITE': 0.15, 'LA CHEESE JOA': 0.13, 'LA JOA WHITE': 0.10,
}
const POPULARIDAD_EXTRA = { bacon: 0.55, cheddar: 0.30, medallon: 0.15 }
const TAMANOS = [[['simple', 'Simple'], 0.27], [['doble', 'Doble'], 0.50], [['triple', 'Triple'], 0.23]]

// `catalogo` = { burgers:[{id,name,prices,peso?}], extras:[{id,name,price}], bebidas:[{drink,size,flavor?,peso}] }
export function generarDemo({ burgers, extras, bebidas, dias = 35, now = new Date() }) {
  const hoy = hoyART(now)
  const orders = []
  const rnd = prng(Number(hoy.replace(/-/g, '')))
  // Popularidad por NOMBRE (no por posición en la lista, que puede cambiar)
  const pesosBurgers = burgers.map((b) => [b, b.peso ?? POPULARIDAD_BURGER[b.name] ?? 0.1])
  const pesosExtras = extras.map((e) => [e, POPULARIDAD_EXTRA[e.id] ?? 0.2])
  const pesosBebidas = bebidas.map((b) => [b, b.peso ?? 0.2])

  const lista = listarDias(sumarDias(hoy, -(dias - 1)), hoy)
  lista.forEach((d, idx) => {
    const w = diaSemanaDe(d)
    const tendencia = 0.75 + 0.4 * (idx / Math.max(1, lista.length - 1)) // sube de a poco
    const cantidad = Math.round(BASE_POR_DIA[w] * tendencia * (0.7 + rnd() * 0.6))
    for (let n = 0; n < cantidad; n++) {
      const h = elegir(rnd, HORAS)
      const minuto = Math.floor(rnd() * 60)
      const zona = elegir(rnd, ZONAS)
      const items = []

      const lineas = elegir(rnd, [[1, 0.62], [2, 0.30], [3, 0.08]])
      for (let l = 0; l < lineas; l++) {
        const b = elegir(rnd, pesosBurgers)
        const [s, sl] = elegir(rnd, TAMANOS)
        const q = rnd() < 0.85 ? 1 : 2
        const x = []
        if (rnd() < 0.38) {
          const e = elegir(rnd, pesosExtras)
          x.push({ id: e.id, n: e.name, q: 1, p: e.price })
        }
        items.push({ k: 'b', id: String(b.id), n: b.name, s, sl, q, u: b.prices[s], x })
      }

      if (rnd() < 0.55) {
        const veces = rnd() < 0.8 ? 1 : 2
        for (let v = 0; v < veces; v++) {
          const b = elegir(rnd, pesosBebidas)
          const nombre = b.flavor ? b.flavor.label : b.drink.name
          items.push({ k: 'd', id: b.drink.id, n: nombre, s: b.size.id, sl: b.size.label, f: b.flavor?.id, q: 1, u: b.size.price, x: [] })
        }
      }

      const subtotal = items.reduce(
        (s, i) => s + i.q * (i.u + i.x.reduce((t, e) => t + e.p * e.q, 0)),
        0,
      )
      // hora local → UTC (Argentina es UTC-3)
      const at = new Date(`${d}T${String(h).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00-03:00`).toISOString()
      orders.push({
        id: `${d.replace(/-/g, '')}-demo${String(orders.length).padStart(3, '0')}`,
        at, d, h, w,
        total: subtotal + zona.envio, subtotal, discount: 0, promo: '',
        zoneId: zona.id, zone: zona.nombre,
        src: elegir(rnd, ORIGENES),
        items,
        demo: true,
      })
    }
  })

  return orders.sort((a, b) => (a.at < b.at ? 1 : -1))
}
