import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Download, RefreshCw, Trash2, Sparkles, ExternalLink, Info,
} from 'lucide-react'
import {
  calcular, frases, aCSV, RANGOS, DIAS_CORTO, hoyART,
} from '../lib/statsCalc'
import { generarDemo } from '../lib/statsDemo'
import { sourceLabel } from '../lib/source'
import { BURGERS } from '../lib/menu'
import { EXTRAS, DRINKS } from '../lib/catalog'

const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }
const ORO = '#F0C832'
const VERDE = '#4ADE80'
const ROJO = '#F87171'

const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const num = (n) => Math.round(n || 0).toLocaleString('es-AR')
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
function Barras({ datos, alto = 120, mostrarValores = true, resaltar }) {
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
              {d.valor}
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
export default function AdminStats({ stats, onReload, onDelete, puedeBorrar, recargando, registroActivo = true, pasosBlob }) {
  const [rango, setRango] = useState('7')
  const [demo, setDemo] = useState(false)
  const [borrando, setBorrando] = useState('')
  const [verTodos, setVerTodos] = useState(false)

  const orders = useMemo(
    () => (demo ? generarDemo({ ...catalogoDemo() }) : stats?.orders || []),
    [demo, stats],
  )
  const S = useMemo(() => calcular(orders, rango), [orders, rango])
  const dichos = useMemo(() => frases(S, sourceLabel), [S])

  const hayDatos = orders.length > 0

  const descargar = () => {
    const blob = new Blob([aCSV(orders)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pedidos-mr-white-${hoyART()}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const borrar = async (o) => {
    if (!window.confirm(`¿Borrar este pedido de ${money(o.total)}? No se puede deshacer.`)) return
    setBorrando(o.id)
    try { await onDelete(o.id) } finally { setBorrando('') }
  }

  // ─── Sin datos todavía ───
  if (!hayDatos) {
    return (
      <>
        {!registroActivo && (
          <Tarjeta titulo="Falta un paso para activar las estadísticas">
            <p className="text-white/60 text-sm leading-relaxed mb-4" style={font}>
              Los pedidos todavía <b className="text-white">no se están registrando</b>, porque falta conectar
              el almacenamiento de Vercel. Son 3 pasos y no hay que copiar ninguna clave:
            </p>
            {pasosBlob}
          </Tarjeta>
        )}
        <Tarjeta titulo={registroActivo ? 'Todavía no hay pedidos registrados' : 'Cómo se van a ver'}>
          <p className="text-white/60 text-sm leading-relaxed mb-4" style={font}>
            Cada vez que un cliente toca <b className="text-white">“Pedir por WhatsApp”</b> en la web, el pedido
            {registroActivo ? ' queda anotado acá' : ' va a quedar anotado acá'}: qué pidió, cuánto, a qué zona y de dónde
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

      {/* ─── Lo que aporta la web ─── */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 85% 0%, rgba(240,200,50,0.20), transparent 55%), #121212',
          border: '1px solid rgba(240,200,50,0.35)',
        }}
      >
        <p className="text-[#F0C832] text-[11px] tracking-[0.2em] uppercase" style={font}>Lo que aporta la web</p>
        <p className="text-white text-5xl leading-none mt-3" style={anton}>{money(S.acumulado.ventas)}</p>
        <p className="text-white/70 text-sm mt-2" style={font}>
          en <b className="text-white">{num(S.acumulado.pedidos)} pedidos</b> enviados por WhatsApp
          {S.acumulado.desde && <> desde el {fechaLarga(S.acumulado.desde)}</>}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-[12px] text-white/50" style={font}>
          <span>≈ <b className="text-white/80">{money(S.acumulado.ticket)}</b> por pedido</span>
          <span>≈ <b className="text-white/80">{money(S.acumulado.porDiaActivo)}</b> por día con pedidos</span>
        </div>
      </div>

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
            <Tarjeta titulo="Pedidos por día" subtitulo={`Mejor día: ${S.mejor.dia && S.mejor.dia.ventas > 0 ? `${fechaCorta(S.mejor.dia.d)} con ${money(S.mejor.dia.ventas)}` : '—'}`}>
              <Barras
                alto={110}
                mostrarValores={!muchosDias}
                resaltar={(d) => d.clave === hoyART()}
                datos={S.porDia.map((d, i) => ({
                  clave: d.d,
                  valor: d.pedidos,
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
                detalle={money(b.ventas)}
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
                  <span className="text-white/50 tabular-nums">{z.pedidos} · <span className="text-white/80">{money(z.ventas)}</span></span>
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
              <p className="text-white/70 text-[13px]" style={font}>
                {S.promos.pedidos} {S.promos.pedidos === 1 ? 'pedido usó' : 'pedidos usaron'} una promo, con {money(S.promos.descuentos)} de descuento en total.
              </p>
            </Tarjeta>
          )}
        </>
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
                {puedeBorrar && !o.demo && (
                  <button
                    type="button"
                    onClick={() => borrar(o)}
                    disabled={borrando === o.id}
                    aria-label="Borrar pedido"
                    className="text-white/25 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </div>
            <p className="text-white/75 text-[13px] mt-1.5 leading-snug" style={font}>
              {o.items.map((i) => {
                const ex = (i.x || []).length ? ` (+${i.x.map((e) => (e.q > 1 ? `${e.q} ` : '') + e.n).join(', ')})` : ''
                return `${i.q}× ${i.n}${i.k === 'd' ? ' ' + i.sl : ' ' + (i.sl || i.s)}${ex}`
              }).join(' · ')}
            </p>
            <p className="text-white/35 text-[11px] mt-1" style={font}>
              {o.zone || 'Sin zona'} · {sourceLabel(o.src)}
              {o.discount > 0 && ` · desc −${money(o.discount)}`}
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
        href="https://vercel.com/lucianobrocchi-2489s-projects/mrwhiteburgers/analytics"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-2 text-[#F0C832]/70 hover:text-[#F0C832]"
      >
        Ver las visitas a la web (Vercel Analytics) <ExternalLink size={11} />
      </a>
    </div>
  )
}
