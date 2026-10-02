// ─── De dónde llegó el cliente ───────────────────────────────────────────
// Se calcula una vez al abrir el sitio (por el referrer o por ?utm_source=) y se
// recuerda durante la sesión, así cuando manda el pedido sabemos si vino de
// Instagram, Facebook, Google, o si entró directo. No guarda nada personal.

const KEY = 'mw_src'

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

function limpiar(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24)
}

function detectar() {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source')
    if (utm) return limpiar(utm) || 'directo'

    const ref = document.referrer
    if (!ref) return 'directo'
    const host = new URL(ref).hostname
    if (host === window.location.hostname) return 'directo'
    for (const [re, nombre] of HOSTS) if (re.test(host)) return nombre
    return limpiar(host.replace(/^www\./, '')) || 'otro'
  } catch {
    return 'directo'
  }
}

// Devuelve la fuente de esta sesión (la primera que se detectó).
export function getSource() {
  try {
    const guardada = sessionStorage.getItem(KEY)
    if (guardada) return guardada
    const s = detectar()
    sessionStorage.setItem(KEY, s)
    return s
  } catch {
    return 'directo'
  }
}

export const SOURCE_LABEL = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  google: 'Google',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  directo: 'Directo / link',
}
export const sourceLabel = (s) => SOURCE_LABEL[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Directo / link')
