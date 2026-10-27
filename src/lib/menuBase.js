// ─── Carta de burgers (datos, sin fotos) ─────────────────────────────────
// Un solo precio por tamaño (el de transferencia). El panel puede pisar
// precios, descripción y 'sin stock' sin tocar este archivo.
// Las fotos están en menu.js: el panel importa este archivo para no cargarlas.

export const BURGERS_BASE = [
  {
    id: 5,
    name: 'CURRI WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, bacon y salsa barbacoa.',
    tag: 'Smash Burger',

    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 1,
    name: 'OBRERA',
    description: 'Pan de papa, medallón de carne, queso Tybo, cebolla, lechuga, tomate y salsa Big White.',
    tag: 'La Clásica',

    prices: { simple: 12500, doble: 14000, triple: 15500 },
  },
  {
    id: 4,
    name: 'LA CHEESE JOA',
    description: 'Pan de papa, medallón de carne, queso cheddar y salsa Big White.',
    tag: 'La Bestia',

    prices: { simple: 12000, doble: 13000, triple: 15000 },
  },
  {
    id: 3,
    name: 'BIG WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, pepinillos y salsa Big White.',
    tag: 'La Contundente',

    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 2,
    name: 'OKLAHOMA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, cebolla smash, bacon y salsa Big White.',
    tag: 'La Más Pedida',

    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 6,
    name: 'LA JOA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, bacon, cebolla crispy y salsa Big White.',
    tag: 'Edición Joa',

    prices: { simple: 13500, doble: 15000, triple: 16000 },
  },
]
