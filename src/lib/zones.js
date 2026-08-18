import { ADDRESS } from './schedule'

// ─── Zonas de envío ──────────────────────────────────────────────────────
// ⚠️ VALORES DE EJEMPLO — a ojo, para mostrar cómo queda. Joaco pasa los reales.
//
// Cada zona es un anillo de distancia alrededor del local (en cuadras de ~100m).
// Para cambiar precios: tocá `price`. Para cambiar tamaño: `blocks`.
// Si más adelante querés zonas con forma real (no círculos), se reemplaza
// `blocks` por una lista de coordenadas y el mapa las dibuja igual.

export const PICKUP = { id: 'retiro', name: 'Retiro en el local', price: 0 }

export const ZONES = [
  {
    id: 'cerca',
    name: 'Zona 1 · Cerca',
    price: 800,
    blocks: 10,               // ~1 km a la redonda
    color: '#4ADE80',
    hint: 'Hasta 10 cuadras del local',
    areas: ['Altos de San Lorenzo', 'Barrio Jardín', 'Villa Elvira (parte)'],
  },
  {
    id: 'media',
    name: 'Zona 2 · Media',
    price: 1200,
    blocks: 20,               // ~2 km
    color: '#F0C832',
    hint: 'Entre 10 y 20 cuadras',
    areas: ['Los Hornos', 'San Carlos', 'Villa Elvira'],
  },
  {
    id: 'lejos',
    name: 'Zona 3 · Lejos',
    price: 1800,
    blocks: 35,               // ~3.5 km
    color: '#FB923C',
    hint: 'Entre 20 y 35 cuadras',
    areas: ['Casco urbano', 'Tolosa', 'Ringuelet'],
  },
]

export const LOCAL = { lat: ADDRESS.lat, lng: ADDRESS.lng }

// 1 cuadra de La Plata ≈ 100 m
export const blocksToMeters = (b) => b * 100

export const findZone = (id) =>
  id === PICKUP.id ? PICKUP : ZONES.find((z) => z.id === id) || null

export const formatZonePrice = (z) =>
  !z ? '' : z.price === 0 ? 'Sin cargo' : '$' + z.price.toLocaleString('es-AR')
