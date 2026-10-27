import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Check, AlertTriangle, RefreshCw, Ban, Zap, ChevronDown, RotateCcw, Eye, EyeOff, ArrowRight,
} from 'lucide-react'
import * as panel from '../lib/panelApi'
import { DEFAULT_CONFIG, todayOverride } from '../lib/config'
import { scheduleSummary, getStatus } from '../lib/schedule'
import { ZONES, formatZonePrice } from '../lib/zones'
import { SIZES } from '../lib/sizes'
import { EXTRAS, DRINKS, extraKey, drinkKey, flavorKey } from '../lib/catalog'
import { hoyART, kpis } from '../lib/statsCalc'
import AdminStats from './AdminStats'
import AdminPromos from './AdminPromos'
import { validatePromo, validatePromoList, cheapPromoError } from '../lib/promos'
import { leerPrecio, textoDePrecio } from '../lib/precio'

// La pestaña "Números" (estadísticas de pedidos) está prendida. Para apagarla, false:
// los pedidos se siguen guardando igual en segundo plano, así que
// al prenderla (true) ya hay historial. Apagada, el panel ni siquiera los pide.
const MOSTRAR_NUMEROS = true

// Los números se refrescan solos cada tanto mientras el panel está a la vista
const REFRESCO_MS = 3 * 60 * 1000

const inputCls =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F0C832]/60 transition-colors scroll-mb-28'
const labelCls = 'text-[10px] tracking-[0.16em] uppercase text-white/40'
const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }
const ORO = '#F0C832'

// Las burgers y sus precios de la carta salen del código (sin fotos, para que el
// panel cargue liviano); el panel solo guarda lo que se cambió.
import { BURGERS_BASE as BURGERS } from '../lib/menuBase'

const hoyStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const horaCorta = (d) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Login({ onOk, aviso = '' }) {
  const [t, setT] = useState('')
  const [err, setErr] = useState(aviso)
  const [cargando, setCargando] = useState(false)
  const [ver, setVer] = useState(false)

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
        <p className="text-white/50 text-sm mb-6">Ingresá la clave del panel.</p>

        <label className="flex flex-col gap-1.5 mb-3">
          <span className={labelCls}>Clave</span>
          <span className="relative block">
            <input
              type={ver ? 'text' : 'password'}
              value={t}
              onChange={(e) => setT(e.target.value)}
              className={`${inputCls} pr-11`}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? 'Ocultar clave' : 'Mostrar clave'}
              className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-white/45 hover:text-white"
            >
              {ver ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {err && (
          <p className="text-red-300 text-sm mb-3 flex items-start gap-2" role="alert">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando || !t.trim()}
          className="w-full py-3 min-h-[48px] rounded-full text-black text-sm tracking-widest uppercase disabled:opacity-50"
          style={{ ...anton, backgroundColor: ORO }}
        >
          {cargando ? 'Verificando…' : 'Entrar'}
        </button>

        <p className="mt-6 text-white/40 text-xs leading-relaxed">
          Los cambios se ven en la web en segundos. Si usás el celular, podés agregar esta página a la
          pantalla de inicio para abrirla como una app.
        </p>
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
      <div className="flex items-center justify-between gap-3 mb-1">
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

// Bloque que se abre y se cierra (para no tener una lista interminable en el celular)
function Plegable({ titulo, badge, abierto0 = false, children }) {
  const [abierto, setAbierto] = useState(abierto0)
  return (
    <div className="mt-3 first:mt-0">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="w-full flex items-center justify-between gap-3 min-h-[44px] text-left"
      >
        <span className="text-white/40 text-[10px] tracking-[0.18em] uppercase" style={font}>
          {titulo}
          {badge ? <span className="ml-2 normal-case tracking-normal text-[11px]" style={{ color: '#F87171' }}>{badge}</span> : null}
        </span>
        <ChevronDown size={16} className={`text-white/40 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && <div className="pt-1">{children}</div>}
    </div>
  )
}

// Fila que se toca para alternar entre "disponible" y "SIN STOCK"
function Interruptor({ nombre, detalle, sinStock, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={sinStock}
      className="w-full flex items-center justify-between gap-3 px-3 py-3 min-h-[52px] rounded-xl mb-2 text-left"
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

// Input de precio: texto con teclado numérico que entiende "13.500" como 13500 (un
// <input type="number"> lo lee como 13,5 y el sitio mostraría $14). `onChange` recibe
// el número, o null si está vacío o no se entiende; `onMalo(true)` avisa que lo
// escrito no se entiende (el aviso lo muestra quien lo usa, al salir del campo).
function InputPrecio({ valor, placeholder, onChange, onMalo, className = '' }) {
  const [texto, setTexto] = useState(textoDePrecio(valor))
  const [editando, setEditando] = useState(false)
  const malo = texto.trim() !== '' && Number.isNaN(leerPrecio(texto))
  useEffect(() => { onMalo?.(malo && !editando) }, [malo, editando, onMalo])
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={`${inputCls} ${className}`}
      style={malo && !editando ? { borderColor: 'rgba(248,113,113,0.7)' } : undefined}
      placeholder={placeholder}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        const n = leerPrecio(e.target.value)
        onChange(Number.isFinite(n) ? n : null)
      }}
      onFocus={() => setEditando(true)}
      onBlur={() => {
        setEditando(false)
        const n = leerPrecio(texto)
        if (Number.isFinite(n)) setTexto(textoDePrecio(n))
      }}
    />
  )
}

const avisoPrecioMalo = (
  <p className="text-red-300 text-xs flex items-start gap-1.5 mb-2" style={font} role="alert">
    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
    No se entiende ese precio: escribí sólo números, sin centavos (por ejemplo 13500). Mientras tanto se usa el de la carta.
  </p>
)

// Botón para volver al precio de la carta
function BotonCarta({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver al precio de la carta"
      title="Volver al precio de la carta"
      className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white/45 hover:text-white"
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <RotateCcw size={15} />
    </button>
  )
}

// Campo de precio: vacío = usa el precio de la carta (el que está en el código).
// Si se cambió, marca el precio original y deja volver con un toque.
function EntradaPrecio({ etiqueta, defecto, valor, onChange }) {
  const [malo, setMalo] = useState(false)
  const [reinicio, setReinicio] = useState(0) // cambia la key para que el campo se vacíe
  const cambiado = valor != null && valor !== defecto
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-center mb-2">
        <span className="min-w-0">
          <span className="block text-white/70 text-sm truncate" style={font}>{etiqueta}</span>
          {cambiado && (
            <span className="block text-[11px]" style={{ ...font, color: ORO }}>
              Cambiado · en la carta {money(defecto)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {cambiado && <BotonCarta onClick={() => { setReinicio((n) => n + 1); onChange(null) }} />}
          <span className="w-[116px]">
            <InputPrecio key={reinicio} valor={valor} placeholder={textoDePrecio(defecto)} onChange={onChange} onMalo={setMalo} />
          </span>
        </span>
      </div>
      {malo && avisoPrecioMalo}
    </>
  )
}

// Precio de una zona de envío (vacío = el de siempre)
function FilaZona({ z, valor, onChange }) {
  const [malo, setMalo] = useState(false)
  const [reinicio, setReinicio] = useState(0)
  const cambiado = valor != null && valor !== z.price
  return (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm uppercase truncate" style={anton}>{z.name}</p>
          <p className="text-white/40 text-xs">{z.bounds}</p>
          {cambiado && <p className="text-[11px]" style={{ ...font, color: ORO }}>Cambiado · antes {money(z.price)}</p>}
          {z.calles.length > 0 && (
            <p className="text-white/25 text-[10px] leading-snug mt-0.5">{z.calles.join('  ·  ')}</p>
          )}
        </div>
        {cambiado && <BotonCarta onClick={() => { setReinicio((n) => n + 1); onChange(undefined) }} />}
        <InputPrecio
          key={reinicio}
          className="w-28 shrink-0"
          valor={valor}
          placeholder={textoDePrecio(z.price)}
          onChange={(n) => onChange(n ?? undefined)}
          onMalo={setMalo}
        />
      </div>
      {malo && <div className="mt-2">{avisoPrecioMalo}</div>}
    </div>
  )
}

// Una burger de la carta: cerrada muestra sus precios; abierta deja cambiarlos
function TarjetaBurger({ b, c, onChange }) {
  const [abierta, setAbierta] = useState(false)
  const precioDe = (s) => c.prices?.[s.key] ?? b.prices[s.key]
  const modificada = SIZES.some((s) => c.prices?.[s.key] != null && c.prices[s.key] !== b.prices[s.key]) ||
    (c.description && c.description !== b.description)
  return (
    <div
      className="rounded-xl mb-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${modificada ? 'rgba(240,200,50,0.4)' : 'rgba(255,255,255,0.08)'}` }}
    >
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="w-full flex items-center justify-between gap-3 p-4 text-left min-h-[64px]"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-white uppercase truncate" style={anton}>{b.name}</span>
            {modificada && (
              <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ ...font, color: '#000', backgroundColor: ORO }}>
                cambiada
              </span>
            )}
            {c.soldOut && (
              <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ ...font, color: '#F87171', border: '1px solid rgba(248,113,113,0.5)' }}>
                sin stock
              </span>
            )}
          </span>
          <span className="block text-white/45 text-[12px] mt-1" style={font}>
            {SIZES.map((s) => `${s.label} ${money(precioDe(s))}`).join(' · ')}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-white/40 transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && (
        <div className="px-4 pb-4">
          {SIZES.map((s) => (
            <EntradaPrecio
              key={s.key}
              etiqueta={s.label}
              defecto={b.prices[s.key]}
              valor={c.prices?.[s.key]}
              onChange={(v) => onChange({ prices: { ...(c.prices || {}), [s.key]: v == null ? undefined : v } })}
            />
          ))}
          <label className="flex flex-col gap-1.5 mt-3">
            <span className={labelCls}>Descripción</span>
            <textarea
              rows={3}
              className={inputCls + ' resize-y'}
              placeholder={b.description}
              value={c.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
            />
            <span className="text-white/30 text-[11px]">Vacía = se usa la descripción de la carta.</span>
          </label>
        </div>
      )}
    </div>
  )
}

// Resumen de la noche: estado del local y lo que va facturado hoy
function ResumenHoy({ cfg, stats, sinStock, sinGuardar, onVerNumeros }) {
  const s = getStatus(new Date(), todayOverride(cfg))
  const color = s.open ? '#4ADE80' : '#F87171'
  const hoy = hoyART()
  const pedidos = (stats?.orders || []).filter((o) => o.d === hoy)
  const k = kpis(pedidos)
  const ultimo = pedidos[0]?.at ? horaCorta(new Date(pedidos[0].at)) : null
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px]"
          style={{ ...font, color, backgroundColor: s.open ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${color}55` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          {s.open ? `Abierto · hasta ${s.closesAt}` : s.opensAt ? `Cerrado · abre ${s.opensLabel} ${s.opensAt}` : 'Cerrado'}
        </span>
        {sinStock > 0 && (
          <span className="px-3 py-1.5 rounded-full text-[12px]" style={{ ...font, color: '#F87171', border: '1px solid rgba(248,113,113,0.4)' }}>
            {sinStock} sin stock
          </span>
        )}
        {cfg.today.deliveryOff && todayOverride(cfg) && (
          <span className="px-3 py-1.5 rounded-full text-[12px] text-white/70" style={{ ...font, border: '1px solid rgba(255,255,255,0.2)' }}>
            Hoy sin envíos
          </span>
        )}
      </div>
      {sinGuardar && (
        <p className="text-[11px] mb-3" style={{ ...font, color: ORO }}>Esto refleja tus cambios, todavía sin guardar.</p>
      )}

      {MOSTRAR_NUMEROS && (
        stats ? (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              {[['Pedidos hoy', String(k.pedidos)], ['Facturado hoy', money(k.ventas)], ['Ticket prom.', k.pedidos ? money(k.ticket) : '—']].map(([et, v]) => (
                <div key={et} className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-white/45 text-[10px] tracking-[0.12em] uppercase" style={font}>{et}</p>
                  <p className="text-white text-[19px] leading-none mt-1.5 tabular-nums" style={anton}>{v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-white/40 text-[11px]" style={font}>
                {ultimo ? `Último pedido a las ${ultimo}` : 'Todavía no entró ningún pedido hoy'}
              </span>
              <button
                type="button"
                onClick={onVerNumeros}
                className="inline-flex items-center gap-1.5 min-h-[44px] text-[12px]"
                style={{ ...font, color: ORO }}
              >
                Ver todo el detalle <ArrowRight size={13} />
              </button>
            </div>
          </>
        ) : (
          <p className="text-white/35 text-[12px]" style={font}>Cargando los pedidos de hoy…</p>
        )
      )}
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
  promos: Array.isArray(c?.promos) ? [...c.promos] : [],
})

// Las promos como las va a guardar el servidor (limpias): sirve para saber si hay
// cambios que todavía no están en el sitio
const claveDePromos = (lista) =>
  JSON.stringify((lista || []).map((p) => { const r = validatePromo(p); return r.ok ? r.promo : p }))

// ─── ¿Qué cambió desde lo último guardado? ───────────────────────────────
// Se compara una versión "limpia" (sin vacíos, sin `false`, claves ordenadas): tocar un
// interruptor y volver a dejarlo como estaba NO cuenta como cambio.
const limpiar = (v) => {
  if (Array.isArray(v)) return v.map(limpiar)
  if (v && typeof v === 'object') {
    const o = {}
    for (const k of Object.keys(v).sort()) {
      const x = limpiar(v[k])
      const vacio = x === undefined || x === false || x === '' || x === null ||
        (x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 0)
      if (!vacio) o[k] = x
    }
    return o
  }
  return v
}
// Las excepciones de hoy sin nada cargado equivalen a "ninguna", aunque tengan la fecha puesta
const hoyEfectivo = (t) => (t && (t.closed || t.opensAt || t.closesAt || t.deliveryOff || t.note) ? t : {})
const sinStockDe = (burgers) => limpiar(Object.fromEntries(Object.entries(burgers || {}).map(([id, b]) => [id, !!b?.soldOut])))
const sinSoldOut = (burgers) => limpiar(Object.fromEntries(Object.entries(burgers || {}).map(([id, b]) => [id, { ...b, soldOut: undefined }])))
// Una huella por pestaña, para marcar cuál tiene cambios sin guardar
const huellas = (c) => ({
  hoy: JSON.stringify(limpiar([hoyEfectivo(c.today), c.stock, c.ticker, sinStockDe(c.burgers)])),
  promos: JSON.stringify(limpiar(c.promos)),
  menu: JSON.stringify(limpiar([sinSoldOut(c.burgers), c.prices])),
  envios: JSON.stringify(limpiar(c.zones)),
})

export default function Admin() {
  const [logueado, setLogueado] = useState(panel.estaLogueado())
  const [avisoLogin, setAvisoLogin] = useState('')
  const [cfg, setCfg] = useState(null)
  const [base, setBase] = useState(null)     // la config como está guardada (para saber qué cambió)
  const [sha, setSha] = useState(null)
  const [tab, setTab] = useState('hoy')
  const [estado, setEstado] = useState('')   // '', 'guardando', 'ok', o el mensaje de error
  const [intento, setIntento] = useState(0)  // sube con "Reintentar"
  const [confirmaDescartar, setConfirmaDescartar] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [statsAt, setStatsAt] = useState(null)
  const [recargando, setRecargando] = useState(false)
  const [promosBase, setPromosBase] = useState('[]')      // las promos como están guardadas
  const [verErroresPromos, setVerErroresPromos] = useState(false) // marcar en rojo lo que falta
  const ultimaCarga = useRef(0)

  // Si la clave ya no sirve (la cambiaron), vuelve a la pantalla de entrada
  const clavePerdida = useCallback((e) => {
    if (e?.status !== 401) return false
    panel.salir()
    setAvisoLogin('La clave cambió o venció. Volvé a entrar.')
    setLogueado(false)
    return true
  }, [])

  const traerStats = useCallback(async () => {
    ultimaCarga.current = Date.now()
    try {
      setStats(await panel.readStats())
      setStatsError('')
      setStatsAt(new Date())
    } catch (e) {
      if (clavePerdida(e)) return
      setStatsError(e.message) // se queda con lo que tenía
    }
  }, [clavePerdida])

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
        const inicial = normalizar(content)
        setCfg(inicial)
        setBase(inicial)
        setEstado('')
        setPromosBase(claveDePromos(inicial.promos))
        if (MOSTRAR_NUMEROS) traerStats()
      } catch (e) {
        if (!vivo || clavePerdida(e)) return
        setEstado(e.message)
      }
    })()
    return () => { vivo = false }
  }, [logueado, intento, traerStats, clavePerdida])

  // Mientras el panel está a la vista (pestañas Hoy y Números) los pedidos se refrescan
  // solos; al volver a abrir la pantalla del celular, también si pasó más de un minuto.
  const verStats = MOSTRAR_NUMEROS && logueado && !!cfg && (tab === 'hoy' || tab === 'stats')
  useEffect(() => {
    if (!verStats) return undefined
    const t = setInterval(() => { if (document.visibilityState === 'visible') traerStats() }, REFRESCO_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaCarga.current > 60_000) traerStats()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver) }
  }, [verStats, traerStats])

  // ¿Hay algo sin guardar? Avisa también si intentan cerrar la página.
  const cambios = cfg && base ? (() => {
    const a = huellas(cfg)
    const b = huellas(base)
    return Object.fromEntries(Object.keys(a).map((k) => [k, a[k] !== b[k]]))
  })() : {}
  const hayCambios = Object.values(cambios).some(Boolean)
  useEffect(() => {
    if (!hayCambios) return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  if (!logueado) return <Login aviso={avisoLogin} onOk={() => { setAvisoLogin(''); setLogueado(true) }} />
  if (!cfg) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center" style={font}>
        <p className={estado ? 'text-red-300 text-sm max-w-sm' : 'text-white/60'}>{estado || 'Cargando…'}</p>
        {estado && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEstado(''); setIntento((n) => n + 1) }}
              className="px-6 min-h-[44px] rounded-full text-black text-sm tracking-widest uppercase"
              style={{ ...anton, backgroundColor: ORO }}
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => { panel.salir(); setLogueado(false) }}
              className="px-6 min-h-[44px] rounded-full text-sm uppercase tracking-wide text-white/65"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Salir
            </button>
          </div>
        )}
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
    // Una promo descuenta plata en el carrito: no se guarda ninguna incompleta ni
    // con un precio que parece un error de tipeo ("15" en vez de "15.000")
    const promos = validatePromoList(cfg.promos)
    const problema = promos.ok ? cheapPromoError(promos.promos) : promos.error
    if (problema) {
      setTab('promos')
      setVerErroresPromos(true)
      setEstado(`${problema} Corregí lo que está marcado en rojo para poder guardar.`)
      // lleva la pantalla al primer campo con problema (esperando a que se dibuje la pestaña)
      setTimeout(() => {
        document.querySelector('[id^="promo-"] [role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 80)
      return
    }
    setEstado('guardando')
    try {
      const nuevo = { ...cfg, promos: promos.promos, updatedAt: new Date().toISOString() }
      const nuevoSha = await panel.saveConfig(nuevo, sha, mensaje)
      setSha(nuevoSha)
      setCfg(nuevo)
      setBase(nuevo)
      setPromosBase(claveDePromos(nuevo.promos))
      setVerErroresPromos(false)
      setConfirmaDescartar(false)
      setEstado('ok')
      setTimeout(() => setEstado((e) => (e === 'ok' ? '' : e)), 3500)
    } catch (e) {
      if (clavePerdida(e)) return
      setEstado(e.message)
    }
  }

  const descartar = () => {
    setCfg(base)
    setVerErroresPromos(false)
    setConfirmaDescartar(false)
    setEstado('')
  }

  const burgersSin = Object.values(cfg.burgers || {}).filter((b) => b?.soldOut).length
  const extrasSin = EXTRAS.filter((e) => cfg.stock[extraKey(e)]).length
  const sinStock = burgersSin + Object.keys(cfg.stock || {}).length
  const sinStockDrinks = DRINKS.flatMap((d) => d.sizes.map((s) => drinkKey(d, s))).filter((k) => cfg.stock[k]).length
  const sinStockSabores = DRINKS.flatMap((d) => (d.flavors || []).map(flavorKey)).filter((k) => cfg.stock[k]).length
  const TABS = [['hoy', 'Hoy'], ['promos', 'Promos'], ['menu', 'Menú'], ['envios', 'Envíos'], ...(MOSTRAR_NUMEROS ? [['stats', 'Números']] : [])]
  const primeraConCambios = TABS.find(([k]) => cambios[k])?.[0]
  const irA = (k) => { setTab(k); window.scrollTo({ top: 0 }) }

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 pb-6" style={font}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pt-6 mb-4">
          <div className="min-w-0">
            <h1 className="text-3xl text-white uppercase leading-none" style={anton}>
              Mr. White <span className="text-[#F0C832]">Panel</span>
            </h1>
            <p className="inline-flex items-center gap-1.5 text-[11px] mt-2" style={{ color: '#4ADE80' }}>
              <Zap size={12} /> Los cambios se ven en la web en segundos
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/" className="inline-flex items-center min-h-[44px] px-2 text-sm text-white/55 hover:text-white">Ver sitio →</a>
            <button
              onClick={() => {
                if (hayCambios && !window.confirm('Tenés cambios sin guardar. Si salís se pierden. ¿Salir igual?')) return
                panel.salir(); setLogueado(false)
              }}
              className="px-4 py-2 min-h-[44px] rounded-full text-sm uppercase tracking-wide text-white/65 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Pestañas: quedan fijas arriba para cambiar de sección sin volver al principio */}
        <div
          className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 mb-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }} role="tablist">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => irA(k)}
                className="relative px-1 py-2 min-h-[44px] rounded-full text-[12px] sm:text-sm tracking-wider uppercase"
                style={{
                  ...anton,
                  backgroundColor: tab === k ? ORO : 'transparent',
                  color: tab === k ? '#000' : 'rgba(255,255,255,0.6)',
                  border: tab === k ? '1px solid transparent' : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {label}
                {cambios[k] && (
                  <span
                    className="absolute top-1 right-2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: tab === k ? '#DC2626' : ORO }}
                    title="Cambios sin guardar"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── HOY ─────────────────────────────────────────────── */}
        {tab === 'hoy' && (
          <>
            <ResumenHoy
              cfg={cfg}
              stats={stats}
              sinStock={sinStock}
              sinGuardar={!!cambios.hoy}
              onVerNumeros={() => irA('stats')}
            />

            <Seccion
              titulo="Hoy"
              nota={`Excepciones solo para hoy. Mañana vuelve solo al horario de siempre (${scheduleSummary().find((h) => !h.closed)?.hours || '—'}).`}
            >
              <label className="flex items-center gap-3 mb-2 min-h-[44px] cursor-pointer">
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

              <label className="flex items-center gap-3 mb-4 min-h-[44px] cursor-pointer">
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
                <span className={labelCls}>Aviso para los clientes (opcional)</span>
                <input
                  value={cfg.today.note || ''}
                  onChange={(e) => setHoy({ note: e.target.value })}
                  className={inputCls}
                  placeholder="Ej: hoy demoras de 40 min"
                />
              </label>

              <button
                onClick={() => setCfg((c) => ({ ...c, today: { ...DEFAULT_CONFIG.today } }))}
                className="min-h-[44px] text-xs text-white/45 hover:text-white/80"
              >
                Limpiar excepciones de hoy
              </button>
            </Seccion>

            <Seccion
              titulo="Sin stock"
              extra={sinStock > 0 ? <span className="text-xs" style={{ ...font, color: '#F87171' }}>{sinStock} marcado{sinStock === 1 ? '' : 's'}</span> : null}
              nota="Lo que marques acá aparece como “Sin stock” en la web y no se puede pedir. Tocá de nuevo para volver a habilitarlo."
            >
              <Plegable titulo="Burgers" badge={burgersSin ? `${burgersSin} sin stock` : ''} abierto0>
                {BURGERS.map((b) => (
                  <Interruptor
                    key={b.id}
                    nombre={b.name}
                    sinStock={!!cfg.burgers?.[b.id]?.soldOut}
                    onToggle={() => setBurger(b.id, { soldOut: !cfg.burgers?.[b.id]?.soldOut })}
                  />
                ))}
              </Plegable>

              <Plegable titulo="Extras" badge={extrasSin ? `${extrasSin} sin stock` : ''} abierto0>
                {EXTRAS.map((e) => (
                  <Interruptor
                    key={e.id}
                    nombre={e.name}
                    detalle={e.desc}
                    sinStock={!!cfg.stock[extraKey(e)]}
                    onToggle={() => setStock(extraKey(e), !cfg.stock[extraKey(e)])}
                  />
                ))}
              </Plegable>

              <Plegable titulo="Bebidas (por tamaño)" badge={sinStockDrinks ? `${sinStockDrinks} sin stock` : ''} abierto0={sinStockDrinks > 0}>
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
              </Plegable>

              <Plegable titulo="Sabores" badge={sinStockSabores ? `${sinStockSabores} sin stock` : ''} abierto0={sinStockSabores > 0}>
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
              </Plegable>
            </Seccion>

            <Seccion
              titulo="Cartel de arriba"
              nota="El texto que corre en la barra roja. Vacío = el de siempre, o el de la promo del día si hay una (pestaña Promos). Si escribís algo acá, ese texto tapa el anuncio de la promo."
            >
              <input
                value={cfg.ticker || ''}
                onChange={(e) => set({ ticker: e.target.value })}
                className={inputCls}
                placeholder="Ej: HOY 2X1 EN SIMPLES · PEDÍ POR WHATSAPP"
              />
            </Seccion>
          </>
        )}

        {/* ─── PROMOS ──────────────────────────────────────────── */}
        {tab === 'promos' && (
          <AdminPromos
            promos={cfg.promos}
            onChange={(promos) => {
              set({ promos })
              // un error viejo de "promo incompleta" ya no vale una vez que se edita
              setEstado((e) => (e && !['ok', 'guardando'].includes(e) ? '' : e))
            }}
            cfg={cfg}
            hoy={hoyStr()}
            sinGuardar={claveDePromos(cfg.promos) !== promosBase}
            verErrores={verErroresPromos}
          />
        )}

        {/* ─── MENÚ ────────────────────────────────────────────── */}
        {tab === 'menu' && (
          <>
            <Seccion titulo="Burgers" nota="Tocá una burger para cambiarle el precio o la descripción. Si dejás un precio vacío se usa el de la carta (el que figura en gris).">
              {BURGERS.map((b) => (
                <TarjetaBurger key={b.id} b={b} c={cfg.burgers?.[b.id] || {}} onChange={(patch) => setBurger(b.id, patch)} />
              ))}
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
            nota="Cada zona llega hasta cierta distancia del local. Cambiá el precio de cada una; para mover los límites o sumar calles se vuelve a armar el mapa."
          >
            {ZONES.map((z) => (
              <FilaZona
                key={z.id}
                z={z}
                valor={cfg.zones?.[z.id]?.price}
                onChange={(price) => set({ zones: { ...cfg.zones, [z.id]: { price } } })}
              />
            ))}
            <p className="text-white/35 text-[11px] mt-3">
              Precio actual en el sitio: {ZONES.map((z) => `${z.name} ${formatZonePrice(z)}`).join(' · ')}
            </p>
          </Seccion>
        )}

        {/* ─── NÚMEROS ─────────────────────────────────────────── */}
        {MOSTRAR_NUMEROS && tab === 'stats' && (
          stats ? (
            <AdminStats
              stats={stats}
              onReload={recargarStats}
              recargando={recargando}
              actualizado={statsAt}
              errorRecarga={statsError}
              puedeBorrar
              onDelete={async (id) => {
                await panel.deleteOrder(id)
                await traerStats()
              }}
            />
          ) : (
            <div className="rounded-2xl p-5 mb-4 text-center" style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
              {statsError ? (
                <>
                  <p className="text-red-300 text-sm mb-3" role="alert">{statsError}</p>
                  <button
                    type="button"
                    onClick={recargarStats}
                    className="px-6 min-h-[44px] rounded-full text-black text-sm tracking-widest uppercase"
                    style={{ ...anton, backgroundColor: ORO }}
                  >
                    Reintentar
                  </button>
                </>
              ) : (
                <p className="text-white/55 text-sm">Cargando los pedidos…</p>
              )}
            </div>
          )
        )}

        {/* Guardar */}
        {tab !== 'stats' && (
          <div className="sticky bottom-0 mt-6 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-8 pb-4 bg-gradient-to-t from-black via-black/95 to-transparent">
            {hayCambios && estado !== 'guardando' && estado !== 'ok' && (
              <div className="flex items-center justify-between gap-3 mb-2 px-1">
                <span className="inline-flex items-center gap-2 text-[12px]" style={{ ...font, color: ORO }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ORO }} /> Tenés cambios sin guardar
                </span>
                {confirmaDescartar ? (
                  <span className="flex items-center gap-1.5" style={font}>
                    <button type="button" onClick={descartar} className="px-3 min-h-[36px] rounded-full text-[11px] text-white" style={{ backgroundColor: '#DC2626' }}>
                      Sí, descartar
                    </button>
                    <button type="button" onClick={() => setConfirmaDescartar(false)} className="px-3 min-h-[36px] rounded-full text-[11px] text-white/70" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      No
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmaDescartar(true)} className="min-h-[36px] px-2 text-[12px] text-white/55 hover:text-white" style={font}>
                    Descartar
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => guardar(`chore(config): cambios desde el panel (${tab})`)}
              disabled={estado === 'guardando' || (!hayCambios && estado !== 'ok')}
              className="w-full py-4 min-h-[52px] rounded-full text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-colors"
              style={{
                ...anton,
                color: hayCambios || estado === 'ok' || estado === 'guardando' ? '#000' : 'rgba(255,255,255,0.4)',
                backgroundColor: estado === 'ok' ? '#4ADE80' : hayCambios || estado === 'guardando' ? ORO : '#1c1c1c',
                boxShadow: hayCambios ? '0 12px 32px -10px rgba(240,200,50,0.5)' : 'none',
              }}
            >
              {estado === 'guardando' ? (
                <><RefreshCw size={15} className="animate-spin" /> Guardando…</>
              ) : estado === 'ok' ? (
                <><Check size={16} strokeWidth={3} /> Guardado — ya está en la web</>
              ) : hayCambios ? (
                'Guardar cambios'
              ) : (
                <><Check size={16} strokeWidth={3} /> Todo guardado</>
              )}
            </button>
            {estado && !['ok', 'guardando'].includes(estado) && (
              <div
                className="mt-3 rounded-xl px-3 py-2"
                style={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(248,113,113,0.3)' }}
              >
                <p className="text-red-300 text-sm flex items-start gap-2" role="alert">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {estado}
                </p>
                {/* Si otra persona guardó antes, lo único que sirve es volver a cargar el panel */}
                {estado.includes('Recargá el panel') && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 w-full min-h-[44px] rounded-full text-xs uppercase tracking-widest text-white"
                    style={{ ...anton, border: '1px solid rgba(255,255,255,0.25)' }}
                  >
                    Recargar el panel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Estando en Números con cambios sin guardar: recordatorio para volver a guardarlos */}
        {tab === 'stats' && hayCambios && primeraConCambios && (
          <div className="sticky bottom-0 mt-4 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-8 pb-4 bg-gradient-to-t from-black via-black/95 to-transparent">
            <button
              type="button"
              onClick={() => irA(primeraConCambios)}
              className="w-full min-h-[48px] rounded-full text-[13px] flex items-center justify-center gap-2"
              style={{ ...font, color: '#000', backgroundColor: ORO, fontWeight: 600 }}
            >
              Tenés cambios sin guardar · Ir a guardarlos <ArrowRight size={14} />
            </button>
          </div>
        )}

        {cfg.updatedAt && (
          <p className="text-white/30 text-[11px] mt-8 text-center">
            Último cambio guardado: {fechaHora(cfg.updatedAt)}
          </p>
        )}
      </div>
    </div>
  )
}
