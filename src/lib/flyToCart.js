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
  duration: 700,                    // ms del vuelo
  landAt: 0.8,                      // % del vuelo en que aterriza (sube el contador)
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
    borderRadius: '18px',
    objectFit: 'cover',
    opacity: '1',
    zIndex: '9999',          // por encima del nav sticky
    pointerEvents: 'none',
    willChange: 'transform, opacity',
    boxShadow: '0 18px 40px -12px rgba(0,0,0,0.65)',
  })
  document.body.appendChild(flyer)

  // Delta entre los centros de origen y destino, medido recién ahora.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  // Altura del arco: proporcional a la distancia pero con tope, así un recorrido
  // largo (card abajo + carrito arriba) no dispara un arco desmedido.
  const lift = -Math.max(50, Math.min(Math.abs(dy) * 0.35, 180))

  // El arco lo da el keyframe del medio (desplazado hacia arriba por lift) y el
  // ritmo un ease-in-out suave: arranca, sube en curva y entra al carrito
  // desacelerando. Un easing muy cargado a un lado deja la foto trabada.
  const anim = flyer.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) scale(0.55)`,
        opacity: 0.95,
        offset: 0.5,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.4, offset: 1 },
    ],
    { duration: CONFIG.duration, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'forwards' },
  )

  let landed = false
  let cleaned = false
  let safety = 0
  const land = () => { if (!landed) { landed = true; onLand?.() } }
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
