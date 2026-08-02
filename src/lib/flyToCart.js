// Efecto "fly to cart": al agregar, una copia de la foto viaja en arco hasta el
// carrito del navbar y el contador sube +1 con un pop al aterrizar.
//
// Todo se mide en vivo con getBoundingClientRect() — nunca coordenadas fijas —
// así que funciona igual en mobile, desktop, scrolleado y con el carrito donde sea.
// El clon vuela en position:fixed sobre document.body (por encima del nav sticky)
// y se anima solo con transform/opacity (GPU).

const CONFIG = {
  // Selectores del markup que YA existe:
  cart:  '[aria-label="Carrito"]',  // botones del carrito (navbar desktop + mobile)
  badge: '[data-cart-badge]',       // contador dentro de ese botón
  duration: 750,                    // ms del vuelo
  landAt: 0.8,                      // % del vuelo en que aterriza (sube el contador)
  spin: 380,                        // grados de voltereta en el aire
  volume: 0.09,                     // volumen del sonido (0 = mudo)
}

// Recorta la foto en redondo y difumina el borde: como las fotos son sobre fondo
// negro de estudio y el sitio es oscuro, el fondo se disuelve y queda la burger
// "flotando". (Para un recorte perfecto harían falta PNG con transparencia.)
const CUTOUT_MASK =
  'radial-gradient(circle closest-side, #000 60%, rgba(0,0,0,0.45) 80%, transparent 100%)'

// ─── Sonido (Web Audio, sin archivos externos) ───────────────────────────
// Se genera en el momento: un whoosh al despegar y un pop al entrar al carrito.
// Se puede apagar con ?sound=off en la URL.
let audio = null

function audioCtx() {
  try {
    if (new URLSearchParams(window.location.search).get('sound') === 'off') return null
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!audio) audio = new AC()
    if (audio.state === 'suspended') audio.resume()
    return audio
  } catch {
    return null
  }
}

// Ruido filtrado que barre hacia arriba: el "fshhh" del despegue.
function playWhoosh() {
  const ctx = audioCtx()
  if (!ctx) return
  const dur = 0.28
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(500, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + dur)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(CONFIG.volume * 0.55, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start()
  src.stop(ctx.currentTime + dur)
}

// Blip corto que sube de tono: el "plop" de que entró al carrito.
function playPop() {
  const ctx = audioCtx()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(420, t)
  osc.frequency.exponentialRampToValueAtTime(1180, t + 0.09)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(CONFIG.volume, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.19)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.2)
}

// Por defecto se respeta el "reducir movimiento" del sistema. Con ?fly=1 en la URL
// se fuerza el vuelo igual (útil para verlo en una máquina que tiene las
// animaciones de Windows apagadas); con ?fly=off se apaga a mano.
function flyOverride() {
  try {
    return new URLSearchParams(window.location.search).get('fly')
  } catch {
    return null
  }
}

const prefersReduced = () => {
  const forced = flyOverride()
  if (forced === '1' || forced === 'force') return false
  if (forced === 'off') return true
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// De los carritos que hay en el DOM (desktop / mobile), devuelve el que está
// realmente visible: Tailwind oculta uno con hidden/md:hidden → offsetParent null.
function visibleCart() {
  const candidates = Array.from(document.querySelectorAll(CONFIG.cart))
  return (
    candidates.find((el) => {
      if (el.offsetParent === null) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0
    }) || null
  )
}

// Pop del contador. No toca el texto: ese lo pinta React desde el carrito.
// fill:'none' → al terminar devuelve el control a framer-motion (sin pisar estilos).
export function popCartBadge() {
  const badge = visibleCart()?.querySelector(CONFIG.badge)
  if (!badge || prefersReduced() || typeof badge.animate !== 'function') return
  badge.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }],
    { duration: 300, easing: 'ease-out' },
  )
}

// Vuela una copia de sourceEl (o de la <img> que tenga adentro) hasta el carrito.
// onLand se llama al aterrizar (~80% del vuelo) — ahí es donde suma al carrito.
// Si no hay animación posible (reduced-motion, sin carrito visible, sin soporte),
// llama a onLand igual: el pedido nunca se pierde por culpa del efecto.
export function flyToCart(sourceEl, onLand) {
  const source = sourceEl?.querySelector?.('img') || sourceEl
  const cartEl = source ? visibleCart() : null

  if (!source || !cartEl || prefersReduced() || typeof source.animate !== 'function') {
    onLand?.()
    return
  }

  const from = source.getBoundingClientRect()
  const to = cartEl.getBoundingClientRect()
  if (!from.width || !to.width) { onLand?.(); return }

  const flyer = source.cloneNode(true)
  flyer.removeAttribute('loading')
  flyer.setAttribute('aria-hidden', 'true')
  Object.assign(flyer.style, {
    position: 'fixed',
    left: from.left + 'px',
    top: from.top + 'px',
    right: 'auto',           // la card usa inset-0; lo neutralizamos
    bottom: 'auto',
    width: from.width + 'px',
    height: from.height + 'px',
    margin: '0',
    objectFit: 'cover',
    opacity: '1',
    zIndex: '9999',          // por encima del nav sticky
    pointerEvents: 'none',
    willChange: 'transform, opacity',
    // Recorte redondo con borde difuminado: se va el fondo negro de la foto
    WebkitMaskImage: CUTOUT_MASK,
    maskImage: CUTOUT_MASK,
  })
  document.body.appendChild(flyer)

  // Delta entre los centros de origen y destino, medido recién ahora.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  // Altura del arco: proporcional a la distancia pero con tope, así un recorrido
  // largo (card abajo + carrito arriba) no dispara un arco desmedido.
  const lift = -Math.max(50, Math.min(Math.abs(dy) * 0.35, 180))

  // La voltereta gira hacia el lado del vuelo (como algo que rueda hacia allá).
  const spin = (dx >= 0 ? 1 : -1) * CONFIG.spin

  // El arco lo da el keyframe del medio (desplazado hacia arriba por lift) y el
  // ritmo un ease-in-out suave: arranca, sube en curva y entra al carrito
  // desacelerando. Un easing muy cargado a un lado deja la foto trabada.
  const anim = flyer.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) scale(0.55) rotate(${spin * 0.5}deg)`,
        opacity: 0.95,
        offset: 0.5,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(${spin}deg)`,
        opacity: 0.4,
        offset: 1,
      },
    ],
    { duration: CONFIG.duration, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'forwards' },
  )

  playWhoosh()

  let landed = false
  let cleaned = false
  let safety = 0
  const land = () => { if (!landed) { landed = true; playPop(); onLand?.() } }
  const timer = setTimeout(land, CONFIG.duration * CONFIG.landAt)

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    clearTimeout(timer)
    clearTimeout(safety)
    land()                 // si se cortó antes de aterrizar, el ítem se suma igual
    flyer.remove()
  }
  // Red de seguridad: si la pestaña pasa a segundo plano el reloj de animación se
  // congela y onfinish no dispara nunca — sin esto el clon quedaría en el DOM.
  safety = setTimeout(cleanup, CONFIG.duration + 400)
  anim.onfinish = cleanup
  anim.oncancel = cleanup
}
