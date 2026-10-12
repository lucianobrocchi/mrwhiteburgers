import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ExternalLink, AlertTriangle, Tag, Info, ArrowUp } from 'lucide-react'
import { SIZES } from '../context/CartContext'
import { BURGERS } from '../lib/menu'
import { SCHEDULE } from '../lib/schedule'
import { leerPrecio, textoDePrecio, muyBarato, mensajeMuyBarato } from '../lib/precio'
import {
  MAX_PROMOS, DAY_SHORT, DAY_NAMES, WEEK_ORDER,
  validatePromo, normalizePromo, describeWhen, promoAppliesOn, nextDateOf, addDays, weekdayOf, money,
} from '../lib/promos'

// ─── Pestaña "Promos" del panel ──────────────────────────────────────────
// Joaco arma las promos acá; se guardan en config.promos con el mismo botón
// "Guardar cambios" de las demás pestañas. El texto que ve el cliente no se
// escribe: sale de los campos (src/lib/promos.js).

// scroll-mb: cuando el celu lleva un campo a la vista, que no quede debajo del
// botón fijo "Guardar cambios" (que ocupa los últimos ~90 px de la pantalla)
const inputCls =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 min-h-[44px] text-white text-sm outline-none focus:border-[#F0C832]/60 transition-colors scroll-mb-28'
const labelCls = 'text-[10px] tracking-[0.16em] uppercase text-white/55'
const font = { fontFamily: 'DM Sans, sans-serif' }
const anton = { fontFamily: 'Anton, sans-serif' }

const SIZE_LABEL = Object.fromEntries(SIZES.map((s) => [s.key, s.label]))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Días que el local no abre (hoy: el martes), sacados del horario del sitio
const DIAS_CERRADOS = [0, 1, 2, 3, 4, 5, 6].filter((d) => !(SCHEDULE[d] || []).length)

// "Hoy", "Mañana", "Mar 13/10" o "Todos los viernes y sábados" (los días con su nombre
// completo: Joaco no tiene por qué leer "vie y sáb")
const plural = (d) => { const n = DAY_NAMES[d]; return n.endsWith('s') ? n : `${n}s` } // sábado → sábados, lunes → lunes
function cuando(p, hoy) {
  if (Array.isArray(p.weekdays) && p.weekdays.length) {
    const dias = WEEK_ORDER.filter((d) => p.weekdays.includes(d))
    if (dias.length === 7) return 'Todos los días'
    const nombres = dias.map(plural)
    return `Todos los ${nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`}`
  }
  return describeWhen(p, hoy)
}

// Precio que rige hoy en el sitio para una burger+tamaño: el del panel si lo
// pisó, si no el de la carta (igual que MenuSection.aplicarConfig).
function precioVigente(cfg, burger, size) {
  const v = cfg?.burgers?.[burger.id]?.prices?.[size]
  return typeof v === 'number' && Number.isFinite(v) ? v : burger.prices[size]
}

function nuevaPromo(lista, hoy) {
  const usados = new Set(lista.map((p) => p?.id))
  let id
  do { id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` } while (usados.has(id))
  // Arranca para hoy y sin precio: no se puede guardar hasta que Joaco lo complete
  return { id, enabled: true, kind: 'simplesBundle', date: hoy }
}

// ¿Dos promos valen algún mismo día? (las de fecha puntual ya pasada no cuentan)
function seSuperponen(a, b, hoy) {
  const vivo = (p) => !(p.date && p.date < hoy)
  if (!vivo(a) || !vivo(b)) return false
  if (a.date && b.date) return a.date === b.date
  if (a.date) return (b.weekdays || []).includes(weekdayOf(a.date))
  if (b.date) return (a.weekdays || []).includes(weekdayOf(b.date))
  return (a.weekdays || []).some((d) => (b.weekdays || []).includes(d))
}

// Cuánto se ahorra con la promo, en palabras, y avisos si no baja el precio o si
// baja tanto que parece un error de tipeo
function resumenAhorro(promo, cfg) {
  if (promo.kind === 'simplesBundle') {
    const precios = BURGERS.map((b) => precioVigente(cfg, b, 'simple'))
    const min = Math.min(...precios)
    const max = Math.max(...precios)
    const ahorroMin = 2 * min - promo.bundlePrice
    const ahorroMax = 2 * max - promo.bundlePrice
    if (ahorroMax <= 0) {
      return {
        texto: `Dos simples hoy suman ${money(2 * max)} como mucho.`,
        avisos: [`Con ${money(promo.bundlePrice)} los 2 simples no salen más baratos que ahora (el par más caro suma ${money(2 * max)}): la promo no baja nada.`],
      }
    }
    const rango = ahorroMin === ahorroMax || ahorroMin <= 0
      ? `${money(ahorroMax)}`
      : `entre ${money(ahorroMin)} y ${money(ahorroMax)}`
    const avisos = []
    if (ahorroMin <= 0) {
      avisos.push(`En las simples más baratas (${money(min)} c/u) el par ya suma ${money(2 * min)} y la promo no las baja.`)
    }
    if (promo.bundlePrice < min) {
      avisos.push(`Ojo: ${money(promo.bundlePrice)} es menos de la mitad de lo que suman dos simples (desde ${money(2 * min)}). Revisá que el precio esté bien escrito.`)
    }
    return {
      texto: `Cada par de simples sale ${money(promo.bundlePrice)}: el cliente ahorra ${rango} por par, según las burgers que elija.`,
      avisos,
    }
  }
  const burger = BURGERS.find((b) => b.name === promo.itemName)
  if (!burger) {
    return { texto: '', avisos: [`“${promo.itemName}” ya no está en la carta: la promo no tiene efecto.`] }
  }
  const precio = precioVigente(cfg, burger, promo.itemSize)
  const ahorro = precio - promo.specialPrice
  if (ahorro <= 0) {
    return {
      texto: `${burger.name} ${promo.itemSize} sale ${money(precio)} hoy.`,
      avisos: [`El precio especial (${money(promo.specialPrice)}) no baja el precio actual de ${burger.name} ${promo.itemSize} (${money(precio)}): la promo no tiene efecto, aunque el cartel la anuncie.`],
    }
  }
  const avisos = []
  if (promo.specialPrice * 2 < precio) {
    avisos.push(`Ojo: ${money(promo.specialPrice)} es menos de la mitad del precio de hoy (${money(precio)}). Revisá que el precio esté bien escrito.`)
  }
  return {
    texto: `${burger.name} ${promo.itemSize} pasa de ${money(precio)} a ${money(promo.specialPrice)}: ahorra ${money(ahorro)} cada una.`,
    avisos,
  }
}

// ─── Piezas chicas ───────────────────────────────────────────────────────
function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="shrink-0 w-14 h-11 flex items-center justify-center"
    >
      <span
        className="block w-11 h-6 rounded-full transition-colors"
        style={{ backgroundColor: on ? '#F0C832' : 'rgba(255,255,255,0.18)' }}
      >
        <span
          className="block w-5 h-5 rounded-full mt-0.5 transition-transform"
          style={{ backgroundColor: on ? '#000' : '#fff', transform: `translateX(${on ? 22 : 2}px)` }}
        />
      </span>
    </button>
  )
}

// Botones de a dos (o más) para elegir una opción
function Opciones({ valor, opciones, onChange, nombre }) {
  return (
    <div role="radiogroup" aria-label={nombre} className="grid grid-cols-2 gap-2">
      {opciones.map(([k, texto]) => {
        const activa = valor === k
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(k)}
            className="min-h-[44px] px-3 py-2 rounded-xl text-[13px] leading-tight transition-colors"
            style={{
              ...font,
              fontWeight: 600,
              backgroundColor: activa ? 'rgba(240,200,50,0.14)' : 'rgba(255,255,255,0.03)',
              color: activa ? '#F0C832' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${activa ? 'rgba(240,200,50,0.55)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {texto}
          </button>
        )
      })}
    </div>
  )
}

function Campo({ etiqueta, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className={labelCls}>{etiqueta}</span>
      {children}
      {error && (
        <span className="text-red-300 text-xs flex items-start gap-1.5" role="alert">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
        </span>
      )}
    </label>
  )
}

const bordeError = (hay) => (hay ? { borderColor: 'rgba(248,113,113,0.7)' } : undefined)

// Campo de precio: texto con teclado numérico que lee "15.000" como 15000 (no como 15),
// muestra cómo lo entendió y frena los precios que parecen un error de tipeo.
// `valor` es sólo el inicial: lo que se ve lo manda el texto que va escribiendo.
function PrecioInput({ etiqueta, valor, onChange, error, className = '' }) {
  const [texto, setTexto] = useState(textoDePrecio(valor))
  const [editando, setEditando] = useState(false)
  const leido = leerPrecio(texto)
  const noEntiendo = texto.trim() !== '' && Number.isNaN(leido)
  // Los reproches se dicen al salir del campo, no mientras escribe: "15." o "15" son
  // pasos normales hasta llegar a "15.000"
  const local = noEntiendo
    ? 'Escribí sólo números, sin centavos. Por ejemplo: 15000.'
    : leido === 0
      ? 'El precio tiene que ser mayor a $0.'
      : muyBarato(leido)
        ? mensajeMuyBarato(leido)
        : null
  // con el campo vacío, el reproche de la validación habla de "números enteros": mejor un ejemplo
  const mensaje = (!editando && local) || (error && (texto.trim() === '' ? 'Cargá el precio. Por ejemplo: 15000.' : error))
  const bueno = Number.isFinite(leido) && leido > 0 && !muyBarato(leido)
  const formateado = bueno ? textoDePrecio(leido) : ''
  return (
    <Campo etiqueta={etiqueta} error={mensaje} className={className}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 text-sm pointer-events-none" aria-hidden="true">$</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`${inputCls} pl-7`}
          style={bordeError(!!mensaje)}
          placeholder="Ej: 15000"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            onChange(leerPrecio(e.target.value))
          }}
          onFocus={() => setEditando(true)}
          onBlur={() => { setEditando(false); if (bueno) setTexto(formateado) }}
        />
      </div>
      {bueno && texto.trim() !== formateado && (
        <span className="text-white/60 text-xs" style={font}>Se guarda como {money(leido)}</span>
      )}
    </Campo>
  )
}

const TONOS = {
  verde: { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', borde: 'rgba(74,222,128,0.4)' },
  amarillo: { color: '#F0C832', bg: 'rgba(240,200,50,0.12)', borde: 'rgba(240,200,50,0.4)' },
  gris: { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)', borde: 'rgba(255,255,255,0.14)' },
  rojo: { color: '#FCA5A5', bg: 'rgba(248,113,113,0.12)', borde: 'rgba(248,113,113,0.4)' },
}

function Etiqueta({ tono, children }) {
  const t = TONOS[tono]
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] tracking-[0.14em] uppercase"
      style={{ ...font, fontWeight: 700, color: t.color, backgroundColor: t.bg, border: `1px solid ${t.borde}` }}
    >
      {children}
    </span>
  )
}

// ─── Una promo ───────────────────────────────────────────────────────────
function Promo({ clave, promo: p, indice, lista, cfg, hoy, sinGuardar, verErrores, onChange, onDelete, onUp }) {
  const [borrando, setBorrando] = useState(false)
  const v = validatePromo(p)
  const errores = v.ok ? {} : v.errors
  const err = (campo) => (verErrores ? errores[campo] : undefined)
  const derivada = v.ok ? normalizePromo(v.promo, { dateLabel: 'HOY' }) : null
  const modo = Array.isArray(p.weekdays) ? 'semana' : 'dia'
  const manana = addDays(hoy, 1)

  // Estado de un vistazo
  let estado
  if (!v.ok) estado = ['rojo', 'Incompleta']
  else if (!p.enabled) estado = ['gris', 'Apagada']
  else if (promoAppliesOn(v.promo, hoy)) {
    // si una promo de más arriba también vale hoy, esa es la que corre
    const tapadaPor = lista.findIndex((o, j) => {
      if (j >= indice || !o?.enabled) return false
      const r = validatePromo(o)
      return r.ok && promoAppliesOn(r.promo, hoy)
    })
    estado = tapadaPor >= 0 ? ['gris', `Hoy corre la promo ${tapadaPor + 1}`] : ['verde', 'Corre hoy']
  }
  else if (promoAppliesOn(v.promo, manana)) estado = ['amarillo', 'Arranca mañana']
  else if (v.promo.date && v.promo.date < hoy) estado = ['gris', 'Ya pasó']
  else estado = ['amarillo', 'Programada']

  // Avisos que no bloquean el guardado
  const avisos = []
  const ahorro = v.ok ? resumenAhorro(v.promo, cfg) : null
  if (ahorro) avisos.push(...ahorro.avisos)
  if (v.ok && v.promo.date && v.promo.date < hoy) {
    avisos.push('Esa fecha ya pasó: la promo no se va a ver en el sitio. Borrala o elegí otro día.')
  }
  if (v.ok && p.enabled) {
    for (let j = 0; j < indice; j++) {
      const otra = validatePromo(lista[j])
      if (otra.ok && lista[j].enabled && seSuperponen(v.promo, otra.promo, hoy)) {
        const t = otra.promo.title ? ` “${otra.promo.title}”` : ''
        avisos.push(`Coincide con la promo ${j + 1}${t}: los días que se pisan sólo corre la ${j + 1}, que va primero en la lista. Si querés que corra esta, tocá la flecha ↑ de arriba a la derecha.`)
        break
      }
    }
  }

  if (v.ok) {
    const dias = v.promo.date ? [weekdayOf(v.promo.date)] : v.promo.weekdays
    const cerrados = dias.filter((d) => DIAS_CERRADOS.includes(d))
    if (cerrados.length) {
      const nombres = cerrados.map((d) => DAY_NAMES[d]).join(' y ')
      avisos.push(
        cerrados.length === dias.length
          ? `El local no abre el ${nombres}: nadie va a poder usar esta promo. Elegí otro día.`
          : `Entre los días que marcaste está el ${nombres}, que el local no abre.`,
      )
    }
  }

  const verFecha = v.ok ? nextDateOf(v.promo, hoy) : null
  const burgerEnMenu = BURGERS.some((b) => b.name === p.itemName)

  const setDia = (d) => {
    const dias = new Set(p.weekdays || [])
    if (dias.has(d)) dias.delete(d)
    else dias.add(d)
    onChange({ weekdays: [...dias] })
  }

  return (
    <div
      id={`promo-${p.id}`}
      data-promo-key={clave}
      className="rounded-2xl p-4 sm:p-5 mb-4 scroll-mt-4"
      style={{
        backgroundColor: '#111',
        border: `1px solid ${p.enabled && v.ok ? 'rgba(240,200,50,0.28)' : 'rgba(255,255,255,0.08)'}`,
        opacity: p.enabled ? 1 : 0.85,
      }}
    >
      {/* Encabezado: estado + interruptor */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/60 text-xs" style={font}>Promo {indice + 1}</span>
            <Etiqueta tono={estado[0]}>{estado[1]}</Etiqueta>
          </div>
          <p className="text-white text-lg uppercase leading-tight mt-1.5 break-words" style={anton}>
            {derivada ? derivada.headline : 'Promo sin terminar'}
          </p>
          {v.ok && <p className="text-white/60 text-xs mt-0.5" style={font}>{cuando(v.promo, hoy)}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onUp && (
            <button
              type="button"
              onClick={onUp}
              aria-label={`Subir la promo ${indice + 1}: pasa a correr antes que la ${indice}`}
              title="Subir en la lista (corre antes si dos promos coinciden)"
              className="w-11 h-11 flex items-center justify-center rounded-full text-white/65 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.14)' }}
            >
              <ArrowUp size={16} />
            </button>
          )}
          <span className="text-white/60 text-xs hidden sm:inline" style={font}>{p.enabled ? 'Activa' : 'Apagada'}</span>
          <Switch
            on={!!p.enabled}
            onChange={(on) => onChange({ enabled: on })}
            label={`Promo ${indice + 1} ${p.enabled ? 'activa' : 'apagada'}`}
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Cuándo */}
        <div>
          <p className={`${labelCls} mb-2`}>Cuándo</p>
          <Opciones
            nombre="Cuándo vale la promo"
            valor={modo}
            onChange={(m) => {
              if (m === modo) return
              if (m === 'dia') onChange({ weekdays: undefined, date: p.date || hoy })
              else onChange({ date: undefined, weekdays: p.weekdays || [] })
            }}
            opciones={[['dia', 'Un día puntual'], ['semana', 'Días de la semana']]}
          />
          {modo === 'dia' ? (
            <Campo etiqueta="Fecha" error={err('when')} className="mt-3">
              <input
                type="date"
                value={p.date || ''}
                onChange={(e) => onChange({ date: e.target.value || undefined })}
                className={inputCls}
                style={{ colorScheme: 'dark', ...bordeError(err('when')) }}
              />
            </Campo>
          ) : (
            <div className="mt-3">
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2" role="group" aria-label="Días de la semana">
                {WEEK_ORDER.map((d) => {
                  const activo = (p.weekdays || []).includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setDia(d)}
                      className="min-h-[44px] rounded-xl text-sm transition-colors"
                      style={{
                        ...anton,
                        letterSpacing: '0.04em',
                        backgroundColor: activo ? '#F0C832' : 'rgba(255,255,255,0.04)',
                        color: activo ? '#000' : 'rgba(255,255,255,0.65)',
                        border: `1px solid ${activo ? '#F0C832' : err('when') ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.12)'}`,
                      }}
                    >
                      {cap(DAY_SHORT[d])}
                    </button>
                  )
                })}
              </div>
              {err('when') ? (
                <p className="text-red-300 text-xs flex items-start gap-1.5 mt-1.5" role="alert">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {err('when')}
                </p>
              ) : (
                <p className="text-white/60 text-xs mt-1.5" style={font}>
                  {(p.weekdays || []).length
                    ? 'La promo se repite todas las semanas esos días.'
                    : 'Marcá uno o más días: la promo se repite todas las semanas.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Qué */}
        <div>
          <p className={`${labelCls} mb-2`}>Tipo de promo</p>
          <Opciones
            nombre="Tipo de promo"
            valor={p.kind}
            onChange={(k) => onChange({ kind: k })}
            opciones={[['simplesBundle', '2 simples por $X'], ['itemPrice', 'Una burger a precio especial']]}
          />
          {err('kind') && (
            <p className="text-red-300 text-xs mt-1.5" role="alert">{err('kind')}</p>
          )}

          {p.kind === 'simplesBundle' && (
            <PrecioInput
              etiqueta="Precio de los 2 simples"
              valor={p.bundlePrice}
              error={err('bundlePrice')}
              onChange={(n) => onChange({ bundlePrice: n })}
              className="mt-3"
            />
          )}

          {p.kind === 'itemPrice' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Campo etiqueta="Burger" error={err('itemName')} className="col-span-2">
                <select
                  className={inputCls}
                  style={{ colorScheme: 'dark', ...bordeError(err('itemName')) }}
                  value={p.itemName || ''}
                  onChange={(e) => onChange({ itemName: e.target.value || undefined })}
                >
                  <option value="">Elegí la burger…</option>
                  {p.itemName && !burgerEnMenu && <option value={p.itemName}>{p.itemName} (ya no está en la carta)</option>}
                  {BURGERS.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Tamaño" error={err('itemSize')}>
                <select
                  className={inputCls}
                  style={{ colorScheme: 'dark', ...bordeError(err('itemSize')) }}
                  value={p.itemSize || ''}
                  onChange={(e) => onChange({ itemSize: e.target.value || undefined })}
                >
                  <option value="">Elegí…</option>
                  {SIZES.map((s) => <option key={s.key} value={s.key}>{SIZE_LABEL[s.key]}</option>)}
                </select>
              </Campo>
              <PrecioInput
                etiqueta="Precio especial"
                valor={p.specialPrice}
                error={err('specialPrice')}
                onChange={(n) => onChange({ specialPrice: n })}
              />
            </div>
          )}
        </div>

        {/* Título */}
        <Campo etiqueta="Título (opcional)" error={err('title')}>
          <input
            className={inputCls}
            style={bordeError(err('title'))}
            maxLength={40}
            placeholder="Promo de Hoy"
            value={p.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Campo>

        {/* Vista previa */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className={`${labelCls} mb-2`}>Así lo ve el cliente ese día</p>
          {derivada ? (
            <>
              <div className="flex items-center gap-3">
                <div className="shrink-0 text-center rounded-xl px-3 py-2" style={{ backgroundColor: '#F0C832' }}>
                  <span className="block text-2xl leading-none text-black" style={anton}>{derivada.bigPrice}</span>
                  <span className="block text-[10px] leading-none mt-1 tracking-[0.12em] uppercase text-black" style={anton}>
                    {derivada.bigSub}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-white uppercase leading-tight break-words" style={anton}>{derivada.title}</p>
                  <p className="text-[#F0C832] text-sm leading-tight mt-0.5 break-words" style={anton}>{derivada.headline}</p>
                </div>
              </div>
              <p className="text-white/60 text-[11px] mt-2 break-words" style={font}>
                Cartel de arriba: ★ SOLO HOY · {derivada.ticker} · PEDÍ POR WHATSAPP
              </p>
              {ahorro?.texto && <p className="text-white/70 text-xs mt-2 leading-relaxed" style={font}>{ahorro.texto}</p>}
            </>
          ) : (
            <p className="text-white/60 text-xs" style={font}>Completá los datos de arriba y acá ves cómo queda en el sitio.</p>
          )}
        </div>

        {/* Avisos */}
        {avisos.map((a, i) => (
          <p
            key={i}
            className="text-xs leading-relaxed flex items-start gap-2 rounded-xl px-3 py-2.5"
            style={{ ...font, color: '#FCD34D', backgroundColor: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.3)' }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {a}
          </p>
        ))}

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {verFecha ? (
            <div>
              <a
                href={`/?promoDate=${verFecha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-[#F0C832] hover:text-white"
                style={font}
              >
                Ver cómo se ve <ExternalLink size={14} />
              </a>
              {(sinGuardar || !p.enabled) && (
                <p className="text-white/60 text-[11px] -mt-1" style={font}>
                  {!p.enabled ? 'Está apagada: no se ve en el sitio.' : 'Guardá los cambios para verla en el sitio.'}
                </p>
              )}
            </div>
          ) : <span />}

          {borrando ? (
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs" style={font}>¿Borrar esta promo?</span>
              <button
                type="button"
                onClick={onDelete}
                className="min-h-[44px] px-4 rounded-full text-xs uppercase tracking-widest text-white"
                style={{ ...anton, backgroundColor: '#DC2626' }}
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setBorrando(false)}
                className="min-h-[44px] px-4 rounded-full text-xs uppercase tracking-widest text-white/65 hover:text-white"
                style={{ ...anton, border: '1px solid rgba(255,255,255,0.15)' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setBorrando(true)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full text-xs uppercase tracking-widest text-red-300/80 hover:text-red-300"
              style={{ ...anton, border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── La pestaña ──────────────────────────────────────────────────────────
// promos: la lista de la config · onChange(nuevaLista) · cfg: para los precios
// vigentes · hoy: 'AAAA-MM-DD' · sinGuardar: hay cambios que todavía no están en
// el sitio · verErrores: marcar en rojo los campos que faltan (después de intentar guardar)
export default function AdminPromos({ promos, onChange, cfg, hoy, sinGuardar, verErrores }) {
  const lista = Array.isArray(promos) ? promos : []
  const cambiar = (i, patch) => onChange(lista.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const borrar = (i) => onChange(lista.filter((_, j) => j !== i))
  const propio = (cfg?.ticker || '').trim()
  const lleno = lista.length >= MAX_PROMOS
  // Una clave por promo: su id (así cada tarjeta conserva lo que se está escribiendo
  // aunque se borre otra de más arriba). Si un archivo editado a mano trae ids
  // repetidos o promos rotas, se desempata para que React no mezcle las tarjetas.
  const vistas = new Map()
  const claves = lista.map((p, i) => {
    const base = p && typeof p === 'object' && p.id ? String(p.id) : `sin-id-${i}`
    const n = vistas.get(base) || 0
    vistas.set(base, n + 1)
    return n ? `${base}#${n}` : base
  })

  // La promo nueva queda abajo de todo: después de agregarla se lleva la pantalla
  // hasta ella (en el celu, si no, parece que el botón no hizo nada)
  const irA = useRef(null)
  // Subir una promo: pasa a correr antes que la de arriba (si coinciden, gana la primera)
  const subir = (i) => {
    if (i < 1) return
    const nueva = [...lista]
    ;[nueva[i - 1], nueva[i]] = [nueva[i], nueva[i - 1]]
    irA.current = claves[i]
    onChange(nueva)
  }
  const agregar = () => {
    const nueva = nuevaPromo(lista, hoy)
    irA.current = nueva.id
    onChange([...lista, nueva])
  }
  useEffect(() => {
    if (!irA.current) return
    const el = document.querySelector(`[data-promo-key="${CSS.escape(irA.current)}"]`)
    irA.current = null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [promos])

  return (
    <>
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-xl text-white uppercase" style={anton}>Promos</h2>
        <p className="text-white/60 text-xs mt-1 leading-relaxed" style={font}>
          Una promo baja el precio sola en el carrito el día que elijas, y el cartel y el banner de la web la anuncian.
          Cuando termina el día se apaga sin que hagas nada. Si dos promos valen el mismo día, corre la primera de la lista.
        </p>
      </div>

      {sinGuardar && (
        <p
          className="text-xs leading-relaxed flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4"
          style={{ ...font, color: '#F0C832', backgroundColor: 'rgba(240,200,50,0.08)', border: '1px solid rgba(240,200,50,0.35)' }}
          role="status"
        >
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Hiciste cambios que todavía no están en el sitio. Tocá <b>Guardar cambios</b> (el botón amarillo de abajo) para que se vean.</span>
        </p>
      )}

      {propio && lista.some((p) => p?.enabled) && (
        <p
          className="text-xs leading-relaxed flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4"
          style={{ ...font, color: '#FCD34D', backgroundColor: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.3)' }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Tenés un texto propio en “Cartel de arriba” (pestaña Hoy): ese texto tapa el anuncio de la promo en el cartel.
          El descuento y el banner funcionan igual.
        </p>
      )}

      {lista.length === 0 && (
        <div
          className="rounded-2xl p-6 mb-4 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <Tag size={26} className="mx-auto text-[#F0C832]" />
          <p className="text-white text-lg uppercase mt-3" style={anton}>Todavía no hay promos</p>
          <p className="text-white/65 text-sm mt-2 leading-relaxed" style={font}>
            Por ejemplo “2 simples x $15.000” este viernes, o “Curri White triple a $15.000” todos los sábados.
            Tocá <b className="text-white/80">Agregar promo</b>, elegí cuándo vale y cuánto sale, y guardá.
          </p>
        </div>
      )}

      {lista.map((p, i) => (
        <Promo
          key={claves[i]}
          clave={claves[i]}
          promo={p && typeof p === 'object' ? p : {}}
          indice={i}
          lista={lista}
          cfg={cfg}
          hoy={hoy}
          sinGuardar={sinGuardar}
          verErrores={verErrores}
          onChange={(patch) => cambiar(i, patch)}
          onDelete={() => borrar(i)}
          onUp={i > 0 ? () => subir(i) : null}
        />
      ))}

      <button
        type="button"
        onClick={agregar}
        disabled={lleno}
        className="w-full min-h-[52px] rounded-full text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ ...anton, color: '#F0C832', border: '1px dashed rgba(240,200,50,0.5)', backgroundColor: 'rgba(240,200,50,0.05)' }}
      >
        <Plus size={16} strokeWidth={3} /> Agregar promo
      </button>
      {lleno && (
        <p className="text-white/60 text-xs mt-2 text-center" style={font}>
          Llegaste al máximo de {MAX_PROMOS} promos. Borrá las que ya pasaron para agregar otra.
        </p>
      )}
    </>
  )
}
