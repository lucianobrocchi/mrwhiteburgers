import { track } from '@vercel/analytics'

// ─── Recorrido de la web ─────────────────────────────────────────────────
// Dos destinos: Google Analytics 4 (sin cookies de publicidad ni datos
// personales; no carga en localhost) y los contadores propios del panel
// (/api/panel?action=event). Los toques se juntan y salen en un solo envío
// cuando la persona se va, así casi no se usa el almacenamiento.
const GA_ID = 'G-6575KBW83F'
let gaListo = false
let activo = false
const buf = {}
let timer = null
const ENVIO = '/api/panel?action=event'

function volcar() {
  const claves = Object.keys(buf)
  if (!claves.length) return
  const body = JSON.stringify({ e: { ...buf } })
  claves.forEach((k) => delete buf[k])
  try {
    if (navigator.sendBeacon?.(ENVIO, new Blob([body], { type: 'application/json' }))) return
    fetch(ENVIO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    /* sin red: se pierde ese lote */
  }
}

// registrar('agrego_burger', 'OBRERA') suma 1 a "agrego_burger:OBRERA" en el día de hoy
export function registrar(nombre, detalle) {
  if (!activo) return
  const k = detalle ? `${nombre}:${String(detalle).slice(0, 36)}` : nombre
  buf[k] = (buf[k] || 0) + 1
  clearTimeout(timer)
  timer = setTimeout(volcar, 20000)
}

// Hito de la visita: cuenta una sola vez por visita (para armar el embudo)
export function hito(nombre) {
  try {
    const key = `mw_h_${nombre}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch { /* sin sessionStorage: cuenta igual */ }
  registrar(`s:${nombre}`)
}

export function iniciarTracking() {
  if (typeof window === 'undefined' || activo) return
  activo = true
  hito('visita')
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') volcar() })
  window.addEventListener('pagehide', volcar)

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  gaListo = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
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
  registrar('pedido')
  hito('pedido')
  volcar()
}
