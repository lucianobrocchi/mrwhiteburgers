import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Download, RefreshCw, Trash2, Sparkles, ExternalLink, Info,
} from 'lucide-react'
import {
  calcular, frases, aCSV, RANGOS, DIAS_CORTO, hoyART, porMes, recorrido, detalleDiario, DIAS_LARGO, envioDe,
} from '../lib/statsCalc'
import { generarDemo } from '../lib/statsDemo'
import { sourceLabel } from '../lib/source'
import { BURGERS_BASE as BURGERS } from '../lib/menuBase'
import { EXTRAS, DRINKS } from '../lib/catalog'

const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }
const ORO = '#F0C832'
const VERDE = '#4ADE80'
const ROJO = '#F87171'

const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const num = (n) => Math.round(n || 0).toLocaleString('es-AR')
// $38.000 → "38k", $1.250.000 → "1,2M": para el número sobre cada barra
const corto = (n) => {
  const v = Math.round(n || 0)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(v)
}
const hora = (at) =>
  new Date(at).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
// "2× OBRERA doble (+ Bacon, 2 Cheddar)" / "1× Coca-Cola 1,5 L"
const lineaItem = (i) => {
  const ex = (i.x || []).length ? ` (+${i.x.map((e) => (e.q > 1 ? `${e.q} ` : '') + e.n).join(', ')})` : ''
  return `${i.q}× ${i.n}${i.k === 'd' ? ' ' + i.sl : ' ' + (i.sl || i.s)}${ex}`
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const nombreMes = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const fechaLarga = (ds) =>
  new Date(`${ds}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

// ─── Piezas visuales ─────────────────────────────────────────────────────
function Tarjeta({ titulo, subtitulo, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 mb-4 ${className}`}
      style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {titulo && (
        <div className="mb-4">
          <h3 className="text-lg text-white uppercase leading-tight" style={anton}>{titulo}</h3>
          {subtitulo && <p className="text-white/40 text-xs mt-1" style={font}>{subtitulo}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

// ▲ 25% / ▼ 8% contra el período anterior. Si no hay con qué comparar, no muestra nada.
function Variacion({ v }) {
  if (v == null || !Number.isFinite(v)) return null
  const sube = v >= 0
  const Icono = sube ? TrendingUp : TrendingDown
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
      style={{ ...font, color: sube ? VERDE : ROJO, backgroundColor: sube ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)' }}
    >
      <Icono size={11} strokeWidth={2.5} />
      {sube ? '+' : ''}{Math.round(v)}%
    </span>
  )
}

function Dato({ etiqueta, valor, variacion, nota }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-white/45 text-[10px] tracking-[0.16em] uppercase" style={font}>{etiqueta}</p>
      <p className="text-white text-[28px] leading-none mt-2" style={anton}>{valor}</p>
      <div className="flex items-center gap-2 mt-2 min-h-[20px]">
        <Variacion v={variacion} />
        {nota && <span className="text-white/35 text-[11px]" style={font}>{nota}</span>}
      </div>
    </div>
  )
}

// Barras verticales (pedidos por día, por hora, por día de la semana)
function Barras({ datos, alto = 120, mostrarValores = true, resaltar, formato = String }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <div className="flex items-end gap-[3px] w-full" style={{ height: alto + 34 }}>
      {datos.map((d, i) => {
        const h = d.valor > 0 ? Math.max(4, (d.valor / max) * alto) : 2
        const activo = resaltar ? resaltar(d, i) : false
        return (
          <div key={d.clave ?? i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={d.titulo}>
            <span
              className="text-[10px] tabular-nums leading-none mb-1"
              style={{ ...font, color: 'rgba(255,255,255,0.6)', visibility: mostrarValores && d.valor > 0 ? 'visible' : 'hidden' }}
            >
              {formato(d.valor)}
            </span>
            <div
              className="w-full rounded-t-[4px]"
              style={{
                height: h,
                backgroundColor: d.valor === 0 ? 'rgba(255,255,255,0.07)' : activo ? ORO : 'rgba(240,200,50,0.45)',
                transition: 'height .5s cubic-bezier(.16,1,.3,1)',
              }}
            />
            <span
              className="text-[10px] leading-none mt-1.5 truncate w-full text-center"
              style={{ ...font, color: activo ? ORO : 'rgba(255,255,255,0.4)', fontWeight: activo ? 700 : 400 }}
            >
              {d.etiqueta}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Barra horizontal de ranking
function Ranking({ nombre, valor, max, derecha, color = ORO, detalle }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-white text-[13px] truncate" style={{ ...font, fontWeight: 500 }}>{nombre}</span>
        <span className="text-white/70 text-[13px] shrink-0 tabular-nums" style={font}>{derecha}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? Math.max(2, (valor / max) * 100) : 0}%`, backgroundColor: color, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }}
        />
      </div>
      {detalle && <p className="text-white/35 text-[11px] mt-1" style={font}>{detalle}</p>}
    </div>
  )
}

// Barra partida en tramos (tamaños, envío vs retiro)
function Partida({ tramos }) {
  const total = tramos.reduce((s, t) => s + t.valor, 0)
  if (!total) return <p className="text-white/35 text-sm" style={font}>Sin datos todavía.</p>
  return (
    <>
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
        {tramos.filter((t) => t.valor > 0).map((t) => (
          <div key={t.nombre} style={{ width: `${(t.valor / total) * 100}%`, backgroundColor: t.color }} title={`${t.nombre}: ${t.valor}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {tramos.map((t) => (
          <span key={t.nombre} className="inline-flex items-center gap-1.5 text-[12px] text-white/65" style={font}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            {t.nombre} <b className="text-white font-semibold">{t.valor}</b>
            <span className="text-white/35">({Math.round((t.valor / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </>
  )
}

// Catálogo para armar los datos de ejemplo con los mismos productos y precios reales
function catalogoDemo() {
  const peso = { 15: 0.34, lata: 0.26, 225: 0.22, medio: 0.18 }
  const factor = { coca: 1, aquarius: 0.5, goyeneche: 0.3 }
  const bebidas = []
  for (const drink of DRINKS) {
    for (const size of drink.sizes) {
      const opciones = drink.flavors || [null]
      for (const flavor of opciones) {
        const f = flavor ? (flavor.id === 'coca' ? 0.65 : 0.35) : 1
        bebidas.push({ drink, size, flavor, peso: (peso[size.id] ?? 0.2) * (factor[drink.id] ?? 0.3) * f })
      }
    }
  }
  return { burgers: BURGERS, extras: EXTRAS, bebidas }
}

// ─── Pantalla ────────────────────────────────────────────────────────────
export default function AdminStats({ stats, onReload, onDelete, puedeBorrar, recargando, actualizado, errorRecarga }) {
  const [rango, setRango] = useState('7')
  const [demo, setDemo] = useState(false)
  const [borrando, setBorrando] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [medida, setMedida] = useState('ventas') // el gráfico por día: en pesos o en cantidad de pedidos

  const orders = useMemo(
    () => (demo ? generarDemo({ ...catalogoDemo() }) : stats?.orders || []),
    [demo, stats],
  )
  const S = useMemo(() => calcular(orders, rango), [orders, rango])
  const dichos = useMemo(() => frases(S, sourceLabel), [S])
  const meses = useMemo(() => porMes(orders), [orders])
  const detalle = useMemo(() => detalleDiario(orders, S.rango.desde, S.rango.hasta), [orders, S])
  const [diaAbierto, setDiaAbierto] = useState('')
  const R = useMemo(() => recorrido(stats?.events, S.rango.desde, S.rango.hasta), [stats, S])

  const hayDatos = orders.length > 0

  const descargar = () => {
    const blob = new Blob([aCSV(orders)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pedidos-mr-white-${hoyART()}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  // Borrar en dos toques dentro de la propia fila (el window.confirm del navegador
  // a veces no aparece) y mostrando el error si el servidor lo rechaza.
  const [confirmar, setConfirmar] = useState('')
  const [errorBorrar, setErrorBorrar] = useState(null) // { id, msg }
  const borrar = async (o) => {
    setConfirmar('')
    setErrorBorrar(null)
    setBorrando(o.id)
    try {
      await onDelete(o.id)
    } catch (e) {
      setErrorBorrar({ id: o.id, msg: e?.message || 'No se pudo borrar. Probá de nuevo.' })
    } finally {
      setBorrando('')
    }
  }

  // ─── Sin datos todavía ───
  if (!hayDatos) {
    return (
      <>
        <Tarjeta titulo="Todavía no hay pedidos registrados">
          <p className="text-white/60 text-sm leading-relaxed mb-4" style={font}>
            Cada vez que un cliente toca <b className="text-white">“Pedir por WhatsApp”</b> en la web, el pedido
 queda anotado acá: qué pidió, cuánto, a qué zona y de dónde
            llegó. No se guarda nombre, teléfono ni dirección.
          </p>
          <p className="text-white/45 text-xs leading-relaxed mb-5" style={font}>
            Cuenta los pedidos que los clientes <b>envían</b>; no confirma si después se concretó o se pagó.
          </p>
          <button
            type="button"
            onClick={() => setDemo(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm uppercase tracking-widest text-black"
            style={{ ...anton, backgroundColor: ORO }}
          >
            <Sparkles size={15} /> Ver cómo queda (datos de ejemplo)
          </button>
        </Tarjeta>
        <Pie />
      </>
    )
  }

  const ultimos = verTodos ? orders : orders.slice(0, 10)
  const maxBurger = Math.max(1, ...S.burgers.map((b) => b.unidades))
  const maxExtra = Math.max(1, ...S.extras.ranking.map((e) => e.unidades))
  const maxBebida = Math.max(1, ...S.bebidas.ranking.map((b) => b.unidades))
  const muchosDias = S.porDia.length > 14

  return (
    <>
      {demo && (
        <div
          className="rounded-2xl p-4 mb-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.45)' }}
        >
          <Info size={18} className="shrink-0 mt-0.5" style={{ color: '#FB923C' }} />
          <div className="flex-1">
            <p className="text-[#FB923C] text-sm font-semibold" style={font}>DATOS DE EJEMPLO</p>
            <p className="text-white/70 text-xs mt-1 leading-relaxed" style={font}>
              Así se va a ver el panel cuando entren pedidos. Estos números están inventados, no son ventas reales.
            </p>
            <button
              type="button"
              onClick={() => setDemo(false)}
              className="mt-2.5 text-xs underline text-white/80 hover:text-white"
              style={font}
            >
              Salir del ejemplo
            </button>
          </div>
        </div>
      )}

      {/* ─── Filtros ─── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1.5 p-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRango(r.id)}
              className="px-3.5 py-1.5 rounded-full text-xs tracking-wider uppercase"
              style={{
                ...anton,
                backgroundColor: rango === r.id ? ORO : 'transparent',
                color: rango === r.id ? '#000' : 'rgba(255,255,255,0.6)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {!demo && actualizado && (
          <span className="text-white/30 text-[11px]" style={font}>
            Actualizado {actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {!demo && onReload && (
          <button
            type="button"
            onClick={onReload}
            aria-label="Actualizar"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <RefreshCw size={15} className={recargando ? 'animate-spin' : ''} />
          </button>
        )}
        <button
          type="button"
          onClick={descargar}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs uppercase tracking-wider text-white/70 hover:text-white"
          style={{ ...font, border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {errorRecarga && !demo && (
        <p className="text-[12px] mb-3" style={{ ...font, color: ROJO }} role="alert">
          No se pudo actualizar ({errorRecarga}). Se muestran los últimos datos que llegaron.
        </p>
      )}
      <p className="text-white/35 text-[11px] mb-3" style={font}>
        {fechaLarga(S.rango.desde)}{S.rango.desde !== S.rango.hasta && <> al {fechaLarga(S.rango.hasta)}</>}
        {S.previo && ' · comparado con el período anterior'}
      </p>

      {S.vacio ? (
        <Tarjeta>
          <p className="text-white/55 text-sm" style={font}>No hubo pedidos en este período. Probá con un rango más largo.</p>
        </Tarjeta>
      ) : (
        <>
          {/* ─── Números principales ─── */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Dato etiqueta="Pedidos" valor={num(S.actual.pedidos)} variacion={S.delta.pedidos} />
            <Dato etiqueta="Ventas" valor={money(S.actual.ventas)} variacion={S.delta.ventas} />
            <Dato etiqueta="Ticket promedio" valor={money(S.actual.ticket)} variacion={S.delta.ticket} nota="por pedido" />
            <Dato etiqueta="Burgers vendidas" valor={num(S.actual.burgers)} variacion={S.delta.burgers} nota={S.actual.bebidas ? `+ ${num(S.actual.bebidas)} bebidas` : ''} />
          </div>

          {/* ─── De dónde sale lo facturado ─── */}
          <Tarjeta titulo="Cómo se arma lo facturado" subtitulo="Todo el período, partido en sus partes">
            {[
              ['Productos', S.desglose.productos, '#fff'],
              ['Descuentos de promos', -S.desglose.descuentos, ROJO],
              ['Envíos cobrados', S.desglose.envios, '#fff'],
            ].filter(([, v]) => v !== 0).map(([et, v, color]) => (
              <div key={et} className="flex items-baseline justify-between py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/65 text-[13px]" style={font}>{et}</span>
                <span className="tabular-nums text-[14px]" style={{ ...font, fontWeight: 600, color }}>
                  {v < 0 ? `− ${money(-v)}` : money(v)}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="text-white text-[13px] uppercase tracking-wider" style={{ ...font, fontWeight: 700 }}>Total facturado</span>
              <span className="tabular-nums" style={{ ...anton, color: ORO, fontSize: 24 }}>{money(S.desglose.total)}</span>
            </div>
            <p className="text-white/40 text-[11px] mt-3 leading-relaxed" style={font}>
              Pedido más grande {money(S.extremos.max)} · más chico {money(S.extremos.min)} · promedio por día con ventas{' '}
              {money(S.mejor.diasConPedidos ? S.actual.ventas / S.mejor.diasConPedidos : 0)}
            </p>
          </Tarjeta>

          {/* ─── Facturación día por día ─── */}
          {detalle.length > 0 && (
            <Tarjeta
              titulo="Facturación día por día"
              subtitulo="Tocá un día para ver cada pedido: hora, qué llevó, envío, promo y total"
            >
              {detalle.map((dia) => {
                const abierto = diaAbierto === dia.d
                return (
                  <div key={dia.d} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setDiaAbierto(abierto ? '' : dia.d)}
                      aria-expanded={abierto}
                      className="w-full flex items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block text-white text-[13px] first-letter:uppercase" style={{ ...font, fontWeight: 600 }}>
                          {DIAS_LARGO[dia.w]} {Number(dia.d.slice(8))} de {MESES[Number(dia.d.slice(5, 7)) - 1]}
                        </span>
                        <span className="block text-white/40 text-[11px]" style={font}>
                          {dia.pedidos} {dia.pedidos === 1 ? 'pedido' : 'pedidos'} · ticket {money(dia.ticket)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ ...anton, color: ORO, fontSize: 18 }}>{money(dia.ventas)}</span>
                    </button>
                    {abierto && (
                      <div className="pb-3">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[['Productos', dia.productos + dia.descuentos], ['Descuentos', -dia.descuentos], ['Envíos', dia.envios]].map(([et, v]) => (
                            <div key={et} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                              <p className="text-white/40 text-[10px] tracking-[0.12em] uppercase" style={font}>{et}</p>
                              <p className="text-white text-[13px] tabular-nums" style={{ ...font, fontWeight: 600 }}>{v < 0 ? `− ${money(-v)}` : money(v)}</p>
                            </div>
                          ))}
                        </div>
                        {dia.lista.map((o) => (
                          <div key={o.id} className="rounded-lg px-3 py-2.5 mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-white/90 text-[12px]" style={{ ...font, fontWeight: 700 }}>
                                {hora(o.at)} · {o.zone || 'Sin zona'}
                              </span>
                              <span className="shrink-0 tabular-nums text-white text-[14px]" style={{ ...font, fontWeight: 700 }}>{money(o.total)}</span>
                            </div>
                            <p className="text-white/70 text-[12px] leading-snug mt-1" style={font}>
                              {o.items.map(lineaItem).join(' · ')}
                            </p>
                            <p className="text-white/35 text-[11px] mt-1" style={font}>
                              Productos {money(o.subtotal)}
                              {o.discount > 0 && ` · ${o.promo ? o.promo + ' ' : 'Descuento '}−${money(o.discount)}`}
                              {envioDe(o) > 0 ? ` · Envío ${money(envioDe(o))}` : ' · Sin envío'}
                              {` · ${sourceLabel(o.src)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </Tarjeta>
          )}

          {/* ─── Lo que dicen los números ─── */}
          {dichos.length > 0 && (
            <Tarjeta titulo="Lo que dicen los números">
              <ul className="space-y-2.5">
                {dichos.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-white/75 leading-snug" style={font}>
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ORO }} />
                    {t}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {/* ─── Pedidos por día ─── */}
          {S.porDia.length > 1 && (
            <Tarjeta titulo="Día por día" subtitulo={`Mejor día: ${S.mejor.dia && S.mejor.dia.ventas > 0 ? `${fechaCorta(S.mejor.dia.d)} con ${money(S.mejor.dia.ventas)}` : '—'}`}>
              <div className="flex gap-1.5 mb-3">
                {[['ventas', 'Facturación $'], ['pedidos', 'Cantidad de pedidos']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMedida(id)}
                    className="px-3 py-1 rounded-full text-[11px]"
                    style={{
                      ...font,
                      backgroundColor: medida === id ? 'rgba(240,200,50,0.18)' : 'rgba(255,255,255,0.05)',
                      color: medida === id ? ORO : 'rgba(255,255,255,0.55)',
                      border: `1px solid ${medida === id ? 'rgba(240,200,50,0.5)' : 'transparent'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Barras
                alto={110}
                mostrarValores={!muchosDias}
                formato={medida === 'ventas' ? corto : String}
                resaltar={(d) => d.clave === hoyART()}
                datos={S.porDia.map((d, i) => ({
                  clave: d.d,
                  valor: medida === 'ventas' ? d.ventas : d.pedidos,
                  titulo: `${fechaCorta(d.d)}: ${d.pedidos} pedidos · ${money(d.ventas)}`,
                  etiqueta: muchosDias ? (i % 5 === 0 ? d.d.slice(8) : '') : `${DIAS_CORTO[d.w].charAt(0)}${d.d.slice(8)}`,
                }))}
              />
            </Tarjeta>
          )}

          {/* ─── Cuándo piden más ─── */}
          <Tarjeta titulo="¿Cuándo piden más?">
            <p className="text-white/45 text-[11px] tracking-[0.14em] uppercase mb-2" style={font}>Por día de la semana</p>
            <Barras
              alto={80}
              resaltar={(d) => d.valor > 0 && d.valor === Math.max(...S.porSemana.map((x) => x.pedidos))}
              datos={S.porSemana.map((d) => ({ clave: d.w, valor: d.pedidos, etiqueta: DIAS_CORTO[d.w], titulo: `${DIAS_CORTO[d.w]}: ${d.pedidos} pedidos · ${money(d.ventas)}` }))}
            />
            {S.porSemana.filter((d) => d.pedidos > 0).map((d) => (
              <div key={d.w} className="flex items-baseline justify-between py-1 text-[13px]" style={font}>
                <span className="text-white/70 capitalize">{DIAS_LARGO[d.w]}</span>
                <span className="text-white/50 tabular-nums">{d.pedidos} · <span className="text-white/80">{money(d.ventas)}</span></span>
              </div>
            ))}
            <p className="text-white/45 text-[11px] tracking-[0.14em] uppercase mt-5 mb-2" style={font}>Por hora</p>
            <Barras
              alto={80}
              resaltar={(d) => d.valor > 0 && d.valor === Math.max(...S.porHora.map((x) => x.pedidos))}
              datos={S.porHora.map((d) => ({ clave: d.h, valor: d.pedidos, etiqueta: `${String(d.h).padStart(2, '0')}h`, titulo: `${d.h}:00 — ${d.pedidos} pedidos` }))}
            />
          </Tarjeta>

          {/* ─── Qué se vende ─── */}
          <Tarjeta titulo="Qué se vende" subtitulo="Burgers, por unidades">
            {S.burgers.map((b, i) => (
              <Ranking
                key={b.id}
                nombre={`${i + 1}. ${b.nombre}`}
                valor={b.unidades}
                max={maxBurger}
                derecha={`${b.unidades} · ${Math.round(b.pct)}%`}
                detalle={`${money(b.ventas)} facturados · ${[['simple', 'simples'], ['doble', 'dobles'], ['triple', 'triples']].filter(([t]) => b.tam[t] > 0).map(([t, l]) => `${b.tam[t]} ${b.tam[t] === 1 ? l.slice(0, -1) : l}`).join(', ')}`}
              />
            ))}
            <p className="text-white/45 text-[11px] tracking-[0.14em] uppercase mt-5 mb-3" style={font}>Tamaños</p>
            <Partida
              tramos={[
                { nombre: 'Simple', valor: S.tamanos.simple, color: 'rgba(240,200,50,0.4)' },
                { nombre: 'Doble', valor: S.tamanos.doble, color: ORO },
                { nombre: 'Triple', valor: S.tamanos.triple, color: '#FB923C' },
              ]}
            />
          </Tarjeta>

          <Tarjeta
            titulo="Extras"
            subtitulo={S.extras.pedidos ? `${Math.round(S.extras.pct)}% de los pedidos llevó algún extra · ${money(S.extras.ventas)} facturados` : 'Todavía nadie pidió extras en este período'}
          >
            {S.extras.ranking.map((e) => (
              <Ranking key={e.id} nombre={e.nombre} valor={e.unidades} max={maxExtra} derecha={`${e.unidades} · ${money(e.ventas)}`} color="#FB923C" />
            ))}
          </Tarjeta>

          <Tarjeta
            titulo="Bebidas"
            subtitulo={S.bebidas.pedidos ? `${Math.round(S.bebidas.pct)}% de los pedidos llevó bebida · ${money(S.bebidas.ventas)} facturados` : 'Todavía nadie pidió bebidas en este período'}
          >
            {S.bebidas.ranking.map((b) => (
              <Ranking key={b.nombre} nombre={b.nombre} valor={b.unidades} max={maxBebida} derecha={`${b.unidades} · ${money(b.ventas)}`} color="#4DA3F7" />
            ))}
          </Tarjeta>

          {/* ─── Cómo reciben y de dónde vienen ─── */}
          <Tarjeta titulo="Cómo reciben el pedido">
            <Partida
              tramos={[
                { nombre: 'Con envío', valor: S.entrega.envio, color: ORO },
                { nombre: 'Retiran', valor: S.entrega.retiro, color: VERDE },
                { nombre: 'Sin elegir', valor: S.entrega.sinElegir, color: 'rgba(255,255,255,0.25)' },
              ]}
            />
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {S.zonas.map((z) => (
                <div key={z.nombre} className="flex items-baseline justify-between py-1 text-[13px]" style={font}>
                  <span className="text-white/70">{z.nombre}</span>
                  <span className="text-white/50 tabular-nums">
                    {z.pedidos} · <span className="text-white/80">{money(z.ventas)}</span>
                    {z.envios > 0 && <span className="text-white/35"> (envíos {money(z.envios)})</span>}
                  </span>
                </div>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta titulo="De dónde llegan" subtitulo="El canal por el que entró el cliente a la web">
            {S.origenes.map((o) => (
              <Ranking
                key={o.src}
                nombre={sourceLabel(o.src)}
                valor={o.pedidos}
                max={S.origenes[0].pedidos}
                derecha={`${o.pedidos} · ${Math.round(o.pct)}%`}
                detalle={`${money(o.ventas)} en ventas`}
                color={o.src === 'instagram' ? '#E1306C' : o.src === 'facebook' ? '#4C8BF5' : ORO}
              />
            ))}
          </Tarjeta>

          {S.promos.pedidos > 0 && (
            <Tarjeta titulo="Promos">
              <p className="text-white/70 text-[13px] mb-3" style={font}>
                {S.promos.pedidos} {S.promos.pedidos === 1 ? 'pedido usó' : 'pedidos usaron'} una promo, con {money(S.promos.descuentos)} de descuento en total.
              </p>
              {S.promos.ranking.map((p) => (
                <Ranking
                  key={p.nombre}
                  nombre={p.nombre}
                  valor={p.pedidos}
                  max={S.promos.ranking[0].pedidos}
                  derecha={`${p.pedidos} ${p.pedidos === 1 ? 'vez' : 'veces'}`}
                  detalle={`${money(p.ventas)} facturados · ${money(p.descuentos)} descontados`}
                />
              ))}
            </Tarjeta>
          )}
        </>
      )}

      {/* ─── Mes por mes ─── */}
      {meses.length > 0 && (
        <Tarjeta titulo="Mes por mes" subtitulo="Lo facturado en pedidos enviados por WhatsApp">
          {meses.map((m) => (
            <div key={m.ym} className="flex items-baseline justify-between gap-3 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <p className="text-white text-[13px] first-letter:uppercase" style={{ ...font, fontWeight: 600 }}>{nombreMes(m.ym)}</p>
                <p className="text-white/40 text-[11px]" style={font}>
                  {m.pedidos} {m.pedidos === 1 ? 'pedido' : 'pedidos'} · ticket {money(m.ticket)}
                  {m.mejorDia ? ` · mejor día ${fechaCorta(m.mejorDia.d)} (${money(m.mejorDia.ventas)})` : ''}
                </p>
              </div>
              <p className="shrink-0 tabular-nums" style={{ ...anton, color: ORO, fontSize: 18 }}>{money(m.ventas)}</p>
            </div>
          ))}
        </Tarjeta>
      )}

      {/* ─── Recorrido de la web ─── */}
      {!demo && (
        <Tarjeta
          titulo="Recorrido de la web"
          subtitulo="Dónde se cae la gente entre que entra y pide (cada paso cuenta visitas distintas)"
        >
          {!R.hayDatos ? (
            <p className="text-white/55 text-[13px] leading-relaxed" style={font}>
              El recorrido de las visitas (cuántos entran, agregan al carrito y piden) se mide en Google Analytics: Explorar → Exploración de embudo.
            </p>
          ) : (
            <>
              {R.pasos.map((p, i) => (
                <Ranking
                  key={p.k}
                  nombre={p.label}
                  valor={p.n}
                  max={R.pasos[0].n}
                  derecha={i === 0 ? num(p.n) : `${num(p.n)} · ${Math.round(R.pasos[0].n ? (p.n / R.pasos[0].n) * 100 : 0)}%`}
                  detalle={i > 0 && R.pasos[i - 1].n > 0 ? `${Math.round((p.n / R.pasos[i - 1].n) * 100)}% de los que llegaron al paso anterior` : undefined}
                  color={i === R.pasos.length - 1 ? VERDE : ORO}
                />
              ))}
              <p className="text-white/45 text-[11px] tracking-[0.14em] uppercase mt-5 mb-2" style={font}>Lo que más agregan al carrito</p>
              {[...R.agregados.slice(0, 4), ...R.bebidas.slice(0, 2), ...R.extras.slice(0, 2)].map((x) => (
                <p key={x.nombre} className="flex justify-between text-white/70 text-[13px] py-0.5" style={font}>
                  <span className="truncate pr-3">{x.nombre}</span><span className="tabular-nums">{num(x.n)}</span>
                </p>
              ))}
              <p className="text-white/35 text-[11px] leading-relaxed mt-4" style={font}>
                Abrieron el carrito {num(R.carritos)} {R.carritos === 1 ? 'vez' : 'veces'} y sacaron algún producto {num(R.sacaron)}.
                {R.sugerencias.length > 0 ? ` La bebida sugerida más tocada: ${R.sugerencias[0].nombre}.` : ''}
              </p>
            </>
          )}
        </Tarjeta>
      )}

      {/* ─── Últimos pedidos ─── */}
      <Tarjeta titulo="Últimos pedidos">
        {ultimos.map((o) => (
          <div key={o.id} className="rounded-xl px-3.5 py-3 mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-white/45 text-xs" style={font}>
                {new Date(o.at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-2.5">
                <span className="text-[#F0C832] text-base" style={anton}>{money(o.total)}</span>
                {puedeBorrar && !o.demo && (confirmar === o.id ? (
                  <span className="flex items-center gap-1.5" style={font}>
                    <button
                      type="button"
                      onClick={() => borrar(o)}
                      className="px-2.5 py-1 rounded-full text-[11px] text-white"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      Sí, borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmar('')}
                      className="px-2.5 py-1 rounded-full text-[11px] text-white/70"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setErrorBorrar(null); setConfirmar(o.id) }}
                    disabled={borrando === o.id}
                    aria-label="Borrar pedido"
                    className="p-2 -m-2 text-white/40 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 size={17} />
                  </button>
                ))}
              </span>
            </div>
            {errorBorrar?.id === o.id && (
              <p className="text-[12px] mt-1.5" style={{ ...font, color: '#F87171' }}>No se pudo borrar: {errorBorrar.msg}</p>
            )}
            <p className="text-white/75 text-[13px] mt-1.5 leading-snug" style={font}>
              {o.items.map(lineaItem).join(' · ')}
            </p>
            <p className="text-white/35 text-[11px] mt-1" style={font}>
              {o.zone || 'Sin zona'} · {sourceLabel(o.src)} · Productos {money(o.subtotal)}
              {o.discount > 0 && ` · ${o.promo ? o.promo + ' ' : 'Descuento '}−${money(o.discount)}`}
              {envioDe(o) > 0 ? ` · Envío ${money(envioDe(o))}` : ''}
            </p>
          </div>
        ))}
        {orders.length > 10 && (
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className="w-full mt-1 py-2 text-xs text-white/50 hover:text-white"
            style={font}
          >
            {verTodos ? 'Ver menos' : `Ver todos (${orders.length})`}
          </button>
        )}
      </Tarjeta>

      <Pie />
    </>
  )
}

const fechaCorta = (ds) =>
  new Date(`${ds}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

function Pie() {
  return (
    <div className="text-white/30 text-[11px] leading-relaxed mt-2 mb-2" style={font}>
      <p>
        Los números cuentan los pedidos que los clientes <b>envían por WhatsApp</b> desde la web.
        No confirman si el pedido se concretó ni se pagó.
      </p>
      <a
        href="https://analytics.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-2 text-[#F0C832]/70 hover:text-[#F0C832]"
      >
        Ver las visitas a la web (Google Analytics) <ExternalLink size={11} />
      </a>
    </div>
  )
}
