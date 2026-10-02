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

// ¿Está guardando el servidor del sitio (almacén conectado + clave cargada)?
// Devuelve el nombre del almacén ('blob') o null si no: en ese caso el panel
// trabaja con el token de GitHub y los cambios tardan un minuto en verse.
export async function dondeGuarda() {
  try {
    const r = await fetch('/api/panel?action=ping')
    if (r.ok) {
      const j = await r.json()
      return j.configurado ? j.backend : null
    }
  } catch { /* noop */ }
  return null
}

export async function saveConfig(config, sha, message) {
  if ((await detectarModo()) === 'api') {
    const j = await call('save-config', { config, sha, message })
    return j.sha
  }
  return gh.saveConfigFile(gh.getToken(), config, sha, message)
}

// Estadísticas de pedidos. Solo existen con el modo "clave" (Vercel Blob): en el
// modo viejo con token de GitHub no se registran pedidos, así que devuelve null.
export async function readStats(meses = 12) {
  if ((await detectarModo()) === 'api') return call(`stats&months=${meses}`)
  return null
}

export async function deleteOrder(id) {
  return call('delete-order', { id })
}

export async function history() {
  if ((await detectarModo()) === 'token') return gh.configHistory(gh.getToken())
  return []
}
