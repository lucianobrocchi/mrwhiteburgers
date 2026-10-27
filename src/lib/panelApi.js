// Capa de acceso del panel: habla con la función del propio sitio (/api/panel), que
// guarda en la base D1. La clave se queda en este navegador; ningún bloqueador de
// anuncios corta la conexión porque es el mismo dominio.

const KEY = 'mw_panel_key'
export const getKey = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
export const setKey = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY) } catch { /* noop */ } }

// Error con el código HTTP: 401 = la clave ya no sirve (se cambió) y hay que volver a entrar
export class ErrorPanel extends Error {
  constructor(mensaje, status) {
    super(mensaje)
    this.status = status
  }
}

const call = async (action, body) => {
  let r
  try {
    r = await fetch(`/api/panel?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'x-panel-key': getKey() },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ErrorPanel('No hay conexión con el servidor. Revisá tu internet y probá de nuevo.', 0)
  }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new ErrorPanel(j.error || `Error ${r.status}`, r.status)
  return j
}

export async function login(secreto) {
  setKey(secreto)
  try {
    await call('login')
  } catch (e) {
    setKey('')
    throw e
  }
}

export const estaLogueado = () => !!getKey()
export const salir = () => setKey('')

export async function readConfig() {
  const j = await call('get-config')
  return { sha: j.sha, content: j.config }
}

export async function saveConfig(config, sha, message) {
  const j = await call('save-config', { config, sha, message })
  return j.sha
}

// Pedidos y estadísticas de los últimos `meses` meses
export const readStats = (meses = 12) => call(`stats&months=${meses}`)

export const deleteOrder = (id) => call('delete-order', { id })
