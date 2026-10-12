// ─── Precios que tipea Joaco en el panel ─────────────────────────────────
// Módulo PURO (sin React ni window) para poder probarlo con `node --test`.
//
// Joaco escribe plata como en Argentina: "15.000" (el punto separa los miles).
// Un <input type="number"> lee eso como 15, y una promo "2 simples x $15" regalaría
// las burgers en el carrito. Por eso los campos de precio de las promos son de
// texto y lo interpretan acá.
import { money, MIN_PROMO_PRICE } from './promos.js'

//   "15000" · "15.000" · "$ 15.000" · "15 000" · "15.000,00"  → 15000
//   ""                                                          → undefined (vacío)
//   "15,5" · "15.5" · "abc" · "1.5000" · "-5"                   → NaN (no se entiende)
export function leerPrecio(texto) {
  const t = String(texto ?? '').replace(/[$\s]/g, '')
  if (t === '') return undefined
  if (/^(\d+|\d{1,3}(\.\d{3})+)(,0+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(/,.*$/, ''))
  return NaN
}

// 15000 → "15.000" (lo que se muestra en el campo cuando Joaco termina de escribir)
export const textoDePrecio = (n) => (typeof n === 'number' && Number.isFinite(n) ? money(n).slice(1) : '')

// Un precio de promo de burgers por debajo del mínimo (el mismo que exige el servidor,
// MIN_PROMO_PRICE) es casi seguro un error de tipeo: le faltan ceros.
export const muyBarato = (valor) =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0 && valor < MIN_PROMO_PRICE

// Con 2 cifras ("15") casi seguro quiso decir miles ("15.000"); con 3 ("150") no se sabe
export const mensajeMuyBarato = (valor) =>
  valor < 100
    ? `${money(valor)} es demasiado poco para una promo de burgers. ¿Quisiste escribir ${money(valor * 1000)}? ` +
      'Escribilo con todos los ceros (15000 o 15.000).'
    : `${money(valor)} es demasiado poco para una promo de burgers: ¿le faltan ceros? Una burger sale más de $10.000.`
