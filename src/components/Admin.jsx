import { useState, useEffect, useCallback } from 'react'
import { Check, AlertTriangle, RefreshCw, ExternalLink, Clock, Ban, Zap, Timer } from 'lucide-react'
import * as panel from '../lib/panelApi'
import { DEFAULT_CONFIG } from '../lib/config'
import { scheduleSummary } from '../lib/schedule'
import { ZONES, formatZonePrice } from '../lib/zones'
import { SIZES } from '../context/CartContext'
import { EXTRAS, DRINKS, extraKey, drinkKey, flavorKey } from '../lib/catalog'
import AdminStats from './AdminStats'

const inputCls =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#F0C832]/60 transition-colors'
const labelCls = 'text-[10px] tracking-[0.16em] uppercase text-white/40'
const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }

// Las burgers y sus precios de la carta salen del código; el panel solo guarda
// lo que se cambió.
import { BURGERS } from '../lib/menu'

const hoyStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function Login({ onOk }) {
  const [t, setT] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)
  const [diag, setDiag] = useState('')
  const [modo, setModo] = useState(null)

  useEffect(() => { panel.detectarModo().then(setModo) }, [])
  const conClave = modo === 'api'

  // Comprueba si este dispositivo puede llegar a GitHub, sin token de por medio.
  const probarConexion = async () => {
    setDiag('probando…')
    try {
      const r = await fetch('https://api.github.com/repos/lucianobrocchi/mrwhiteburgers')
      setDiag(
        r.ok
          ? '✅ Llego bien a GitHub. Si falla al entrar, el problema es el token.'
          : `⚠️ GitHub respondió ${r.status}.`,
      )
    } catch {
      setDiag(
        '❌ Este dispositivo NO llega a GitHub. Es tu red o navegador: probá ' +
        'apagar el bloqueador de anuncios / la VPN, o usá los datos del celular.',
      )
    }
  }

  const entrar = async (e) => {
    e.preventDefault()
    setErr(''); setCargando(true)
    try {
      await panel.login(t.trim())
      onOk()
    } catch (ex) {
      setErr(ex.message)
    }
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" style={font}>
      <form onSubmit={entrar} className="w-full max-w-md">
        <h1 className="text-4xl text-white uppercase mb-1" style={anton}>
          Mr. White <span className="text-[#F0C832]">Panel</span>
        </h1>
        <p className="text-white/50 text-sm mb-6">
          {conClave ? 'Ingresá la clave del panel.' : 'Pegá tu token de GitHub para entrar.'}
        </p>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className={labelCls}>{conClave ? 'Clave' : 'Token'}</span>
          <input
            type="password"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className={inputCls}
            placeholder={conClave ? '••••••••' : 'github_pat_...'}
            autoComplete="off"
          />
        </label>

        {err && (
          <p className="text-red-300 text-sm mb-3 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando || !t.trim()}
          className="w-full py-3 rounded-full text-black text-sm tracking-widest uppercase disabled:opacity-50"
          style={{ ...anton, backgroundColor: '#F0C832' }}
        >
          {cargando ? 'Verificando…' : 'Entrar'}
        </button>

        {!conClave && (
          <>
            <button
              type="button"
              onClick={probarConexion}
              className="w-full mt-3 py-2.5 rounded-full text-xs uppercase tracking-widest text-white/60 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Probar conexión con GitHub
            </button>
            {diag && (
              <p className="text-white/70 text-xs mt-3 leading-relaxed">{diag}</p>
            )}
          </>
        )}

        {conClave ? (
          <p className="mt-6 text-white/40 text-xs leading-relaxed">
            El panel habla con tu propio sitio, así que ningún bloqueador lo corta.
            Los cambios se ven en la web en segundos.
          </p>
        ) : (
        <>
        {/* Cómo pasar al modo con clave (sin token en el teléfono) */}
        <details className="mt-5 rounded-xl p-3" style={{ backgroundColor: 'rgba(240,200,50,0.07)', border: '1px solid rgba(240,200,50,0.25)' }}>
          <summary className="text-[#F0C832] text-xs cursor-pointer">
            ¿Te da "failed to fetch"? Tocá acá
          </summary>
          <div className="text-white/60 text-xs leading-relaxed mt-3">
            <p className="mb-2">
              Ese error es tu red o un bloqueador cortando <b>api.github.com</b>.
              Se arregla para siempre en 3 pasos, sin copiar ningún token:
            </p>
            <ol className="list-decimal ml-4 space-y-1.5">
              <li>
                En Vercel → pestaña <b className="text-white/80">Storage</b> →
                <b className="text-white/80"> Create Database</b> → elegí <b className="text-white/80">Blob</b> →
                conectalo al proyecto <b>mrwhiteburgers</b>.
              </li>
              <li>
                Settings → <b className="text-white/80">Environment Variables</b> → agregá
                <b className="text-white/80"> PANEL_PASSWORD</b> con la clave que quieras
                (tildá Production).
              </li>
              <li>Deployments → los 3 puntitos del último → <b className="text-white/80">Redeploy</b>.</li>
            </ol>
            <p className="mt-2">
              Listo: entrás con esa clave, se acaba el error, los cambios se ven
              al instante y arrancan las estadísticas de pedidos.
            </p>
          </div>
        </details>
        <div className="mt-6 text-white/45 text-xs leading-relaxed">
          <p className="mb-2">El token queda guardado solo en este dispositivo. Para crear uno:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Entrá a github.com → Settings → Developer settings</li>
            <li>Fine-grained tokens → Generate new token</li>
            <li>Repository access: solo <b>mrwhiteburgers</b></li>
            <li>Permissions → Contents: <b>Read and write</b></li>
          </ol>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[#F0C832]/80 hover:text-[#F0C832]"
          >
            Crear token <ExternalLink size={12} />
          </a>
        </div>
        </>
        )}
      </form>
    </div>
  )
}

function Seccion({ titulo, children, extra, nota }) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl text-white uppercase" style={anton}>{titulo}</h2>
        {extra}
      </div>
      {nota && <p className="text-white/45 text-xs mb-4 leading-relaxed" style={font}>{nota}</p>}
      {!nota && <div className="mb-3" />}
      {children}
    </div>
  )
}

// Subtítulo dentro de una sección
const Grupo = ({ children }) => (
  <p className="text-white/40 text-[10px] tracking-[0.18em] uppercase mt-4 mb-2 first:mt-0" style={font}>
    {children}
  </p>
)

// Fila que se toca para alternar entre "disponible" y "SIN STOCK"
function Interruptor({ nombre, detalle, sinStock, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl mb-2 text-left"
      style={{
        backgroundColor: sinStock ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${sinStock ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <span className="min-w-0">
        <span className="block text-white text-sm uppercase truncate" style={anton}>{nombre}</span>
        {detalle && <span className="block text-white/40 text-[11px] mt-0.5" style={font}>{detalle}</span>}
      </span>
      <span
        className="text-xs px-3 py-1 rounded-full shrink-0"
        style={{
          ...font,
          color: sinStock ? '#F87171' : 'rgba(255,255,255,0.45)',
          border: `1px solid ${sinStock ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        {sinStock ? 'SIN STOCK' : 'disponible'}
      </span>
    </button>
  )
}

// Campo de precio: vacío = usa el precio de la carta (el que está en el código)
function EntradaPrecio({ etiqueta, defecto, valor, onChange }) {
  return (
    <div className="grid grid-cols-[1fr_120px] gap-3 items-center mb-2">
      <span className="text-white/70 text-sm min-w-0 truncate" style={font}>{etiqueta}</span>
      <input
        type="number"
        inputMode="numeric"
        className={inputCls}
        placeholder={String(defecto)}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </div>
  )
}

// Rellena lo que falte para que el resto del panel nunca se encuentre con undefined
const normalizar = (c) => ({
  ...DEFAULT_CONFIG,
  ...(c || {}),
  today: { ...DEFAULT_CONFIG.today, ...(c?.today || {}) },
  burgers: { ...(c?.burgers || {}) },
  zones: { ...(c?.zones || {}) },
  stock: { ...(c?.stock || {}) },
  prices: { ...(c?.prices || {}) },
})

const PASOS_BLOB = (
  <ol className="list-decimal ml-5 space-y-1.5 text-white/65 text-xs leading-relaxed" style={font}>
    <li>En Vercel, abrí el proyecto <b>mrwhiteburgers</b> → pestaña <b>Storage</b> → <b>Create Database</b> → <b>Blob</b> y conectalo al proyecto.</li>
    <li>En <b>Settings → Environment Variables</b> agregá <b>PANEL_PASSWORD</b> con la clave que quieras (tildá Production).</li>
    <li>En <b>Deployments</b> → los 3 puntitos del último → <b>Redeploy</b>.</li>
  </ol>
)

export default function Admin() {
  const [logueado, setLogueado] = useState(panel.estaLogueado())
  const [cfg, setCfg] = useState(null)
  const [sha, setSha] = useState(null)
  const [tab, setTab] = useState('hoy')
  const [estado, setEstado] = useState('')   // '', 'guardando', 'ok', o el mensaje de error
  const [historial, setHistorial] = useState([])
  const [stats, setStats] = useState(null)
  const [backend, setBackend] = useState(null) // nombre del almacén si guarda el servidor (al instante); null = modo token
  const [recargando, setRecargando] = useState(false)

  const traerStats = useCallback(async () => {
    try { setStats(await panel.readStats()) } catch { /* se queda con lo que tenía */ }
  }, [])

  // El botón de actualizar: igual que la carga inicial, pero mostrando que está trabajando
  const recargarStats = useCallback(async () => {
    setRecargando(true)
    await traerStats()
    setRecargando(false)
  }, [traerStats])

  // Carga inicial al entrar. `vivo` evita escribir estado si se sale del panel
  // mientras todavía está trayendo los datos.
  useEffect(() => {
    if (!logueado) return undefined
    let vivo = true
    ;(async () => {
      try {
        const { sha: version, content } = await panel.readConfig()
        if (!vivo) return
        setSha(version)
        setCfg(normalizar(content))
        panel.history().then((h) => vivo && setHistorial(h)).catch(() => {})
        panel.dondeGuarda().then((b) => vivo && setBackend(b))
        traerStats()
      } catch (e) {
        if (vivo) setEstado(e.message)
      }
    })()
    return () => { vivo = false }
  }, [logueado, traerStats])

  if (!logueado) return <Login onOk={() => setLogueado(true)} />
  if (!cfg) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 text-center" style={font}>
        <p className={estado ? 'text-red-300 text-sm' : 'text-white/60'}>{estado || 'Cargando…'}</p>
      </div>
    )
  }

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
  const setHoy = (patch) => setCfg((c) => ({ ...c, today: { ...c.today, ...patch, date: hoyStr() } }))
  const setBurger = (id, patch) =>
    setCfg((c) => ({ ...c, burgers: { ...c.burgers, [id]: { ...(c.burgers?.[id] || {}), ...patch } } }))
  const setStock = (clave, sin) =>
    setCfg((c) => {
      const stock = { ...c.stock }
      if (sin) stock[clave] = true
      else delete stock[clave]
      return { ...c, stock }
    })
  const setPrecio = (clave, valor) =>
    setCfg((c) => {
      const prices = { ...c.prices }
      if (valor == null || Number.isNaN(valor)) delete prices[clave]
      else prices[clave] = valor
      return { ...c, prices }
    })

  const guardar = async (mensaje) => {
    setEstado('guardando')
    try {
      const nuevo = { ...cfg, updatedAt: new Date().toISOString() }
      const nuevoSha = await panel.saveConfig(nuevo, sha, mensaje)
      setSha(nuevoSha)
      setCfg(nuevo)
      setEstado('ok')
      setTimeout(() => setEstado(''), 3500)
      panel.history().then(setHistorial).catch(() => {})
    } catch (e) {
      setEstado(e.message)
    }
  }

  const alInstante = backend != null // hay un servidor guardando: los cambios son inmediatos
  const TABS = [['hoy', 'Hoy'], ['menu', 'Menú'], ['envios', 'Envíos'], ['stats', 'Números']]

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 py-6" style={font}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl text-white uppercase leading-none" style={anton}>
              Mr. White <span className="text-[#F0C832]">Panel</span>
            </h1>
            <p
              className="inline-flex items-center gap-1.5 text-[11px] mt-2"
              style={{ color: alInstante ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}
            >
              {alInstante ? <Zap size={12} /> : <Timer size={12} />}
              {alInstante ? 'Los cambios se ven en la web en segundos' : 'Los cambios tardan ~1 minuto en verse'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-white/55 hover:text-white">Ver sitio →</a>
            <button
              onClick={() => { panel.salir(); setLogueado(false) }}
              className="px-4 py-2 rounded-full text-sm uppercase tracking-wide text-white/65 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="px-4 py-2 rounded-full text-sm tracking-widest uppercase"
              style={{
                ...anton,
                backgroundColor: tab === k ? '#F0C832' : 'transparent',
                color: tab === k ? '#000' : 'rgba(255,255,255,0.6)',
                border: tab === k ? 'none' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── HOY ─────────────────────────────────────────────── */}
        {tab === 'hoy' && (
          <>
            <Seccion
              titulo="Hoy"
              nota={`Excepciones solo para hoy. Mañana vuelve solo al horario de siempre (${scheduleSummary().find((h) => !h.closed)?.hours || '—'}).`}
            >
              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!cfg.today.closed}
                  onChange={(e) => setHoy({ closed: e.target.checked })}
                  className="w-5 h-5 accent-[#F0C832]"
                />
                <span className="text-white text-sm flex items-center gap-2">
                  <Ban size={15} className="text-red-400" /> Hoy cerramos
                </span>
              </label>

              <label className="flex items-center gap-3 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!cfg.today.deliveryOff}
                  onChange={(e) => setHoy({ deliveryOff: e.target.checked })}
                  className="w-5 h-5 accent-[#F0C832]"
                />
                <span className="text-white text-sm">Hoy sin envíos (solo retiro)</span>
              </label>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Hoy abrimos</span>
                  <input
                    type="time"
                    value={cfg.today.opensAt || ''}
                    onChange={(e) => setHoy({ opensAt: e.target.value || null })}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Hoy cerramos</span>
                  <input
                    type="time"
                    value={cfg.today.closesAt || ''}
                    onChange={(e) => setHoy({ closesAt: e.target.value || null })}
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 mb-4">
                <span className={labelCls}>Aviso (opcional)</span>
                <input
                  value={cfg.today.note || ''}
                  onChange={(e) => setHoy({ note: e.target.value })}
                  className={inputCls}
                  placeholder="Ej: hoy demoras de 40 min"
                />
              </label>

              <button
                onClick={() => setCfg((c) => ({ ...c, today: { ...DEFAULT_CONFIG.today } }))}
                className="text-xs text-white/40 hover:text-white/70"
              >
                Limpiar excepciones de hoy
              </button>
            </Seccion>

            <Seccion
              titulo="Sin stock"
              nota="Lo que marques acá aparece como “Sin stock” en la web y no se puede pedir. Tocá de nuevo para volver a habilitarlo."
            >
              <Grupo>Burgers</Grupo>
              {BURGERS.map((b) => (
                <Interruptor
                  key={b.id}
                  nombre={b.name}
                  sinStock={!!cfg.burgers?.[b.id]?.soldOut}
                  onToggle={() => setBurger(b.id, { soldOut: !cfg.burgers?.[b.id]?.soldOut })}
                />
              ))}

              <Grupo>Extras</Grupo>
              {EXTRAS.map((e) => (
                <Interruptor
                  key={e.id}
                  nombre={e.name}
                  detalle={e.desc}
                  sinStock={!!cfg.stock[extraKey(e)]}
                  onToggle={() => setStock(extraKey(e), !cfg.stock[extraKey(e)])}
                />
              ))}

              <Grupo>Bebidas (por tamaño)</Grupo>
              {DRINKS.flatMap((d) =>
                d.sizes.map((s) => (
                  <Interruptor
                    key={drinkKey(d, s)}
                    nombre={`${d.name} · ${s.label}`}
                    sinStock={!!cfg.stock[drinkKey(d, s)]}
                    onToggle={() => setStock(drinkKey(d, s), !cfg.stock[drinkKey(d, s)])}
                  />
                )),
              )}

              <Grupo>Sabores</Grupo>
              {DRINKS.flatMap((d) =>
                (d.flavors || []).map((f) => (
                  <Interruptor
                    key={flavorKey(f)}
                    nombre={f.label}
                    detalle="Todos los tamaños"
                    sinStock={!!cfg.stock[flavorKey(f)]}
                    onToggle={() => setStock(flavorKey(f), !cfg.stock[flavorKey(f)])}
                  />
                )),
              )}
            </Seccion>

            <Seccion titulo="Cartel de arriba" nota="El texto que corre en la barra roja. Vacío = el de siempre.">
              <input
                value={cfg.ticker || ''}
                onChange={(e) => set({ ticker: e.target.value })}
                className={inputCls}
                placeholder="Ej: HOY 2X1 EN SIMPLES · PEDÍ POR WHATSAPP"
              />
            </Seccion>
          </>
        )}

        {/* ─── MENÚ ────────────────────────────────────────────── */}
        {tab === 'menu' && (
          <>
            <Seccion titulo="Burgers" nota="Si dejás un precio vacío se usa el de la carta (el que figura en gris).">
              {BURGERS.map((b) => {
                const c = cfg.burgers?.[b.id] || {}
                return (
                  <div
                    key={b.id}
                    className="rounded-xl p-4 mb-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-white uppercase mb-3" style={anton}>{b.name}</p>
                    {SIZES.map((s) => (
                      <EntradaPrecio
                        key={s.key}
                        etiqueta={s.label}
                        defecto={b.prices[s.key]}
                        valor={c.prices?.[s.key]}
                        onChange={(v) =>
                          setBurger(b.id, { prices: { ...(c.prices || {}), [s.key]: v == null ? undefined : v } })
                        }
                      />
                    ))}
                    <label className="flex flex-col gap-1.5 mt-3">
                      <span className={labelCls}>Descripción</span>
                      <textarea
                        rows={2}
                        className={inputCls + ' resize-y'}
                        placeholder={b.description}
                        value={c.description || ''}
                        onChange={(e) => setBurger(b.id, { description: e.target.value })}
                      />
                    </label>
                  </div>
                )
              })}
            </Seccion>

            <Seccion titulo="Extras">
              {EXTRAS.map((e) => (
                <EntradaPrecio
                  key={e.id}
                  etiqueta={`${e.name}${e.desc ? ` · ${e.desc}` : ''}`}
                  defecto={e.price}
                  valor={cfg.prices[extraKey(e)]}
                  onChange={(v) => setPrecio(extraKey(e), v)}
                />
              ))}
            </Seccion>

            <Seccion titulo="Bebidas">
              {DRINKS.map((d) => (
                <div key={d.id} className="mb-3 last:mb-0">
                  <Grupo>{d.name}</Grupo>
                  {d.sizes.map((s) => (
                    <EntradaPrecio
                      key={drinkKey(d, s)}
                      etiqueta={s.label}
                      defecto={s.price}
                      valor={cfg.prices[drinkKey(d, s)]}
                      onChange={(v) => setPrecio(drinkKey(d, s), v)}
                    />
                  ))}
                </div>
              ))}
            </Seccion>
          </>
        )}

        {/* ─── ENVÍOS ──────────────────────────────────────────── */}
        {tab === 'envios' && (
          <Seccion
            titulo="Zonas de envío"
            nota="Cambiá el precio de cada zona. Para sumar zonas nuevas hay que dibujarlas en el mapa: pedilo y se agregan."
          >
            {ZONES.map((z) => (
              <div key={z.id} className="flex items-center gap-3 mb-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm uppercase truncate" style={anton}>{z.name}</p>
                  <p className="text-white/40 text-xs">{z.bounds}</p>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputCls + ' w-32 shrink-0'}
                  placeholder={String(z.price)}
                  value={cfg.zones?.[z.id]?.price ?? ''}
                  onChange={(e) =>
                    set({
                      zones: {
                        ...cfg.zones,
                        [z.id]: { price: e.target.value ? Number(e.target.value) : undefined },
                      },
                    })
                  }
                />
              </div>
            ))}
            <p className="text-white/35 text-[11px] mt-3">
              Precio actual en el sitio: {ZONES.map((z) => `${z.name} ${formatZonePrice(z)}`).join(' · ')}
            </p>
          </Seccion>
        )}

        {/* ─── NÚMEROS ─────────────────────────────────────────── */}
        {tab === 'stats' && (
          <AdminStats
            stats={stats}
            registroActivo={alInstante}
            pasosBlob={PASOS_BLOB}
            onReload={recargarStats}
            recargando={recargando}
            puedeBorrar={alInstante}
            onDelete={async (id) => {
              await panel.deleteOrder(id)
              await traerStats()
            }}
          />
        )}

        {/* Guardar */}
        {tab !== 'stats' && (
          <div className="sticky bottom-4 mt-6">
            <button
              onClick={() => guardar(`chore(config): cambios desde el panel (${tab})`)}
              disabled={estado === 'guardando'}
              className="w-full py-4 rounded-full text-black text-sm tracking-widest uppercase disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                ...anton,
                backgroundColor: estado === 'ok' ? '#4ADE80' : '#F0C832',
                boxShadow: '0 12px 32px -10px rgba(240,200,50,0.5)',
              }}
            >
              {estado === 'guardando' ? (
                <><RefreshCw size={15} className="animate-spin" /> Guardando…</>
              ) : estado === 'ok' ? (
                <><Check size={16} strokeWidth={3} /> {alInstante ? 'Guardado — ya está en la web' : 'Guardado — se ve en ~1 min'}</>
              ) : (
                'Guardar cambios'
              )}
            </button>
            {estado && !['ok', 'guardando'].includes(estado) && (
              <p className="text-red-300 text-sm mt-3 flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {estado}
              </p>
            )}
          </div>
        )}

        {/* Historial de cambios (solo con GitHub) */}
        {historial.length > 0 && (
          <div className="mt-8">
            <p className="text-white/40 text-[11px] tracking-[0.16em] uppercase mb-2 flex items-center gap-2">
              <Clock size={12} /> Últimos cambios
            </p>
            {historial.map((h, i) => (
              <div key={i} className="flex items-baseline justify-between py-1 text-xs">
                <span className="text-white/55 truncate pr-3">{h.mensaje}</span>
                <span className="text-white/30 shrink-0">
                  {h.fecha ? new Date(h.fecha).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
