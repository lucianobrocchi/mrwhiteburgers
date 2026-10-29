// ─── Recorrido de la web ─────────────────────────────────────────────────
// Dos destinos: Google Analytics 4 (sin cookies de publicidad ni datos
// personales; no carga en localhost) y los contadores propios del panel
// (/api/panel?action=event). Los toques se juntan y salen en un solo envío
// cuando la persona se va, así casi no se usa el almacenamiento.
const GA_ID = 'G-6575KBW83F'
const CLARITY_ID = 'z424kzquun'
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
// Los contadores propios gastan almacenamiento de Vercel Blob (cada visita = una escritura).
// Pausados para no pasarse del límite gratis; el recorrido se ve en Google Analytics.
// Con true vuelven a anotarse en el panel (Números → Recorrido de la web).
const EVENTOS_PROPIOS = false

export function registrar(nombre, detalle) {
  if (!activo || !EVENTOS_PROPIOS) return
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

// Los scripts de medición (GA4 y Clarity) pesan y frenan la página: se bajan cuando ya cargó
// todo lo importante, o apenas la persona toca o mueve algo, lo que pase primero. Los eventos
// que ocurran antes quedan en cola (dataLayer / clarity.q) y se mandan en cuanto cargan.
function cargarScript(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}
function cuandoSePueda(fn) {
  let hecho = false
  const ir = () => {
    if (hecho) return
    hecho = true
    fn()
  }
  const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart']
  eventos.forEach((e) => window.addEventListener(e, ir, { once: true, passive: true }))
  const alCargar = () => (window.requestIdleCallback ? window.requestIdleCallback(ir, { timeout: 4000 }) : window.setTimeout(ir, 3000))
  if (document.readyState === 'complete') alCargar()
  else window.addEventListener('load', alCargar, { once: true })
}

// ¿Es una persona de la zona y no un robot? GA4 ya descarta los robots conocidos, pero no los navegadores
// automáticos de centros de datos (EE. UU., Europa) que inflaban las visitas. Este negocio reparte en La Plata:
// solo se mide a quien tiene huso horario de Sudamérica y no es un navegador automático.
const HUSOS_OK = /^America\/(Argentina\/|Buenos_Aires|Montevideo|Santiago|Asuncion|Sao_Paulo|La_Paz|Lima|Bogota|Guayaquil|Caracas)/
const ROBOTS = /bot|crawl|spider|slurp|headless|lighthouse|gtmetrix|pagespeed|pingdom|preview|facebookexternalhit|python|curl|wget|node-fetch/i
export function visitaReal({ ua = '', tz = '', webdriver = false } = {}) {
  if (webdriver || ROBOTS.test(ua)) return false
  if (tz && !HUSOS_OK.test(tz)) return false
  return true
}

export function iniciarTracking() {
  if (typeof window === 'undefined' || activo) return
  activo = true
  hito('visita')
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') volcar() })
  window.addEventListener('pagehide', volcar)

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  let tz = ''
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* sin Intl: se mide igual */ }
  if (!visitaReal({ ua: navigator.userAgent, tz, webdriver: navigator.webdriver === true })) return
  gaListo = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  cuandoSePueda(() => cargarScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`))

  // Microsoft Clarity: mapas de calor y grabaciones (oculta por defecto lo que se escribe en los campos)
  window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments) }
  cuandoSePueda(() => cargarScript(`https://www.clarity.ms/tag/${CLARITY_ID}`))
}

// Marca en Clarity los momentos clave para poder filtrar las grabaciones ("los que pidieron")
function clarityEvento(nombre) {
  try {
    if (gaListo && window.clarity) window.clarity('event', nombre)
  } catch {
    /* Clarity no disponible */
  }
}

function ga(nombre, datos) {
  try {
    if (gaListo && window.gtag) window.gtag('event', nombre, datos)
  } catch {
    /* GA no disponible */
  }
}

// ─── Comercio electrónico de GA4 ─────────────────────────────────────────
// Recorrido estándar que GA4 entiende (sirve para informes y para anuncios):
// view_item_list → add_to_cart → view_cart → begin_checkout → add_shipping_info → purchase.
// "purchase" se manda cuando toca "Pedir por WhatsApp": es el pedido enviado, no
// confirma que se haya cobrado (eso pasa en el chat).
const gaItem = (i) => ({
  item_id: `${i.kind || 'burger'}-${i.id}`,
  item_name: i.name,
  item_category: i.kind === 'drink' ? 'bebida' : 'burger',
  item_variant: i.sizeLabel,
  price: Math.round(i.price),
  quantity: i.qty,
})
const valorDe = (items) => items.reduce((s, i) => s + i.price * i.qty, 0)

// Lo último que se ve en el carrito (lo actualiza CartContext), para los eventos que
// se disparan desde callbacks sueltos
let ultimo = { items: [], total: 0 }
export const recordarCarrito = (items, total) => { ultimo = { items, total } }

export const gaVioMenu = () => ga('view_item_list', { item_list_id: 'menu', item_list_name: 'Menú' })
export const gaAgrego = (item) => {
  clarityEvento('agrego_al_carrito')
  ga('add_to_cart', { currency: 'ARS', value: Math.round(item.price * item.qty), items: [gaItem(item)] })
}
export const gaSaco = (item) =>
  ga('remove_from_cart', { currency: 'ARS', value: Math.round(item.price * item.qty), items: [gaItem(item)] })
export const gaVioCarrito = () => {
  const items = ultimo.items
  if (!items.length) return
  const base = { currency: 'ARS', value: Math.round(valorDe(items)), items: items.map(gaItem) }
  ga('view_cart', base)
  ga('begin_checkout', base)
}
export const gaEligioZona = (zona) =>
  ga('add_shipping_info', { currency: 'ARS', value: Math.round(ultimo.total), shipping_tier: zona, items: ultimo.items.map(gaItem) })

// Tocó "Dejar reseña" en la pantalla de pedido enviado
export const gaResena = () => ga('click_resena', { origen: 'pedido_enviado' })

// Tocó "Pedir por WhatsApp": es lo más parecido a una venta que vemos desde el sitio
export const trackPedido = ({ id, items, total, shipping, promo }) => {
  ga('purchase', {
    transaction_id: id,
    currency: 'ARS',
    value: Math.round(total),
    shipping: Math.round(shipping || 0),
    coupon: promo || undefined,
    affiliation: 'WhatsApp',
    items: items.map(gaItem),
  })
  clarityEvento('pedido_whatsapp')
  registrar('pedido')
  hito('pedido')
  volcar()
}
