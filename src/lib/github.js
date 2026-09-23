// ─── Guardar la config en GitHub ─────────────────────────────────────────
// El panel escribe public/config.json en el repo usando la API de GitHub.
// El token lo pega el admin una sola vez y queda SOLO en su navegador
// (localStorage); nunca viaja en el código ni lo ve un visitante.

const REPO = 'lucianobrocchi/mrwhiteburgers'
const PATH = 'public/config.json'
const BRANCH = 'main'
const TOKEN_KEY = 'mw_gh_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
}

// Si el fetch falla a nivel red (bloqueador, VPN, sin señal) el navegador tira
// un TypeError seco que no dice nada. Lo traducimos a algo accionable.
const api = async (path, token, init = {}) => {
  try {
    return await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
  } catch {
    throw new Error(
      'No pude conectarme a GitHub desde este dispositivo. Suele ser un ' +
      'bloqueador de anuncios, una VPN o el DNS. Probá desactivar el bloqueador, ' +
      'o entrar desde otra red / con datos del celular.',
    )
  }
}

// Verifica que el token sirva y tenga permiso de escritura en el repo.
export async function checkToken(token) {
  const r = await api('', token)
  if (r.status === 401) throw new Error('El token no es válido o venció.')
  if (r.status === 404) throw new Error('El token no tiene acceso a este repositorio.')
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}.`)
  const repo = await r.json()
  if (!repo.permissions?.push) throw new Error('El token no tiene permiso de escritura (Contents: Read and write).')
  return true
}

// UTF-8 → base64 (btoa solo maneja latin1, y hay tildes en las descripciones)
const toBase64 = (str) => {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

export async function readConfigFile(token) {
  const r = await api(`contents/${PATH}?ref=${BRANCH}&t=${Date.now()}`, token)
  if (r.status === 404) return { sha: null, content: null }
  if (!r.ok) throw new Error(`No pude leer la config (${r.status}).`)
  const j = await r.json()
  const txt = new TextDecoder().decode(
    Uint8Array.from(atob(j.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  )
  return { sha: j.sha, content: JSON.parse(txt) }
}

export async function saveConfigFile(token, config, sha, mensaje) {
  const body = {
    message: mensaje || 'chore(config): cambios desde el panel',
    content: toBase64(JSON.stringify(config, null, 2) + '\n'),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const r = await api(`contents/${PATH}`, token, { method: 'PUT', body: JSON.stringify(body) })
  if (r.status === 409) throw new Error('Alguien más guardó cambios recién. Recargá el panel y volvé a intentar.')
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.message || `No pude guardar (${r.status}).`)
  }
  const j = await r.json()
  return j.content.sha
}

// Historial de cambios de la config, para el panel.
export async function configHistory(token, limit = 8) {
  const r = await api(`commits?path=${PATH}&sha=${BRANCH}&per_page=${limit}`, token)
  if (!r.ok) return []
  const j = await r.json()
  return j.map((c) => ({
    fecha: c.commit.author?.date,
    mensaje: c.commit.message.split('\n')[0],
    autor: c.commit.author?.name,
  }))
}
