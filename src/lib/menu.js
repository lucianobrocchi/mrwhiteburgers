// ─── Carta de burgers ─────────────────────────────────────────────────────
// Un solo precio por tamaño (el de transferencia). El panel puede pisar
// precios, descripción y 'sin stock' sin tocar este archivo.

import imgObreraNegro    from '../assets/burgers/obrera_negro.jpeg'
import imgObreraPapel    from '../assets/burgers/obrera_papel.jpeg'
import imgOklahomaNegro  from '../assets/burgers/oklahoma_negro.jpeg'
import imgOklahomaPapel  from '../assets/burgers/oklahoma_papel.jpeg'
import imgBigWhiteNegro  from '../assets/burgers/big_white_negro.jpeg'
import imgBigWhitePapel  from '../assets/burgers/big_white_papel.jpeg'
import imgChesseJoaNegro from '../assets/burgers/chesse_joa_negro.jpeg'
import imgChesseJoaPapel from '../assets/burgers/chesse_joa_papel.jpeg'
import imgCurryNegro     from '../assets/burgers/curri_white_negro.jpeg'
import imgCurryPapel     from '../assets/burgers/curri_white_papel.jpeg'
import imgJoaWhiteNegro  from '../assets/burgers/joa_white_negro.jpeg'
import imgJoaWhitePapel  from '../assets/burgers/joa_white_papel.jpeg'

// Menú base. El panel puede pisar precios, descripción y "sin stock".
// Un solo precio por tamaño (el de transferencia).
export const BURGERS = [
  {
    id: 5,
    name: 'CURRI WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, bacon y salsa barbacoa.',
    tag: 'Smash Burger',
    image: imgCurryNegro,
    imageAlt: imgCurryPapel,
    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 1,
    name: 'OBRERA',
    description: 'Pan de papa, medallón de carne, queso Tybo, cebolla, lechuga, tomate y salsa Big White.',
    tag: 'La Clásica',
    image: imgObreraNegro,
    imageAlt: imgObreraPapel,
    prices: { simple: 12500, doble: 14000, triple: 15500 },
  },
  {
    id: 4,
    name: 'LA CHEESE JOA',
    description: 'Pan de papa, medallón de carne, queso cheddar y salsa Big White.',
    tag: 'La Bestia',
    image: imgChesseJoaNegro,
    imageAlt: imgChesseJoaPapel,
    prices: { simple: 12000, doble: 13000, triple: 15000 },
  },
  {
    id: 3,
    name: 'BIG WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, pepinillos y salsa Big White.',
    tag: 'La Contundente',
    image: imgBigWhiteNegro,
    imageAlt: imgBigWhitePapel,
    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 2,
    name: 'OKLAHOMA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, cebolla smash, bacon y salsa Big White.',
    tag: 'La Más Pedida',
    image: imgOklahomaNegro,
    imageAlt: imgOklahomaPapel,
    prices: { simple: 13500, doble: 15000, triple: 16500 },
  },
  {
    id: 6,
    name: 'LA JOA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, bacon, cebolla crispy y salsa Big White.',
    tag: 'Edición Joa',
    image: imgJoaWhiteNegro,
    imageAlt: imgJoaWhitePapel,
    prices: { simple: 13500, doble: 15000, triple: 16000 },
  },
]
