import { useEffect, useState } from 'react'

// ─── Configuración editable desde el panel ───────────────────────────────
// Vive en public/config.json, dentro del repo. El panel la reescribe con la
// API de GitHub; el sitio la lee al cargar. No hay base de datos.
//
// Todo lo que no esté en el archivo cae en el valor por defecto del código,
// así que si el fetch falla el sitio sigue funcionando igual que siempre.

export const DEFAULT_CONFIG = {
  version: 1,
  updatedAt: null,
  updatedBy: null,
  burgers: {},   // { [id]: { soldOut, prices, cash, description } }
  today: {
    date: null,        // 'AAAA-MM-DD' — la excepción vale solo para ese día
    closed: false,     // cerrado excepcional
    opensAt: null,     // 'HH:MM' para abrir distinto hoy
    closesAt: null,    // 'HH:MM' para cerrar distinto hoy
    deliveryOff: false, // hoy solo retiro
    note: '',          // aviso libre que se muestra en el sitio
  },
  zones: {},     // { [id]: { price } }
  ticker: '',    // texto del cartel de arriba (vacío = el de siempre)
  stock: {},     // { 'extra:bacon': true, 'flavor:sprite': true, 'drink:coca:lata': true } = sin stock
  prices: {},    // { 'extra:bacon': 900, 'drink:coca:lata': 2800 } = precio pisado
  // Promos que se arman desde el panel (pestaña "Promos"). Sin promos = sin promo.
  // Cada una guarda solo campos estructurados (el texto que ve el cliente se arma
  // solo, ver src/lib/promos.js):
  //   { id, enabled, title?, kind: 'simplesBundle', bundlePrice, date | weekdays }
  //   { id, enabled, title?, kind: 'itemPrice', itemName, itemSize, specialPrice, date | weekdays }
  // `date` = 'AAAA-MM-DD' (vale solo ese día); `weekdays` = [0-6] (0 = domingo, se repite cada semana).
  promos: [],
}

let cache = DEFAULT_CONFIG
const escuchas = new Set()

export const getConfig = () => cache

let firma = ''

function aplicar(cfg) {
  const nueva = { ...DEFAULT_CONFIG, ...cfg, today: { ...DEFAULT_CONFIG.today, ...(cfg?.today || {}) } }
  // Si la config no cambió (lo normal en un refresco) no se avisa a nadie: ningún
  // componente se vuelve a dibujar de más ni se mueve nada en pantalla.
  const f = JSON.stringify(nueva)
  if (f === firma) return
  firma = f
  cache = nueva
  escuchas.forEach((fn) => fn(cache))
}

// La excepción de horario solo vale el día para el que se guardó.
export function todayOverride(cfg = cache, now = new Date()) {
  const t = cfg?.today
  if (!t || !t.date) return null
  const p = (n) => String(n).padStart(2, '0')
  const hoy = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
  return t.date === hoy ? t : null
}

// Cuándo se leyó por última vez la config del servidor (para refrescarla sin recargar)
let ultimaCarga = 0

const esConfig = (d) => !!d && typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length > 0

// `soloServidor`: para los refrescos. Si el servidor no contesta no se vuelve al
// archivo del sitio (puede ser más viejo que lo que ya tenemos y borraría una promo
// recién cargada): se deja lo que hay.
export async function loadConfig({ soloServidor = false } = {}) {
  // 1) La del servidor: se actualiza al instante cuando se guarda en el panel
  try {
    const r = await fetch('/api/panel?action=public-config', { cache: 'no-store' })
    if (r.ok) {
      const data = await r.json()
      if (esConfig(data)) {
        aplicar(data)
        ultimaCarga = Date.now()
        return cache
      }
    }
  } catch {
    /* sin función: seguimos con el archivo */
  }
  if (soloServidor) return cache
  // 2) El archivo que viene con el sitio
  try {
    const url = `${import.meta.env?.BASE_URL ?? '/'}config.json?t=${Date.now()}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return cache
    const data = await r.json()
    if (esConfig(data)) {
      aplicar(data)
      ultimaCarga = Date.now()
    }
  } catch {
    /* sin config: quedan los valores del código */
  }
  return cache
}

// ─── Refresco con la página abierta ──────────────────────────────────────
// La config se lee al abrir el sitio. Si Joaco apaga una promo (o cambia un precio)
// mientras alguien tiene la página abierta, esa persona seguiría viendo —y pidiendo
// por WhatsApp— lo viejo. Por eso se vuelve a leer cuando la pestaña vuelve a estar a
// la vista (después de un rato) y cada tanto mientras está abierta. El carrito usa
// siempre lo que se ve en pantalla: lo que muestra, lo que manda por WhatsApp y lo
// que registra son los mismos números de ese momento.
export const REFRESCO_MS = 2 * 60_000
let refrescando = null

export function refrescarSiHaceFalta(ahora = Date.now()) {
  if (refrescando || ahora - ultimaCarga < REFRESCO_MS) return refrescando
  try {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null
  } catch { /* sin document */ }
  refrescando = loadConfig({ soloServidor: true })
    .catch(() => cache)
    .finally(() => { refrescando = null })
  return refrescando
}

let refrescoInstalado = false
function instalarRefresco() {
  if (refrescoInstalado || typeof window === 'undefined') return
  refrescoInstalado = true
  const hacer = () => refrescarSiHaceFalta()
  document.addEventListener('visibilitychange', hacer)
  window.addEventListener('focus', hacer)
  setInterval(hacer, 60_000)
}

// Hook para los componentes. Dispara la carga una sola vez.
let cargando = null
export function useConfig() {
  const [cfg, setCfg] = useState(cache)
  useEffect(() => {
    escuchas.add(setCfg)
    if (!cargando) cargando = loadConfig()
    cargando.then(setCfg)
    instalarRefresco()
    return () => escuchas.delete(setCfg)
  }, [])
  return cfg
}
