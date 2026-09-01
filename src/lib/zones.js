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
]

export const findZone = (id) =>
  id === PICKUP.id ? PICKUP : id === OTHER.id ? OTHER : ZONES.find((z) => z.id === id) || null

// Precio efectivo de una zona: el del panel si lo hay, si no el del código.
export const zonePrice = (z, cfg) => {
  const o = cfg?.zones?.[z?.id]?.price
  return typeof o === 'number' ? o : z?.price
}

export const formatZonePrice = (z) =>
  !z ? '' : z.price == null ? 'A coordinar' : z.price === 0 ? 'Sin cargo' : '$' + z.price.toLocaleString('es-AR')
