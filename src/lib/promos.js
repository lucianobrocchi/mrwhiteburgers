// ─── Promos editables desde el panel ─────────────────────────────────────
// Módulo PURO: sin React, sin window, sin nada de Vite. Lo usan el sitio (carrito,
// cartel, banner), el panel (validación y vista previa) y el servidor
// (server/panel-core.js valida con estas mismas funciones al guardar), así que
// tiene que correr igual en el navegador y en Node.
//
// Una promo se guarda en config.promos con campos estructurados y NADA de texto:
//
//   { id, enabled, title?, kind: 'simplesBundle', bundlePrice,                       ← cada par de simples sale $X
//     date: 'AAAA-MM-DD'  |  weekdays: [0-6] }
//   { id, enabled, title?, kind: 'itemPrice', itemName, itemSize, specialPrice,      ← una burger + tamaño a precio especial
//     date: 'AAAA-MM-DD'  |  weekdays: [0-6] }
//
// Los textos que ve el cliente (headline, ticker, short, bigPrice, bigSub) se
// derivan de esos campos en normalizePromo(): Joaco no escribe ninguno.

export const PROMO_KINDS = ['simplesBundle', 'itemPrice']
export const PROMO_SIZES = ['simple', 'doble', 'triple']
export const MAX_PROMOS = 30

const MAX_PRICE = 500_000
const MAX_TITLE = 40
const MAX_NAME = 40
const MAX_ID = 40

// ─── Fechas ──────────────────────────────────────────────────────────────
// Todo se hace con la fecha como texto 'AAAA-MM-DD' y aritmética en UTC: así no
// importa la zona horaria ni el horario de verano de quien corre el código.
export const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const DAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // la semana arranca el lunes

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n) => String(n).padStart(2, '0')

// Devuelve { y, m, d } o null si no es una fecha real (2026-02-30 → null)
function parseDate(s) {
  const m = typeof s === 'string' ? DATE_RE.exec(s) : null
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const t = new Date(Date.UTC(y, mo - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null
  return { y, m: mo, d }
}

export const isDateStr = (s) => parseDate(s) !== null

// 0 = domingo … 6 = sábado (o null si la fecha no es válida)
export function weekdayOf(s) {
  const p = parseDate(s)
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : null
}

// Suma (o resta) días a una fecha 'AAAA-MM-DD'; cambia de mes y de año bien
export function addDays(s, n) {
  const p = parseDate(s)
  if (!p) return null
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

// La fecha de HOY en el reloj de quien mira (el cliente está en La Plata)
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// $15.000 — a mano para que salga igual en el navegador y en Node (sin depender de ICU)
export const money = (n) => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// ─── Validación ──────────────────────────────────────────────────────────
const isPrice = (n) => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAX_PRICE
const hasValue = (v) => v !== undefined && v !== null && v !== ''

// Revisa una promo sin tirar nunca (viene del panel, de un archivo o de basura).
//   { ok: true,  promo }    → promo limpia, solo con los campos que le corresponden
//   { ok: false, errors }   → errors = { campo: 'mensaje en español' }
// Los campos con error son: id, title, kind, bundlePrice, itemName, itemSize,
// specialPrice y when (la fecha o los días de la semana).
export function validatePromo(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: { kind: 'La promo está vacía.' } }
  }
  const errors = {}

  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id || id.length > MAX_ID || !/^[A-Za-z0-9_-]+$/.test(id)) errors.id = 'Falta el identificador de la promo.'

  let title = ''
  if (hasValue(raw.title)) {
    if (typeof raw.title !== 'string') errors.title = 'El título tiene que ser texto.'
    else {
      title = raw.title.replace(/\s+/g, ' ').trim()
      if (title.length > MAX_TITLE) errors.title = `El título es muy largo (máximo ${MAX_TITLE} letras).`
    }
  }

  const kind = PROMO_KINDS.includes(raw.kind) ? raw.kind : null
  if (!kind) errors.kind = 'Elegí qué tipo de promo es.'

  let bundlePrice, itemName, itemSize, specialPrice
  if (kind === 'simplesBundle') {
    if (isPrice(raw.bundlePrice)) bundlePrice = raw.bundlePrice
    else errors.bundlePrice = 'Cargá el precio de los 2 simples (un número entero mayor a 0).'
  } else if (kind === 'itemPrice') {
    const nombre = typeof raw.itemName === 'string' ? raw.itemName.trim() : ''
    if (nombre && nombre.length <= MAX_NAME) itemName = nombre
    else errors.itemName = 'Elegí la burger.'
    if (PROMO_SIZES.includes(raw.itemSize)) itemSize = raw.itemSize
    else errors.itemSize = 'Elegí el tamaño.'
    if (isPrice(raw.specialPrice)) specialPrice = raw.specialPrice
    else errors.specialPrice = 'Cargá el precio especial (un número entero mayor a 0).'
  }

  // Cuándo: un día puntual O días de la semana (nunca los dos, nunca ninguno)
  let date, weekdays
  const hayFecha = hasValue(raw.date)
  const hayDias = Array.isArray(raw.weekdays) ? raw.weekdays.length > 0 : hasValue(raw.weekdays)
  if (hayFecha && hayDias) {
    errors.when = 'Elegí un día puntual o días de la semana, no los dos.'
  } else if (hayFecha) {
    if (isDateStr(raw.date)) date = raw.date
    else errors.when = 'La fecha no es válida.'
  } else if (hayDias) {
    const ok = Array.isArray(raw.weekdays) && raw.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    if (ok) weekdays = [...new Set(raw.weekdays)].sort((a, b) => a - b)
    else errors.when = 'Los días de la semana no son válidos.'
  } else {
    errors.when = 'Elegí cuándo vale la promo: un día puntual o días de la semana.'
  }

  if (Object.keys(errors).length) return { ok: false, errors }

  const promo = { id, enabled: raw.enabled === true }
  if (title) promo.title = title
  promo.kind = kind
  if (kind === 'simplesBundle') {
    promo.bundlePrice = bundlePrice
  } else {
    promo.itemName = itemName
    promo.itemSize = itemSize
    promo.specialPrice = specialPrice
  }
  if (date) promo.date = date
  else promo.weekdays = weekdays
  return { ok: true, promo }
}

// Valida la lista entera (lo que guarda el servidor). Devuelve las promos
// limpias, o el primer problema con un mensaje que dice cuál promo es.
export function validatePromoList(list) {
  if (list === undefined || list === null) return { ok: true, promos: [] }
  if (!Array.isArray(list)) return { ok: false, error: 'Las promos tienen que ser una lista.' }
  if (list.length > MAX_PROMOS) {
    return { ok: false, error: `Hay demasiadas promos (el máximo es ${MAX_PROMOS}). Borrá las que ya pasaron.` }
  }
  const vistos = new Set()
  const promos = []
  for (let i = 0; i < list.length; i++) {
    const r = validatePromo(list[i])
    if (!r.ok) {
      const t = typeof list[i]?.title === 'string' && list[i].title.trim() ? ` “${list[i].title.trim().slice(0, MAX_TITLE)}”` : ''
      return { ok: false, error: `Promo ${i + 1}${t}: ${Object.values(r.errors)[0]}` }
    }
    if (vistos.has(r.promo.id)) return { ok: false, error: `Promo ${i + 1}: está repetida (mismo identificador que otra).` }
    vistos.add(r.promo.id)
    promos.push(r.promo)
  }
  return { ok: true, promos }
}

// ─── Textos derivados ────────────────────────────────────────────────────
// dateLabel es "HOY" si la promo corre hoy, o el día de la semana si es mañana.
// Sin contexto (ctx.dateLabel) sale del día puntual, si lo tiene.
function tituloPorDefecto(dateLabel) {
  if (dateLabel === 'HOY') return 'Promo de Hoy'
  if (dateLabel) return `Promo del ${cap(dateLabel.toLowerCase())}`
  return 'Promo'
}

// Promo cruda → promo lista para mostrar, o null si no es válida.
// Suma a los campos guardados: title (con valor por defecto), customTitle,
// dateLabel, headline, ticker, short, bigPrice y bigSub.
export function normalizePromo(raw, ctx = {}) {
  const r = validatePromo(raw)
  if (!r.ok) return null
  const p = r.promo
  const dateLabel = ctx.dateLabel ?? (p.date ? DAY_NAMES[weekdayOf(p.date)].toUpperCase() : '')

  let headline, ticker, bigPrice, bigSub
  if (p.kind === 'simplesBundle') {
    headline = `2 simples x ${money(p.bundlePrice)}`
    ticker = headline.toUpperCase()
    bigPrice = money(p.bundlePrice)
    bigSub = '2 simples'
  } else {
    headline = `${p.itemName} ${p.itemSize} a ${money(p.specialPrice)}`
    ticker = `${p.itemName} ${p.itemSize.toUpperCase()} X ${money(p.specialPrice)}`.toUpperCase()
    bigPrice = money(p.specialPrice)
    bigSub = `${p.itemName} ${p.itemSize}`
  }
  return {
    ...p,
    title: p.title || tituloPorDefecto(dateLabel),
    customTitle: !!p.title,
    dateLabel,
    headline,
    ticker,
    short: headline,
    bigPrice,
    bigSub,
  }
}

// "Hoy", "Mañana", "Vie 10/07" o "Todos los viernes y sábados" (para el panel)
export function describeWhen(p, hoy) {
  if (!p) return ''
  if (p.date && isDateStr(p.date)) {
    if (hoy && p.date === hoy) return 'Hoy'
    if (hoy && p.date === addDays(hoy, 1)) return 'Mañana'
    const [y, m, d] = p.date.split('-')
    const anio = hoy && hoy.slice(0, 4) !== y ? `/${y}` : ''
    return `${cap(DAY_SHORT[weekdayOf(p.date)])} ${d}/${m}${anio}`
  }
  const dias = Array.isArray(p.weekdays) ? WEEK_ORDER.filter((d) => p.weekdays.includes(d)) : []
  if (!dias.length) return ''
  if (dias.length === 7) return 'Todos los días'
  if (dias.length === 1) {
    const n = DAY_NAMES[dias[0]]
    return `Todos los ${n.endsWith('s') ? n : n + 's'}` // lunes → lunes, sábado → sábados
  }
  const nombres = dias.map((d) => DAY_SHORT[d])
  return `Todos los ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

// ─── Qué promo corre ─────────────────────────────────────────────────────
// ¿La promo (ya validada) vale el día dateStr?
export function promoAppliesOn(p, dateStr) {
  if (!p || !isDateStr(dateStr)) return false
  if (p.date) return p.date === dateStr
  if (Array.isArray(p.weekdays) && p.weekdays.length) return p.weekdays.includes(weekdayOf(dateStr))
  return false
}

// Primera fecha desde hoy (hasta 7 días) en que corre la promo; para "Ver cómo se ve"
export function nextDateOf(p, hoy) {
  if (!p || !isDateStr(hoy)) return null
  if (p.date && isDateStr(p.date)) return p.date
  for (let i = 0; i < 7; i++) {
    const d = addDays(hoy, i)
    if (promoAppliesOn(p, d)) return d
  }
  return null
}

// De la lista guardada en la config, la promo de HOY y la de MAÑANA (para el aviso
// "mañana: …"). Es la primera habilitada de la lista que vale ese día. Con basura
// o sin promos devuelve { active: null, preview: null }; nunca tira.
export function promosActivas(promos, hoyStr) {
  const nada = { active: null, preview: null }
  if (!Array.isArray(promos) || !isDateStr(hoyStr)) return nada
  const manana = addDays(hoyStr, 1)
  const etiquetaManana = DAY_NAMES[weekdayOf(manana)].toUpperCase()
  let active = null
  let preview = null
  for (const raw of promos.slice(0, MAX_PROMOS)) {
    const r = validatePromo(raw)
    if (!r.ok || !r.promo.enabled) continue
    if (!active && promoAppliesOn(r.promo, hoyStr)) active = normalizePromo(r.promo, { dateLabel: 'HOY' })
    if (!preview && promoAppliesOn(r.promo, manana)) preview = normalizePromo(r.promo, { dateLabel: etiquetaManana })
    if (active && preview) break
  }
  return { active, preview }
}

// ─── Cuentas del carrito ─────────────────────────────────────────────────
// Las promos son sobre las BURGERS y se calculan con su precio base: los extras
// y las bebidas se pagan siempre completos, por encima de la promo.
const esBurger = (it) => (it.kind ?? 'burger') === 'burger'
const precioBase = (it) => it.basePrice ?? it.price

// Precio especial de una burger+tamaño según la promo (o null si no aplica). Solo
// rebaja: si el precio vigente ya es igual o menor, la promo no tiene efecto.
export function itemPromoPrice(promo, name, size, price) {
  if (
    promo && promo.kind === 'itemPrice' && promo.itemName === name && promo.itemSize === size &&
    price > promo.specialPrice
  ) {
    return promo.specialPrice
  }
  return null
}

// Descuento total del carrito. Nunca es negativo.
export function calcPromoDiscount(items, promo) {
  if (!promo) return 0
  const burgers = (items || []).filter(esBurger)
  let discount = 0
  if (promo.kind === 'simplesBundle') {
    // Cada par de simples sale bundlePrice; se emparejan de mayor a menor precio
    const simples = []
    for (const it of burgers) {
      for (let i = 0; i < it.qty; i++) if (it.size === 'simple') simples.push(precioBase(it))
    }
    simples.sort((a, b) => b - a)
    for (let i = 0; i + 1 < simples.length; i += 2) {
      discount += Math.max(0, simples[i] + simples[i + 1] - promo.bundlePrice)
    }
  } else if (promo.kind === 'itemPrice') {
    // Una burger + tamaño puntual baja a specialPrice
    for (const it of burgers) {
      const base = precioBase(it)
      const sp = itemPromoPrice(promo, it.name, it.size, base)
      if (sp != null) discount += (base - sp) * it.qty
    }
  }
  return discount
}
