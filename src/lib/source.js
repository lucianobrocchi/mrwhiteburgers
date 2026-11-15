// ─── De dónde llegó el cliente ───────────────────────────────────────────
// Se calcula al abrir el sitio (por ?utm_source= o por el referrer) y se recuerda 7 días,
// así cuando manda el pedido sabemos si vino de Instagram, de un anuncio, de Google o directo,
// aunque pida recién al otro día. No guarda nada personal.
//
// El origen es un texto "canal" o "canal__campaña" (ej. "instagram__promo-2x1"):
//   · canal    = utm_source (o el sitio desde el que llegó)
//   · campaña  = utm_campaign; si es la genérica del negocio, se usa utm_medium ("bio", "historias")

const KEY = 'mw_src'
const DIAS = 7
const CAMPANA_GENERICA = 'mrwhite'

const HOSTS = [
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)(facebook|fb)\.com$/i, 'facebook'],
  [/(^|\.)fb\.me$/i, 'facebook'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/i, 'whatsapp'],
  [/(^|\.)google\./i, 'google'],
  [/(^|\.)tiktok\.com$/i, 'tiktok'],
  [/(^|\.)(twitter|x)\.com$/i, 'twitter'],
  [/(^|\.)t\.co$/i, 'twitter'],
]
// Instagram y Facebook etiquetan solos sus links con "ig" y "fb"
const ALIAS = { ig: 'instagram', fb: 'facebook' }

const limpiar = (s, largo) => String(s || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, largo)

// { search, referrer, host } → "canal" | "canal__campaña". Pura, para poder probarla.
export function detectarOrigen({ search = '', referrer = '', host = '' } = {}) {
  try {
    const q = new URLSearchParams(search)
    const utm = limpiar(q.get('utm_source'), 20)
    if (utm) {
      const canal = ALIAS[utm] || utm
      const campana = limpiar(q.get('utm_campaign'), 20)
      const camp = campana && campana !== CAMPANA_GENERICA ? campana : limpiar(q.get('utm_medium'), 20)
      return camp ? `${canal}__${camp}` : canal
    }
    if (!referrer) return 'directo'
    const h = new URL(referrer).hostname
    if (h === host) return 'directo'
    for (const [re, nombre] of HOSTS) if (re.test(h)) return nombre
    return limpiar(h.replace(/^www\./, ''), 20) || 'otro'
  } catch {
    return 'directo'
  }
}

export const partirOrigen = (s) => {
  const [canal, camp = ''] = String(s || 'directo').split('__')
  return { canal: canal || 'directo', camp }
}

// El origen de esta visita. Un link con etiqueta nuevo pisa al guardado; si no, vale el guardado (7 días).
export function getSource() {
  try {
    const ahora = detectarOrigen({ search: window.location.search, referrer: document.referrer, host: window.location.hostname })
    const etiquetado = /[?&]utm_source=/.test(window.location.search)
    const g = JSON.parse(localStorage.getItem(KEY) || 'null')
    const vigente = g && g.s && Date.now() - g.at < DIAS * 86400000
    if (vigente && !etiquetado) return g.s
    if (!vigente || etiquetado || ahora !== 'directo') {
      localStorage.setItem(KEY, JSON.stringify({ s: ahora, at: Date.now() }))
    }
    return ahora
  } catch {
    return 'directo'
  }
}

export const SOURCE_LABEL = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  google: 'Google',
  'perfil-google': 'Perfil de Google (Maps)',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  directo: 'Directo / link',
}
export const sourceLabel = (s) => {
  const { canal } = partirOrigen(s)
  return SOURCE_LABEL[canal] || canal.charAt(0).toUpperCase() + canal.slice(1)
}
// "instagram__promo-2x1" → "Instagram · promo-2x1"
export const campLabel = (s) => {
  const { camp } = partirOrigen(s)
  return camp ? `${sourceLabel(s)} · ${camp}` : sourceLabel(s)
}
