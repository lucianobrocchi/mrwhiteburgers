// ─── Carta de burgers ─────────────────────────────────────────────────────
// Los datos (nombres, precios, descripciones) están en menuBase.js; acá se les
// pegan las fotos para el sitio. Las fotos son archivos WebP en public/img (no van
// pegadas dentro del HTML: la página carga mucho más rápido).

import { BURGERS_BASE } from './menuBase.js'

const BASE = import.meta.env.BASE_URL

const FOTOS = {
  1: { image: `${BASE}img/obrera_negro.webp`, imageAlt: `${BASE}img/obrera_papel.webp` },
  2: { image: `${BASE}img/oklahoma_negro.webp`, imageAlt: `${BASE}img/oklahoma_papel.webp` },
  3: { image: `${BASE}img/big_white_negro.webp`, imageAlt: `${BASE}img/big_white_papel.webp` },
  4: { image: `${BASE}img/chesse_joa_negro.webp`, imageAlt: `${BASE}img/chesse_joa_papel.webp` },
  5: { image: `${BASE}img/curri_white_negro.webp`, imageAlt: `${BASE}img/curri_white_papel.webp` },
  6: { image: `${BASE}img/joa_white_negro.webp`, imageAlt: `${BASE}img/joa_white_papel.webp` },
}

export const BURGERS = BURGERS_BASE.map((b) => ({ ...b, ...FOTOS[b.id] }))
