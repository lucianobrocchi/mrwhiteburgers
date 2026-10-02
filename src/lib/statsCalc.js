// ─── Estadísticas de pedidos ─────────────────────────────────────────────
// Funciones puras: reciben la lista de pedidos y devuelven todo lo que muestra
// el panel. Un "pedido" es lo que el cliente envía por WhatsApp desde la web
// (no confirma que se haya concretado el pago).
//
// Forma de cada pedido (ver server/panel-core.js):
//   { id, at, d:'AAAA-MM-DD', h:hora, w:díaSemana(0=dom), total, subtotal, discount,
//     promo, zoneId, zone, src, items:[{ k:'b'|'d', id, n, s, sl, f, q, u, x:[{id,n,q,p}] }] }

export const TZ = 'America/Argentina/Buenos_Aires'
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0] // lunes a domingo

// ─── Fechas (AAAA-MM-DD, hora de Argentina) ──────────────────────────────
const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
export const hoyART = (now = new Date()) => fmtDia.format(now)

export function sumarDias(ds, n) {
  const t = new Date(`${ds}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

export function listarDias(desde, hasta) {
  const out = []
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) out.push(d)
  return out
}

export const diaSemanaDe = (ds) => new Date(`${ds}T12:00:00Z`).getUTCDay()

// ─── Rangos ──────────────────────────────────────────────────────────────
export const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: '7', label: '7 días', dias: 7 },
  { id: '30', label: '30 días', dias: 30 },
  { id: 'todo', label: 'Todo', dias: null },
]

export function limitesDeRango(rangoId, orders, now = new Date()) {
  const hoy = hoyART(now)
  const r = RANGOS.find((x) => x.id === rangoId) || RANGOS[1]
  if (r.dias == null) {
    const primero = orders.length ? orders.reduce((m, o) => (o.d < m ? o.d : m), hoy) : hoy
    return { desde: primero, hasta: hoy, previo: null }
  }
  const desde = sumarDias(hoy, -(r.dias - 1))
  return {
    desde,
    hasta: hoy,
    previo: { desde: sumarDias(desde, -r.dias), hasta: sumarDias(desde, -1) }, // el período anterior, igual de largo
  }
}

const enRango = (orders, desde, hasta) => orders.filter((o) => o.d >= desde && o.d <= hasta)

// ─── Piezas de cálculo ───────────────────────────────────────────────────
const suma = (arr, f) => arr.reduce((s, x) => s + f(x), 0)
const pct = (parte, todo) => (todo > 0 ? (parte / todo) * 100 : 0)
const promedio = (arr, f) => (arr.length ? suma(arr, f) / arr.length : 0)

const burgersDe = (o) => o.items.filter((i) => i.k !== 'd')
const bebidasDe = (o) => o.items.filter((i) => i.k === 'd')
const extrasDe = (o) => burgersDe(o).flatMap((i) => (i.x || []).map((e) => ({ ...e, mult: i.q })))
const tieneExtras = (o) => extrasDe(o).length > 0
const tieneBebida = (o) => bebidasDe(o).length > 0

export function kpis(orders) {
  const ventas = suma(orders, (o) => o.total)
  return {
    pedidos: orders.length,
    ventas,
    ticket: orders.length ? ventas / orders.length : 0,
    burgers: suma(orders, (o) => suma(burgersDe(o), (i) => i.q)),
    bebidas: suma(orders, (o) => suma(bebidasDe(o), (i) => i.q)),
    descuentos: suma(orders, (o) => o.discount || 0),
  }
}

// Variación porcentual contra el período anterior; null si no hay con qué comparar
export function variacion(actual, previo) {
  if (previo == null || !(previo > 0)) return null
  return ((actual - previo) / previo) * 100
}

function agrupar(orders, claveDe) {
  const m = new Map()
  for (const o of orders) {
    const k = claveDe(o)
    const g = m.get(k) || { clave: k, pedidos: 0, ventas: 0 }
    g.pedidos += 1
    g.ventas += o.total
    m.set(k, g)
  }
  return [...m.values()]
}

// ─── Todo junto ──────────────────────────────────────────────────────────
export function calcular(orders, rangoId, now = new Date()) {
  const { desde, hasta, previo } = limitesDeRango(rangoId, orders, now)
  const act = enRango(orders, desde, hasta)
  const prev = previo ? enRango(orders, previo.desde, previo.hasta) : null
  const k = kpis(act)
  const kPrev = prev ? kpis(prev) : null

  // Pedidos por día (rellena con 0 los días sin pedidos)
  const dias = listarDias(desde, hasta)
  const porDiaMap = new Map(agrupar(act, (o) => o.d).map((g) => [g.clave, g]))
  const porDia = dias.map((d) => ({ d, w: diaSemanaDe(d), pedidos: porDiaMap.get(d)?.pedidos || 0, ventas: porDiaMap.get(d)?.ventas || 0 }))

  // Por día de la semana (lunes a domingo) — cuántos pedidos y cuántos días de ese tipo hubo
  const porSemana = ORDEN_SEMANA.map((w) => {
    const pedidos = act.filter((o) => o.w === w)
    return { w, pedidos: pedidos.length, ventas: suma(pedidos, (o) => o.total) }
  })

  // Por hora: ventana que cubre el horario de atención y cualquier pedido fuera de él
  const horas = act.map((o) => o.h)
  const hMin = Math.min(19, ...(horas.length ? horas : [19]))
  const hMax = Math.max(22, ...(horas.length ? horas : [22]))
  const porHora = []
  for (let h = hMin; h <= hMax; h++) porHora.push({ h, pedidos: act.filter((o) => o.h === h).length })

  // Burgers
  const bMap = new Map()
  for (const o of act) {
    for (const i of burgersDe(o)) {
      const g = bMap.get(i.id) || { id: i.id, nombre: i.n, unidades: 0, ventas: 0 }
      g.unidades += i.q
      g.ventas += i.u * i.q
      g.nombre = i.n
      bMap.set(i.id, g)
    }
  }
  const totalBurgers = k.burgers
  const burgers = [...bMap.values()]
    .sort((a, b) => b.unidades - a.unidades || b.ventas - a.ventas)
    .map((g) => ({ ...g, pct: pct(g.unidades, totalBurgers) }))

  // Tamaños
  const tamanos = { simple: 0, doble: 0, triple: 0 }
  for (const o of act) for (const i of burgersDe(o)) if (i.s in tamanos) tamanos[i.s] += i.q

  // Extras
  const eMap = new Map()
  for (const o of act) {
    for (const e of extrasDe(o)) {
      const g = eMap.get(e.id) || { id: e.id, nombre: e.n, unidades: 0, ventas: 0 }
      g.unidades += e.q * e.mult
      g.ventas += e.p * e.q * e.mult
      eMap.set(e.id, g)
    }
  }
  const conExtras = act.filter(tieneExtras)
  const extras = {
    pedidos: conExtras.length,
    pct: pct(conExtras.length, act.length),
    unidades: suma([...eMap.values()], (g) => g.unidades),
    ventas: suma([...eMap.values()], (g) => g.ventas),
    ranking: [...eMap.values()].sort((a, b) => b.unidades - a.unidades),
  }

  // Bebidas
  const dMap = new Map()
  for (const o of act) {
    for (const i of bebidasDe(o)) {
      const nombre = `${i.n} ${i.sl}`.trim()
      const g = dMap.get(nombre) || { nombre, unidades: 0, ventas: 0 }
      g.unidades += i.q
      g.ventas += i.u * i.q
      dMap.set(nombre, g)
    }
  }
  const conBebida = act.filter(tieneBebida)
  const bebidas = {
    pedidos: conBebida.length,
    pct: pct(conBebida.length, act.length),
    unidades: k.bebidas,
    ventas: suma([...dMap.values()], (g) => g.ventas),
    ranking: [...dMap.values()].sort((a, b) => b.unidades - a.unidades),
  }

  // Cómo reciben el pedido
  const retiro = act.filter((o) => o.zoneId === 'retiro')
  const aCoordinar = act.filter((o) => o.zoneId === 'otra')
  const sinElegir = act.filter((o) => !o.zoneId)
  const conEnvio = act.filter((o) => o.zoneId && o.zoneId !== 'retiro' && o.zoneId !== 'otra')
  const zonas = agrupar(act, (o) => o.zone || 'Sin elegir')
    .sort((a, b) => b.pedidos - a.pedidos)
    .map((g) => ({ nombre: g.clave, pedidos: g.pedidos, ventas: g.ventas, pct: pct(g.pedidos, act.length) }))
  const entrega = {
    envio: conEnvio.length + aCoordinar.length,
    retiro: retiro.length,
    sinElegir: sinElegir.length,
    pctEnvio: pct(conEnvio.length + aCoordinar.length, act.length),
    pctRetiro: pct(retiro.length, act.length),
  }

  // De dónde vienen
  const origenes = agrupar(act, (o) => o.src || 'directo')
    .sort((a, b) => b.pedidos - a.pedidos)
    .map((g) => ({ src: g.clave, pedidos: g.pedidos, ventas: g.ventas, pct: pct(g.pedidos, act.length) }))

  // Ticket según lo que sumaron
  const ticket = {
    conExtras: promedio(conExtras, (o) => o.total),
    sinExtras: promedio(act.filter((o) => !tieneExtras(o)), (o) => o.total),
    nConExtras: conExtras.length,
    nSinExtras: act.length - conExtras.length,
    conBebida: promedio(conBebida, (o) => o.total),
    sinBebida: promedio(act.filter((o) => !tieneBebida(o)), (o) => o.total),
    nConBebida: conBebida.length,
    nSinBebida: act.length - conBebida.length,
  }

  const promos = {
    pedidos: act.filter((o) => (o.discount || 0) > 0).length,
    descuentos: k.descuentos,
  }

  // Lo "mejor"
  const mejorDiaSemana = [...porSemana].sort((a, b) => b.pedidos - a.pedidos)[0]
  const mejorHora = [...porHora].sort((a, b) => b.pedidos - a.pedidos)[0]
  const mejorDia = [...porDia].sort((a, b) => b.ventas - a.ventas)[0]
  const diasConPedidos = porDia.filter((d) => d.pedidos > 0).length

  // Acumulado de todo lo cargado (para el cartel "lo que aporta la web")
  const todos = kpis(orders)
  const primero = orders.length ? orders.reduce((m, o) => (o.d < m ? o.d : m), orders[0].d) : null
  const diasActivos = new Set(orders.map((o) => o.d)).size

  return {
    rango: { desde, hasta, dias: dias.length },
    actual: k,
    previo: kPrev,
    delta: {
      pedidos: variacion(k.pedidos, kPrev?.pedidos),
      ventas: variacion(k.ventas, kPrev?.ventas),
      ticket: variacion(k.ticket, kPrev?.ticket),
      burgers: variacion(k.burgers, kPrev?.burgers),
    },
    porDia, porSemana, porHora,
    burgers, tamanos, extras, bebidas,
    entrega, zonas, origenes, ticket, promos,
    mejor: { diaSemana: mejorDiaSemana, hora: mejorHora, dia: mejorDia, diasConPedidos },
    acumulado: { ...todos, desde: primero, diasActivos, porDiaActivo: diasActivos ? todos.ventas / diasActivos : 0 },
    vacio: act.length === 0,
    hayDatos: orders.length > 0,
  }
}

// ─── Frases automáticas ("lo que dicen los números") ─────────────────────
// Solo se dicen cuando hay datos suficientes para que no sean ruido.
const $ = (n) => '$' + Math.round(n).toLocaleString('es-AR')
const MIN_PEDIDOS = 5

export function frases(s, nombreOrigen = (x) => x) {
  const out = []
  const n = s.actual.pedidos
  if (n < MIN_PEDIDOS) return out

  const sem = s.mejor.diaSemana
  if (sem && sem.pedidos > 0 && s.rango.dias >= 7) {
    const dia = DIAS_LARGO[sem.w]
    const plural = dia.endsWith('s') ? dia : `${dia}s` // lunes, martes… ya vienen en plural
    out.push(`Los ${plural} concentran el ${Math.round(pct(sem.pedidos, n))}% de los pedidos.`)
  }
  const hr = s.mejor.hora
  if (hr && hr.pedidos > 0) {
    out.push(`La hora pico es ${String(hr.h).padStart(2, '0')}:00 a ${String(hr.h + 1).padStart(2, '0')}:00 (${Math.round(pct(hr.pedidos, n))}% de los pedidos).`)
  }
  const top = s.burgers[0]
  if (top && s.actual.burgers >= MIN_PEDIDOS) {
    out.push(`${top.nombre} es la más pedida: ${Math.round(top.pct)}% de las burgers vendidas.`)
  }
  if (s.extras.pedidos > 0) {
    out.push(`El ${Math.round(s.extras.pct)}% de los pedidos suma algún extra: ${$(s.extras.ventas)} extra facturados.`)
  }
  const t = s.ticket
  if (t.nConBebida >= 2 && t.nSinBebida >= 2 && t.sinBebida > 0 && t.conBebida > t.sinBebida) {
    out.push(`Los pedidos con bebida valen ${Math.round(((t.conBebida - t.sinBebida) / t.sinBebida) * 100)}% más (${$(t.conBebida)} contra ${$(t.sinBebida)}).`)
  }
  if (t.nConExtras >= 2 && t.nSinExtras >= 2 && t.sinExtras > 0 && t.conExtras > t.sinExtras) {
    out.push(`Con extras el pedido sube ${Math.round(((t.conExtras - t.sinExtras) / t.sinExtras) * 100)}% (${$(t.conExtras)} contra ${$(t.sinExtras)}).`)
  }
  const e = s.entrega
  if (e.envio + e.retiro >= MIN_PEDIDOS) {
    out.push(`${Math.round(e.pctEnvio)}% de los pedidos son con envío y ${Math.round(e.pctRetiro)}% retiran en el local.`)
  }
  const o = s.origenes[0]
  if (o && s.origenes.length > 1) {
    out.push(`${nombreOrigen(o.src)} es de donde más llegan: ${Math.round(o.pct)}% de los pedidos (${$(o.ventas)}).`)
  }
  return out
}

// ─── Exportar a CSV (una fila por ítem, para abrir en Excel / Sheets) ────
export function aCSV(orders) {
  const esc = (v) => {
    const t = String(v ?? '')
    return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const cab = ['fecha', 'hora', 'pedido', 'tipo', 'producto', 'tamaño', 'cantidad', 'precio_unitario', 'extras', 'zona', 'origen', 'total_pedido']
  const filas = [cab.join(';')]
  for (const o of [...orders].reverse()) {
    for (const i of o.items) {
      const extras = (i.x || []).map((e) => `${e.q}x ${e.n}`).join(' + ')
      filas.push([
        o.d, `${String(o.h).padStart(2, '0')}:00`, o.id, i.k === 'd' ? 'bebida' : 'burger',
        i.n, i.sl || i.s, i.q, i.u, extras, o.zone || '', o.src || '', o.total,
      ].map(esc).join(';'))
    }
  }
  return '﻿' + filas.join('\n') // BOM para que Excel respete los acentos
}
