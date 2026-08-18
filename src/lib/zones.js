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
    blocks: 15,               // ~1,5 km a la redonda
    color: '#4ADE80',
    hint: 'Hasta 15 cuadras del local',
    areas: ['Altos de San Lorenzo', 'Barrio Jardín'],
  },
  {
    id: 'media',
    name: 'Zona 2 · Casco sur',
    price: 1200,
    blocks: 35,               // ~3,5 km — entra al casco por Av. 72
    color: '#F0C832',
    hint: 'Del local hasta el sur del casco',
    areas: ['Los Hornos', 'San Carlos', 'Villa Elvira', 'Casco hasta Av. 60'],
  },
  {
    id: 'casco',
    name: 'Zona 3 · Todo el casco',
    price: 1800,
    blocks: 60,               // ~6 km — cubre el casco urbano completo
    color: '#FB923C',
    hint: 'Casco urbano completo',
    areas: ['Centro', 'Plaza Moreno', 'Plaza Italia', 'hasta Av. 32 / Av. 122'],
  },
]

export const LOCAL = { lat: ADDRESS.lat, lng: ADDRESS.lng }

// 1 cuadra de La Plata ≈ 100 m
export const blocksToMeters = (b) => b * 100

export const findZone = (id) =>
  id === PICKUP.id ? PICKUP : ZONES.find((z) => z.id === id) || null

export const formatZonePrice = (z) =>
  !z ? '' : z.price === 0 ? 'Sin cargo' : '$' + z.price.toLocaleString('es-AR')
