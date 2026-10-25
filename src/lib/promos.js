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

//   { id, enabled, title?, kind: 'bundle', qty, size, itemName?, bundlePrice, ... }     <- N burgers por $X ("2 triples a $30.000")
//   { id, enabled, title?, kind: 'nthPct', nth, pct, size, itemName?, ... }           <- la 2a (3a...) con X% off; 100% = 2x1
//   { id, enabled, title?, kind: 'pctOff', pct, size, itemName?, ... }                <- X% off en las burgers
//   { id, enabled, title?, kind: 'amountOff', amount, minSpend, ... }                 <- $X off desde cierto gasto
//   { id, enabled, title?, kind: 'freeShipping', minSpend, ... }                      <- envio gratis (desde cierto gasto)
// `size` es 'any' (cualquier tamaño), 'simple', 'doble' o 'triple'; `itemName` limita la
// promo a una sola burger (sin él vale para cualquiera).
export const PROMO_SIZES = ['simple', 'doble', 'triple']
export const PROMO_SCOPES = ['any', ...PROMO_SIZES]
export const PROMO_KINDS = ['simplesBundle', 'itemPrice', 'bundle', 'nthPct', 'pctOff', 'amountOff', 'freeShipping']
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
  const out = `${String(t.getUTCFullYear()).padStart(4, '0')}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
  // Fuera de lo que sabemos leer (9999-12-31 + 1 día = año 10000, o antes del año 100)
  // devuelve null en vez de un texto que después nadie puede interpretar.
  return parseDate(out) ? out : null
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
  let qty, nth, pct, size, amount, minSpend, soloBurger
  const entero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
  // A qué burgers se aplica: un tamaño (o cualquiera) y, opcionalmente, una sola burger
  const alcance = () => {
    if (hasValue(raw.size)) {
      if (PROMO_SCOPES.includes(raw.size)) size = raw.size
      else errors.size = 'Elegí el tamaño.'
    } else size = 'any'
    if (hasValue(raw.itemName)) {
      const n = typeof raw.itemName === 'string' ? raw.itemName.trim() : ''
      if (n && n.length <= MAX_NAME) soloBurger = n
      else errors.itemName = 'Elegí la burger.'
    }
  }
  const gastoMinimo = () => {
    if (!hasValue(raw.minSpend)) minSpend = 0
    else if (entero(raw.minSpend, 0, MAX_PRICE)) minSpend = raw.minSpend
    else errors.minSpend = 'El gasto mínimo tiene que ser un número entero (0 si no hay mínimo).'
  }
  if (kind === 'bundle') {
    alcance()
    if (entero(raw.qty, 2, 6)) qty = raw.qty
    else errors.qty = 'Cuántas burgers entran en la promo (de 2 a 6).'
    if (isPrice(raw.bundlePrice)) bundlePrice = raw.bundlePrice
    else errors.bundlePrice = 'Cargá el precio del combo (un número entero mayor a 0).'
  } else if (kind === 'nthPct') {
    alcance()
    if (entero(raw.nth, 2, 4)) nth = raw.nth
    else errors.nth = 'Elegí cuál burger lleva el descuento (la 2ª, 3ª o 4ª).'
    if (entero(raw.pct, 1, 100)) pct = raw.pct
    else errors.pct = 'El descuento va de 1% a 100%.'
  } else if (kind === 'pctOff') {
    alcance()
    if (entero(raw.pct, 1, 90)) pct = raw.pct
    else errors.pct = 'El descuento va de 1% a 90%.'
  } else if (kind === 'amountOff') {
    if (isPrice(raw.amount)) amount = raw.amount
    else errors.amount = 'Cargá cuánto se descuenta (un número entero mayor a 0).'
    gastoMinimo()
  } else if (kind === 'freeShipping') {
    gastoMinimo()
  } else if (kind === 'simplesBundle') {
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
  } else if (kind === 'itemPrice') {
    promo.itemName = itemName
    promo.itemSize = itemSize
    promo.specialPrice = specialPrice
  } else if (kind === 'bundle') {
    promo.qty = qty
    promo.size = size
    if (soloBurger) promo.itemName = soloBurger
    promo.bundlePrice = bundlePrice
  } else if (kind === 'nthPct') {
    promo.nth = nth
    promo.pct = pct
    promo.size = size
    if (soloBurger) promo.itemName = soloBurger
  } else if (kind === 'pctOff') {
    promo.pct = pct
    promo.size = size
    if (soloBurger) promo.itemName = soloBurger
  } else if (kind === 'amountOff') {
    promo.amount = amount
    promo.minSpend = minSpend
  } else if (kind === 'freeShipping') {
    promo.minSpend = minSpend
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

// ─── Freno contra precios de promo absurdos ──────────────────────────────
// Una burger sale más de $10.000: una promo a $15 (alguien tipeó "15" en vez de
// "15.000") regalaría la comida. El panel avisa antes de guardar; esto es el freno
// de atrás: el servidor no guarda una promo así y el sitio no la aplica aunque
// llegue por otro camino (un config.json editado a mano).
export const MIN_PROMO_PRICE = 1000

// Precio que la promo le pone a las burgers (el del par de simples o el especial)
export const promoPrice = (p) =>
  p?.kind === 'simplesBundle' ? p.bundlePrice
    : p?.kind === 'bundle' ? p.bundlePrice / p.qty // lo que sale cada burger dentro del combo
      : p?.specialPrice

export const isCheapPromo = (p) => {
  const v = promoPrice(p)
  return typeof v === 'number' && Number.isFinite(v) && v < MIN_PROMO_PRICE
}

// Para la lista ya validada: el primer problema (con el número de promo) o null
export function cheapPromoError(promos) {
  const lista = Array.isArray(promos) ? promos : []
  for (let i = 0; i < lista.length; i++) {
    if (isCheapPromo(lista[i])) {
      return (
        `Promo ${i + 1}: ${money(promoPrice(lista[i]))} es demasiado poco para una promo de burgers ` +
        `(¿le faltan ceros?). Escribilo completo, por ejemplo 15000.`
      )
    }
  }
  return null
}

// ─── Textos derivados ────────────────────────────────────────────────────
// dateLabel es "HOY" si la promo corre hoy, o el día de la semana si es mañana.
// Sin contexto (ctx.dateLabel) sale del día puntual, si lo tiene.
function tituloPorDefecto(dateLabel) {
  if (dateLabel === 'HOY') return 'Promo de Hoy'
  if (dateLabel) return `Promo del ${cap(dateLabel.toLowerCase())}`
  return 'Promo'
}

const PLURAL = { simple: 'simples', doble: 'dobles', triple: 'triples' }
// "burgers", "burgers dobles", "CURRI WHITE" o "CURRI WHITE triple"
const alcanceTexto = (p) =>
  p.itemName
    ? (p.size && p.size !== 'any' ? `${p.itemName} ${p.size}` : p.itemName)
    : (p.size && p.size !== 'any' ? `burgers ${PLURAL[p.size]}` : 'burgers')

// Textos de las promos "genéricas" (combos, % off, monto, envío gratis)
function textosGenericos(p) {
  if (p.kind === 'bundle') {
    const palabra = p.itemName
      ? `${p.itemName}${p.size !== 'any' ? ` ${PLURAL[p.size]}` : ''}`
      : (p.size !== 'any' ? PLURAL[p.size] : 'burgers')
    return { headline: `${p.qty} ${palabra} x ${money(p.bundlePrice)}`, bigPrice: money(p.bundlePrice), bigSub: `${p.qty} ${palabra}` }
  }
  if (p.kind === 'nthPct') {
    if (p.pct === 100 && p.nth === 2) return { headline: `2x1 en ${alcanceTexto(p)}`, bigPrice: '2x1', bigSub: alcanceTexto(p) }
    return { headline: `La ${p.nth}ª con ${p.pct}% off en ${alcanceTexto(p)}`, bigPrice: `${p.pct}%`, bigSub: `OFF en la ${p.nth}ª` }
  }
  if (p.kind === 'pctOff') return { headline: `${p.pct}% off en ${alcanceTexto(p)}`, bigPrice: `${p.pct}%`, bigSub: 'OFF' }
  if (p.kind === 'amountOff') {
    return p.minSpend > 0
      ? { headline: `${money(p.amount)} off desde ${money(p.minSpend)}`, bigPrice: money(p.amount), bigSub: `OFF desde ${money(p.minSpend)}` }
      : { headline: `${money(p.amount)} off en tu pedido`, bigPrice: money(p.amount), bigSub: 'OFF' }
  }
  // freeShipping
  return p.minSpend > 0
    ? { headline: `Envío gratis desde ${money(p.minSpend)}`, bigPrice: 'GRATIS', bigSub: 'el envío' }
    : { headline: 'Envío gratis', bigPrice: 'GRATIS', bigSub: 'el envío' }
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
  } else if (p.kind === 'itemPrice') {
    headline = `${p.itemName} ${p.itemSize} a ${money(p.specialPrice)}`
    ticker = `${p.itemName} ${p.itemSize.toUpperCase()} X ${money(p.specialPrice)}`.toUpperCase()
    bigPrice = money(p.specialPrice)
    bigSub = `${p.itemName} ${p.itemSize}`
  } else {
    const t = textosGenericos(p)
    headline = t.headline
    ticker = headline.toUpperCase()
    bigPrice = t.bigPrice
    bigSub = t.bigSub
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
    const hayHoy = isDateStr(hoy) // sin un "hoy" válido se dice la fecha a secas
    if (hayHoy && p.date === hoy) return 'Hoy'
    if (hayHoy && p.date === addDays(hoy, 1)) return 'Mañana'
    const [y, m, d] = p.date.split('-')
    const anio = hayHoy && hoy.slice(0, 4) !== y ? `/${y}` : ''
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
// `burgerNames` (opcional): los nombres de la carta; una promo de una burger que no
// está ahí se ignora.
export function promosActivas(promos, hoyStr, { burgerNames } = {}) {
  const nada = { active: null, preview: null }
  if (!Array.isArray(promos) || !isDateStr(hoyStr)) return nada
  // Mañana puede no existir (9999-12-31): entonces solo se mira la promo de hoy
  const manana = addDays(hoyStr, 1)
  const etiquetaManana = manana ? DAY_NAMES[weekdayOf(manana)].toUpperCase() : ''
  let active = null
  let preview = null
  for (const raw of promos.slice(0, MAX_PROMOS)) {
    const r = validatePromo(raw)
    if (!r.ok || !r.promo.enabled || isCheapPromo(r.promo)) continue
    // Una burger que no está en la carta (se renombró o se borró) no se puede vender
    // a precio especial: mejor no anunciar nada que anunciar algo que no existe.
    if (r.promo.itemName && Array.isArray(burgerNames) && !burgerNames.includes(r.promo.itemName)) continue
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

// Un precio de carta sano: número finito y no negativo. Si algo llega roto (un precio
// con texto, NaN…) esa línea simplemente no entra en la promo; nunca se inventa un
// descuento con basura.
const esPrecio = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
const cantidadDe = (it) => {
  const n = Math.floor(Number(it.qty))
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Descuento total del carrito. Siempre un número finito entre 0 y lo que suman las
// burgers a su precio base (los extras y las bebidas nunca se descuentan).
export function calcPromoDiscount(items, promo) {
  if (!promo || !Array.isArray(items)) return 0
  const burgers = items.filter((it) => it && esBurger(it))
  let discount = 0
  if (promo.kind === 'simplesBundle' && esPrecio(promo.bundlePrice)) {
    // Cada par de simples sale bundlePrice; se emparejan de mayor a menor precio.
    // Se cuentan por precio (no uno por uno) para que el costo no dependa de la cantidad.
    const porPrecio = new Map()
    for (const it of burgers) {
      const base = precioBase(it)
      const n = cantidadDe(it)
      if (it.size === 'simple' && esPrecio(base) && n > 0) porPrecio.set(base, (porPrecio.get(base) || 0) + n)
    }
    let pendiente = null // un simple esperando pareja (el último de un precio más caro)
    for (const [precio, total] of [...porPrecio].sort((a, b) => b[0] - a[0])) {
      let n = total
      if (pendiente !== null) {
        discount += Math.max(0, pendiente + precio - promo.bundlePrice)
        n -= 1
        pendiente = null
      }
      discount += Math.floor(n / 2) * Math.max(0, precio * 2 - promo.bundlePrice)
      if (n % 2) pendiente = precio
    }
  } else if (promo.kind === 'itemPrice') {
    // Una burger + tamaño puntual baja a specialPrice
    for (const it of burgers) {
      const base = precioBase(it)
      const n = cantidadDe(it)
      if (!esPrecio(base) || !n) continue
      const sp = itemPromoPrice(promo, it.name, it.size, base)
      if (sp != null && esPrecio(sp)) discount += (base - sp) * n
    }
  } else if (['bundle', 'nthPct', 'pctOff'].includes(promo.kind)) {
    // Unidades sueltas de las burgers a las que aplica la promo, de la más cara a la más barata
    const unidades = []
    for (const it of burgers) {
      const base = precioBase(it)
      const n = cantidadDe(it)
      if (!esPrecio(base) || !n) continue
      if (promo.size && promo.size !== 'any' && it.size !== promo.size) continue
      if (promo.itemName && it.name !== promo.itemName) continue
      for (let i = 0; i < n && unidades.length < 500; i++) unidades.push(base)
    }
    unidades.sort((a, b) => b - a)
    if (promo.kind === 'bundle' && esPrecio(promo.bundlePrice) && promo.qty >= 2) {
      // Cada grupo de `qty` sale bundlePrice (se arman con las más caras primero)
      for (let i = 0; i + promo.qty <= unidades.length; i += promo.qty) {
        const suma = unidades.slice(i, i + promo.qty).reduce((t, x) => t + x, 0)
        discount += Math.max(0, suma - promo.bundlePrice)
      }
    } else if (promo.kind === 'nthPct' && promo.nth >= 2 && promo.pct > 0) {
      // De cada grupo de `nth` burgers, la más barata lleva el descuento
      for (let i = promo.nth - 1; i < unidades.length; i += promo.nth) discount += Math.round((unidades[i] * promo.pct) / 100)
    } else if (promo.kind === 'pctOff' && promo.pct > 0) {
      discount += Math.round((unidades.reduce((t, x) => t + x, 0) * promo.pct) / 100)
    }
  } else if (promo.kind === 'amountOff') {
    const base = burgers.reduce((t, it) => (esPrecio(precioBase(it)) ? t + precioBase(it) * cantidadDe(it) : t), 0)
    if (base > 0 && base >= (promo.minSpend || 0) && esPrecio(promo.amount)) discount = promo.amount
  }
  // Tope de seguridad: jamás más que las burgers a precio base
  const tope = burgers.reduce((s, it) => {
    const base = precioBase(it)
    return esPrecio(base) ? s + base * cantidadDe(it) : s
  }, 0)
  return Number.isFinite(discount) ? Math.min(Math.max(discount, 0), tope) : 0
}

// ¿La promo de hoy deja el envío gratis? `subtotal` = lo que suma el pedido (burgers,
// extras y bebidas) antes del descuento. Sin zona elegida o con retiro no hay nada que bonificar.
export function envioGratis(promo, subtotal) {
  return !!promo && promo.kind === 'freeShipping' && Number.isFinite(subtotal) && subtotal >= (promo.minSpend || 0)
}
