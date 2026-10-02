// ─── Bebidas y extras ────────────────────────────────────────────────────
// Los precios de acá son los de la carta. Desde el panel se pueden pisar
// (config.prices) y marcar sin stock (config.stock) sin tocar el código.
//
// Claves que usa el panel para stock y precios:
//   extra:<id>                    → un extra
//   drink:<idBebida>:<idTamaño>   → un tamaño de una bebida
//   flavor:<idSabor>              → un sabor (ej. Sprite agotada)

export const EXTRAS = [
  { id: 'medallon', name: 'Medallón 110 gr', desc: 'Asado',     price: 1600 },
  { id: 'cheddar',  name: 'Cheddar',         desc: '2 fetas',   price: 1000 },
  { id: 'bacon',    name: 'Bacon',           desc: '',          price: 800  },
]

export const MAX_PER_EXTRA = 3

export const DRINKS = [
  {
    id: 'coca',
    name: 'Coca-Cola / Sprite',
    blurb: 'Elegí tu sabor',
    icon: 'soda',
    tint: '#E5252F',
    flavors: [
      { id: 'coca',   label: 'Coca-Cola', tint: '#E5252F' },
      { id: 'sprite', label: 'Sprite',    tint: '#2BB24C' },
    ],
    sizes: [
      { id: '225',  label: '2,25 L', price: 6000 },
      { id: '15',   label: '1,5 L',  price: 5000 },
      { id: 'lata', label: 'Lata',   price: 2500 },
    ],
  },
  {
    id: 'aquarius',
    name: 'Aquarius',
    blurb: 'Agua saborizada',
    icon: 'water',
    tint: '#4DA3F7',
    sizes: [
      { id: '225', label: '2,25 L', price: 4000 },
      { id: '15',  label: '1,5 L',  price: 3500 },
    ],
  },
  {
    id: 'goyeneche',
    name: 'Goyeneche',
    blurb: '',
    icon: 'drops',
    tint: '#35C2A4',
    sizes: [
      { id: 'medio', label: '1/2 L', price: 4000 },
    ],
  },
]

// ─── Lectura de la config del panel ──────────────────────────────────────
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export const isOut = (key, cfg) => !!cfg?.stock?.[key]

export const extraKey = (e) => `extra:${e.id}`
export const drinkKey = (d, s) => `drink:${d.id}:${s.id}`
export const flavorKey = (f) => `flavor:${f.id}`

export const extraPrice = (e, cfg) => num(cfg?.prices?.[extraKey(e)]) ?? e.price
export const drinkPrice = (d, s, cfg) => num(cfg?.prices?.[drinkKey(d, s)]) ?? s.price

export const extraOut = (e, cfg) => isOut(extraKey(e), cfg)
export const sizeOut = (d, s, cfg) => isOut(drinkKey(d, s), cfg)
export const flavorOut = (f, cfg) => isOut(flavorKey(f), cfg)

// ─── Helpers de extras elegidos ──────────────────────────────────────────
// `picked` es un objeto { [idExtra]: cantidad }. Devuelve la lista resuelta con
// el precio vigente, ignorando lo que esté sin stock o en cero.
export function resolveExtras(picked, cfg) {
  return EXTRAS
    .map((e) => ({ id: e.id, name: e.name, price: extraPrice(e, cfg), qty: picked?.[e.id] || 0 }))
    .filter((e) => e.qty > 0 && !extraOut(EXTRAS.find((x) => x.id === e.id), cfg))
}

export const extrasTotal = (list) => list.reduce((s, e) => s + e.price * e.qty, 0)

// "Bacon + 2 Cheddar" para mostrar en una línea
export const extrasLabel = (list) =>
  list.map((e) => (e.qty > 1 ? `${e.qty} ${e.name}` : e.name)).join(' + ')
