import { useState, useEffect, useCallback } from 'react'
import { Check, AlertTriangle, RefreshCw, ExternalLink, Clock, Ban } from 'lucide-react'
import { getToken, setToken, checkToken, readConfigFile, saveConfigFile, configHistory } from '../lib/github'
import { DEFAULT_CONFIG } from '../lib/config'
import { SCHEDULE, scheduleSummary } from '../lib/schedule'
import { ZONES, formatZonePrice } from '../lib/zones'
import { SIZES } from '../context/CartContext'

const inputCls =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#F0C832]/60 transition-colors'
const labelCls = 'text-[10px] tracking-[0.16em] uppercase text-white/40'
const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }

// Las burgers y sus valores por defecto salen del código; el panel solo guarda
// lo que se cambió. Esta lista se pasa desde MenuSection para no duplicarla.
import { FALLBACK_BURGERS } from './MenuSection'

const hoyStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function Login({ onOk }) {
  const [t, setT] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    setErr(''); setCargando(true)
    try {
      await checkToken(t.trim())
      setToken(t.trim())
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
        <p className="text-white/50 text-sm mb-6">Pegá tu token de GitHub para entrar.</p>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className={labelCls}>Token</span>
          <input
            type="password"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className={inputCls}
            placeholder="github_pat_..."
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
      </form>
    </div>
  )
}

function Seccion({ titulo, children, extra }) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-white uppercase" style={anton}>{titulo}</h2>
        {extra}
      </div>
      {children}
    </div>
  )
}

export default function Admin() {
  const [logueado, setLogueado] = useState(!!getToken())
  const [cfg, setCfg] = useState(null)
  const [sha, setSha] = useState(null)
  const [tab, setTab] = useState('hoy')
  const [estado, setEstado] = useState('')   // '', 'guardando', 'ok', mensaje de error
  const [historial, setHistorial] = useState([])

  const cargar = useCallback(async () => {
    const token = getToken()
    try {
      const { sha, content } = await readConfigFile(token)
      setSha(sha)
      setCfg({ ...DEFAULT_CONFIG, ...(content || {}), today: { ...DEFAULT_CONFIG.today, ...(content?.today || {}) } })
      setHistorial(await configHistory(token))
    } catch (e) {
      setEstado(e.message)
    }
  }, [])

  useEffect(() => { if (logueado) cargar() }, [logueado, cargar])

  if (!logueado) return <Login onOk={() => setLogueado(true)} />
  if (!cfg) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" style={font}>
        <p className="text-white/60">{estado || 'Cargando…'}</p>
      </div>
    )
  }

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
  const setHoy = (patch) => setCfg((c) => ({ ...c, today: { ...c.today, ...patch, date: hoyStr() } }))
  const setBurger = (id, patch) =>
    setCfg((c) => ({ ...c, burgers: { ...c.burgers, [id]: { ...(c.burgers?.[id] || {}), ...patch } } }))

  const guardar = async (mensaje) => {
    setEstado('guardando')
    try {
      const nuevo = { ...cfg, updatedAt: new Date().toISOString() }
      const nuevoSha = await saveConfigFile(getToken(), nuevo, sha, mensaje)
      setSha(nuevoSha)
      setCfg(nuevo)
      setEstado('ok')
      setTimeout(() => setEstado(''), 3000)
      configHistory(getToken()).then(setHistorial)
    } catch (e) {
      setEstado(e.message)
    }
  }

  const TABS = [['hoy', 'Hoy'], ['menu', 'Menú'], ['envios', 'Envíos'], ['stats', 'Números']]

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 py-6" style={font}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl text-white uppercase leading-none" style={anton}>
            Mr. White <span className="text-[#F0C832]">Panel</span>
          </h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-white/55 hover:text-white">Ver sitio →</a>
            <button
              onClick={() => { setToken(''); setLogueado(false) }}
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
            <Seccion titulo="Hoy">
              <p className="text-white/45 text-xs mb-4">
                Excepciones solo para hoy. Mañana vuelve al horario de siempre
                ({scheduleSummary().filter((h) => !h.closed)[0]?.hours}).
              </p>

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

            <Seccion titulo="Sin stock">
              <p className="text-white/45 text-xs mb-4">
                Lo que marques acá aparece tachado en el menú y no se puede pedir.
              </p>
              {FALLBACK_BURGERS.map((b) => {
                const agotada = !!cfg.burgers?.[b.id]?.soldOut
                return (
                  <button
                    key={b.id}
                    onClick={() => setBurger(b.id, { soldOut: !agotada })}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl mb-2"
                    style={{
                      backgroundColor: agotada ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${agotada ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <span className="text-white text-sm uppercase" style={anton}>{b.name}</span>
                    <span
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        color: agotada ? '#F87171' : 'rgba(255,255,255,0.45)',
                        border: `1px solid ${agotada ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.12)'}`,
                      }}
                    >
                      {agotada ? 'SIN STOCK' : 'disponible'}
                    </span>
                  </button>
                )
              })}
            </Seccion>
          </>
        )}

        {/* ─── MENÚ ────────────────────────────────────────────── */}
        {tab === 'menu' && (
          <Seccion titulo="Precios y textos">
            <p className="text-white/45 text-xs mb-4">
              Los precios vacíos usan el valor del código. T = transferencia · E = efectivo.
            </p>
            {FALLBACK_BURGERS.map((b) => {
              const c = cfg.burgers?.[b.id] || {}
              return (
                <div
                  key={b.id}
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-white uppercase mb-3" style={anton}>{b.name}</p>
                  {SIZES.map((s) => (
                    <div key={s.key} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center mb-2">
                      <span className="text-white/50 text-xs">{s.label}</span>
                      <input
                        type="number"
                        className={inputCls}
                        placeholder={`T ${b.prices[s.key]}`}
                        value={c.prices?.[s.key] ?? ''}
                        onChange={(e) =>
                          setBurger(b.id, {
                            prices: { ...(c.prices || {}), [s.key]: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                      />
                      <input
                        type="number"
                        className={inputCls}
                        placeholder={`E ${b.cash[s.key]}`}
                        value={c.cash?.[s.key] ?? ''}
                        onChange={(e) =>
                          setBurger(b.id, {
                            cash: { ...(c.cash || {}), [s.key]: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                      />
                    </div>
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
        )}

        {/* ─── ENVÍOS ──────────────────────────────────────────── */}
        {tab === 'envios' && (
          <Seccion titulo="Zonas de envío">
            <p className="text-white/45 text-xs mb-4">
              Cambiá el precio de cada zona. Para agregar zonas nuevas hace falta
              dibujarlas en el mapa — pedímelo y las sumo.
            </p>
            {ZONES.map((z) => (
              <div key={z.id} className="flex items-center gap-3 mb-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm uppercase truncate" style={anton}>{z.name}</p>
                  <p className="text-white/40 text-xs">{z.bounds}</p>
                </div>
                <input
                  type="number"
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
          <Seccion titulo="Números">
            <div
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: 'rgba(240,200,50,0.08)', border: '1px solid rgba(240,200,50,0.28)' }}
            >
              <p className="text-[#F0C832] text-sm leading-relaxed">
                <strong>Falta un paso.</strong> El sitio ya manda el evento de cada
                burger agregada, pero <b>Web Analytics está apagado</b> en Vercel, así
                que todavía no se guarda nada. Se activa con un clic y es gratis.
              </p>
              <a
                href="https://vercel.com/lucianobrocchi-2489s-projects/mrwhiteburgers/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-[#F0C832] text-sm"
              >
                Activar Analytics <ExternalLink size={13} />
              </a>
            </div>
            <p className="text-white/50 text-sm">
              Una vez activo vas a ver, por burger, cuántas veces la agregaron al
              pedido, y de dónde entra la gente. Cuando lo prendas avisame y lo
              traigo acá adentro para que no tengas que ir a Vercel.
            </p>
          </Seccion>
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
                <><Check size={16} strokeWidth={3} /> Guardado — se ve en el sitio en ~1 min</>
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

        {/* Historial */}
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
