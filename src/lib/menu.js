// ─── Carta de burgers ─────────────────────────────────────────────────────
// Los datos (nombres, precios, descripciones) están en menuBase.js; acá se les
// pegan las fotos para el sitio.

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
import { BURGERS_BASE } from './menuBase.js'

const FOTOS = {
  1: { image: imgObreraNegro, imageAlt: imgObreraPapel },
  2: { image: imgOklahomaNegro, imageAlt: imgOklahomaPapel },
  3: { image: imgBigWhiteNegro, imageAlt: imgBigWhitePapel },
  4: { image: imgChesseJoaNegro, imageAlt: imgChesseJoaPapel },
  5: { image: imgCurryNegro, imageAlt: imgCurryPapel },
  6: { image: imgJoaWhiteNegro, imageAlt: imgJoaWhitePapel },
}

export const BURGERS = BURGERS_BASE.map((b) => ({ ...b, ...FOTOS[b.id] }))
