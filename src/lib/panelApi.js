// Capa de acceso del panel. Prefiere la función del propio sitio (/api/panel):
// no la bloquea ningún ad-blocker y el token vive en Vercel. Si esa función no
// está configurada, cae al modo viejo: token de GitHub pegado en el navegador.

import * as gh from './github'

const KEY = 'mw_panel_key'
export const getKey = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
export const setKey = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY) } catch { /* noop */ } }

let modo = null // 'api' | 'token'

// ¿Está la función disponible y configurada?
export async function detectarModo() {
  if (modo) return modo
  try {
    const r = await fetch('/api/panel?action=ping')
    if (r.ok) {
      const j = await r.json()
      modo = j.configurado ? 'api' : 'token'
    } else {
      modo = 'token'
    }
  } catch {
    modo = 'token'
  }
  return modo
}

const call = async (action, body) => {
  const r = await fetch(`/api/panel?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-panel-key': getKey() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`)
  return j
}

export async function login(secreto) {
  const m = await detectarModo()
  if (m === 'api') {
    setKey(secreto)
    try {
      await call('login')
    } catch (e) { setKey(''); throw e }
    return 'api'
  }
  await gh.checkToken(secreto.trim())
  gh.setToken(secreto.trim())
  return 'token'
}

export const estaLogueado = () => !!(getKey() || gh.getToken())
export const salir = () => { setKey(''); gh.setToken('') }

export async function readConfig() {
  if ((await detectarModo()) === 'api') {
    const j = await call('get-config')
    return { sha: j.sha, content: j.config }
  }
  return gh.readConfigFile(gh.getToken())
}

export async function saveConfig(config, sha, message) {
  if ((await detectarModo()) === 'api') {
    const j = await call('save-config', { config, sha, message })
    return j.sha
  }
  return gh.saveConfigFile(gh.getToken(), config, sha, message)
}

export async function readStats() {
  if ((await detectarModo()) === 'api') return call('stats')
  return null // sin función no hay estadísticas propias
}

export async function history() {
  if ((await detectarModo()) === 'token') return gh.configHistory(gh.getToken())
  return []
}
