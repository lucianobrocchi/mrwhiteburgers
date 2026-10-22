import { track } from '@vercel/analytics'

// ─── Google Analytics 4 ──────────────────────────────────────────────────
// Sin cookies de publicidad ni datos personales. No se carga en localhost ni en
// el panel (así no cuentan las pruebas ni las visitas del equipo).
const GA_ID = 'G-6575KBW83F'
let gaListo = false

export function iniciarGA() {
  if (gaListo || typeof window === 'undefined') return
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  gaListo = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

function ga(nombre, datos) {
  try {
    if (gaListo && window.gtag) window.gtag('event', nombre, datos)
  } catch {
    /* GA no disponible */
  }
}

// Eventos para Vercel Analytics (los ves en su pestaña Events, por nombre).
// Si Analytics no está disponible (dev, bloqueado) no se rompe nada.
function enviar(nombre, datos) {
  try {
    track(nombre, datos)
  } catch {
    /* analytics no disponible */
  }
}

export const trackBurgerClick = (burger) => {
  enviar('burger_add', { burger: burger.name })
  ga('add_to_cart', { items: [{ item_name: burger.name, item_category: 'burger' }] })
}
export const trackDrinkClick = (nombre) => {
  enviar('drink_add', { drink: nombre })
  ga('add_to_cart', { items: [{ item_name: nombre, item_category: 'bebida' }] })
}
// Tocó "Pedir por WhatsApp": es lo más parecido a una venta que vemos desde el sitio
export const trackPedido = ({ total, zona, promo }) => {
  enviar('pedido_whatsapp', { total, zona: zona || 'sin elegir' })
  ga('begin_checkout', { currency: 'ARS', value: total, shipping_tier: zona || 'sin elegir', coupon: promo || undefined })
}
