// ─── Horarios del local ──────────────────────────────────────────────────
// El horario de la semana se cambia desde el panel (pestaña Hoy → "Horario de la
// semana") y se guarda en la config (`cfg.schedule`). Este bloque es el horario POR
// DEFECTO: el que se usa si en el panel nunca se tocó (o se volvió al original) y el
// que va en los datos para Google que se arman al publicar la web.
// Formato 24hs. Un turno que cruza la medianoche se escribe { from: '20:00', to: '01:00' }
// y se entiende que cierra a la 01:00 del día siguiente.
// Días: 0 = domingo, 1 = lunes … 6 = sábado. Lista vacía = ese día no se abre.

export const ADDRESS = {
  label: '27 esq. 80',
  barrio: 'Altos de San Lorenzo',
  city: 'La Plata',
  // Cruce real de calle 27 y calle 80, medido sobre OpenStreetMap.
  lat: -34.955912,
  lng: -57.940273,
}

export const DEFAULT_SCHEDULE = {
  0: [{ from: '19:00', to: '23:00' }], // domingo
  1: [],                               // lunes — CERRADO
  2: [],                               // martes — CERRADO
  3: [{ from: '19:00', to: '23:00' }], // miércoles
  4: [{ from: '19:00', to: '23:00' }], // jueves
  5: [{ from: '19:00', to: '23:00' }], // viernes
  6: [{ from: '19:00', to: '23:00' }], // sábado
}
// Nombre de siempre (lo usan los datos para Google y las pruebas)
export const SCHEDULE = DEFAULT_SCHEDULE

export const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const DIAS = [0, 1, 2, 3, 4, 5, 6]
const MAX_TURNOS = 3

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

// ─── Validación (la usan el panel antes de guardar y el servidor al recibir) ──
// Devuelve { ok: true, schedule } con el horario limpio, o { ok: false, error } con un
// mensaje para Joaco. `null`/`undefined` = "usar el horario por defecto" (válido).
export function validateSchedule(raw) {
  if (raw == null) return { ok: true, schedule: null }
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'El horario no tiene un formato válido.' }
  const schedule = {}
  for (const d of DIAS) {
    const turnos = raw[d] ?? raw[String(d)] ?? []
    if (!Array.isArray(turnos) || turnos.length > MAX_TURNOS) {
      return { ok: false, error: `El horario del ${DAY_NAMES[d]} no tiene un formato válido.` }
    }
    schedule[d] = []
    for (const t of turnos) {
      const from = String(t?.from ?? '')
      const to = String(t?.to ?? '')
      if (!HORA.test(from) || !HORA.test(to)) {
        return { ok: false, error: `Falta la hora de apertura o de cierre del ${DAY_NAMES[d]}.` }
      }
      if (from === to) {
        return { ok: false, error: `El ${DAY_NAMES[d]} abre y cierra a la misma hora (${from}).` }
      }
      schedule[d].push({ from, to })
    }
  }
  return { ok: true, schedule }
}

// El horario que rige: el guardado en el panel si es válido; si no, el por defecto.
export function scheduleOf(cfg) {
  const v = validateSchedule(cfg?.schedule)
  return v.ok && v.schedule ? v.schedule : DEFAULT_SCHEDULE
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Texto lindo para la web: agrupa los días seguidos con el mismo horario.
export function scheduleSummary(schedule = DEFAULT_SCHEDULE) {
  const out = []
  for (let d = 0; d < 7; d++) {
    const key = schedule[d].map((t) => `${t.from}-${t.to}`).join(',')
    const last = out[out.length - 1]
    if (last && last.key === key) last.days.push(d)
    else out.push({ key, days: [d], turns: schedule[d] })
  }
  // La semana arranca en domingo, pero "miércoles a domingo" es un solo tramo que
  // da la vuelta: si el primero y el último grupo son iguales, los unimos.
  if (out.length > 2 && out[0].key === out[out.length - 1].key) {
    const ultimo = out.pop()
    out[0] = { ...out[0], days: [...ultimo.days, ...out[0].days] }
  }
  // Los días abiertos primero: "Miércoles a domingo" arriba de "Lunes y martes · cerrado"
  out.sort((a, b) => (a.turns.length ? 0 : 1) - (b.turns.length ? 0 : 1))
  return out.map((g) => {
    const first = DAY_NAMES[g.days[0]]
    const lastD = DAY_NAMES[g.days[g.days.length - 1]]
    const label = g.days.length === 7
      ? 'Todos los días'
      : cap(g.days.length === 1 ? first : g.days.length === 2 ? `${first} y ${lastD}` : `${first} a ${lastD}`)
    const hours = g.turns.length
      ? g.turns.map((t) => `${t.from} a ${t.to}`).join(' y ')
      : 'cerrado'
    return { label, hours, closed: !g.turns.length, days: g.days }
  })
}

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// ?abierto=1 / ?abierto=0 fuerza el estado (para probar sin esperar la hora).
function forzadoPorUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get('abierto')
    if (v === '1') return true
    if (v === '0') return false
  } catch { /* sin window */ }
  return null
}

const fmt = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// Próximo turno de apertura. `saltarHoy` sirve cuando hoy se cerró por excepción.
function proximaApertura(schedule, day, nowAbs, saltarHoy = false) {
  for (let off = saltarHoy ? 1 : 0; off <= 7; off++) {
    const d = (day + off) % 7
    for (const t of schedule[d]) {
      const from = (day + off) * 1440 + toMin(t.from)
      if (from > nowAbs) {
        return {
          opensAt: t.from,
          opensLabel: off === 0 ? 'hoy' : off === 1 ? 'mañana' : DAY_NAMES[d],
        }
      }
    }
  }
  return { opensAt: null, opensLabel: '' }
}

// Estado actual del local.
//   { open, closesAt, opensAt, opensDay, opensLabel }
// `override` viene del panel y solo aplica al día de hoy:
//   { closed, opensAt, closesAt, note }
// `schedule` es el horario de la semana que rige (ver scheduleOf).
export function getStatus(now = new Date(), override = null, schedule = DEFAULT_SCHEDULE) {
  const day = now.getDay()
  const nowAbs = day * 1440 + now.getHours() * 60 + now.getMinutes()

  // Excepción del día cargada desde el panel
  if (override) {
    if (override.closed) {
      const prox = proximaApertura(schedule, day, nowAbs, true)
      return { open: false, note: override.note || '', ...prox, day }
    }
    if (override.opensAt || override.closesAt) {
      // Hoy no abría y se cargó un horario: de base, el turno de otro día que sí abre
      const base = schedule[day][0] || DIAS.map((d) => schedule[d][0]).find(Boolean) || DEFAULT_SCHEDULE[0][0]
      const from = toMin(override.opensAt || base.from)
      let to = toMin(override.closesAt || base.to)
      if (to <= from) to += 1440
      const mins = now.getHours() * 60 + now.getMinutes()
      if (mins >= from && mins < to) {
        return { open: true, closesAt: fmt(to), note: override.note || '', day }
      }
      if (mins < from) {
        return { open: false, opensAt: fmt(from), opensLabel: 'hoy', note: override.note || '', day }
      }
    }
  }

  // Turnos de ayer, hoy y mañana: ayer cubre el turno que cruza la medianoche
  // y sigue abierto ahora; mañana sirve para saber cuándo vuelve a abrir.
  const turns = []
  for (const offset of [-1, 0, 1]) {
    const d = (day + offset + 7) % 7
    for (const t of schedule[d]) {
      const base = (day + offset) * 1440
      const from = base + toMin(t.from)
      let to = base + toMin(t.to)
      if (to <= from) to += 1440
      turns.push({ from, to, day: d, raw: t })
    }
  }

  const forced = forzadoPorUrl()
  const current = turns.find((t) => nowAbs >= t.from && nowAbs < t.to)
  const open = forced !== null ? forced : !!current

  if (open) {
    const t = current || turns.find((x) => x.to > nowAbs) || turns[0]
    return { open: true, closesAt: t ? fmt(t.to) : null, day }
  }

  // Cerrado: el próximo turno, mirando toda la semana (no solo mañana: con lunes y
  // martes cerrados, el domingo a la noche tiene que decir "abre el miércoles")
  const prox = proximaApertura(schedule, day, nowAbs)
  if (!prox.opensAt) return { open: false, opensAt: null, opensLabel: 'Consultanos por WhatsApp', day }
  return { open: false, ...prox, day }
}
