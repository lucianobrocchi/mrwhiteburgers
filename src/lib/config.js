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
}

let cache = DEFAULT_CONFIG
const escuchas = new Set()

export const getConfig = () => cache

function aplicar(cfg) {
  cache = { ...DEFAULT_CONFIG, ...cfg, today: { ...DEFAULT_CONFIG.today, ...(cfg?.today || {}) } }
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

export async function loadConfig() {
  try {
    const url = `${import.meta.env.BASE_URL}config.json?t=${Date.now()}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return cache
    const data = await r.json()
    if (data && typeof data === 'object') aplicar(data)
  } catch {
    /* sin config: quedan los valores del código */
  }
  return cache
}

// Hook para los componentes. Dispara la carga una sola vez.
let cargando = null
export function useConfig() {
  const [cfg, setCfg] = useState(cache)
  useEffect(() => {
    escuchas.add(setCfg)
    if (!cargando) cargando = loadConfig()
    cargando.then(setCfg)
    return () => escuchas.delete(setCfg)
  }, [])
  return cfg
}
