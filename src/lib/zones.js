// ─── Zonas de envío ──────────────────────────────────────────────────────
// Cada zona es el rectángulo real de la grilla de La Plata: sus esquinas son
// cruces de calles medidos sobre OpenStreetMap, así que el dibujo del mapa
// coincide con las calles de verdad.
//
// Para agregar una zona nueva hacen falta las 4 esquinas (calle x calle).
// Para cambiar un precio alcanza con tocar `price`.

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

export const ZONES = [
  {
    id: 'z1',
    name: 'Zona 1',
    price: 2000,
    color: '#4ADE80',
    bounds: 'De 22 a 31 · de 72 a 80',
    // 31y80 → 22y80 → 22y72 → 31y72
    polygon: [
      [-34.959602, -57.944318],
      [-34.951252, -57.935049],
      [-34.945357, -57.943190],
      [-34.953869, -57.951956],
    ],
  },
  {
    id: 'z2',
    name: 'Zona 2',
    price: 4000,
    color: '#F0C832',
    bounds: 'De 13 a 22 · de 72 a 80',
    // 22y80 → 13y80 → 13y72 → 22y72
    polygon: [
      [-34.951252, -57.935049],
      [-34.942819, -57.925812],
      [-34.936862, -57.933808],
      [-34.945357, -57.943190],
    ],
  },
  {
    id: 'z3',
    name: 'Zona 3',
    price: 5000,
    color: '#38BDF8',
    bounds: 'De 7 a 13 · de 72 a 80',
    // 13y80 → 7y80 → 7y72 → 13y72
    polygon: [
      [-34.942819, -57.925812],
      [-34.937173, -57.919777],
      [-34.931311, -57.927702],
      [-34.936862, -57.933808],
    ],
  },
  {
    id: 'z4',
    name: 'Zona 4',
    price: 5000,
    color: '#F472B6',
    bounds: 'De 13 a 31 · de 60 a 72',
    // 31y72 → 13y72 → 13y60 → 31y60
    polygon: [
      [-34.953869, -57.951956],
      [-34.936862, -57.933808],
      [-34.928069, -57.945696],
      [-34.945076, -57.963844],
    ],
  },
]

export const findZone = (id) =>
  id === PICKUP.id ? PICKUP : id === OTHER.id ? OTHER : ZONES.find((z) => z.id === id) || null

export const formatZonePrice = (z) =>
  !z ? '' : z.price == null ? 'A coordinar' : z.price === 0 ? 'Sin cargo' : '$' + z.price.toLocaleString('es-AR')
