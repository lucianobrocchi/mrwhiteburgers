// ─── Horarios del local ──────────────────────────────────────────────────
// Editá SOLO este bloque para cambiar los horarios. Formato 24hs.
// Un turno que cruza la medianoche se escribe { from: '19:30', to: '22:30' }
// y se entiende que cierra a las 00:00 del día siguiente.
// Días: 0 = domingo, 1 = lunes … 6 = sábado.

export const ADDRESS = {
  label: '27 esq. 80',
  barrio: 'Altos de San Lorenzo',
  city: 'La Plata',
  // Cruce real de calle 27 y calle 80, medido sobre OpenStreetMap.
  lat: -34.955912,
  lng: -57.940273,
}

export const SCHEDULE = {
  0: [{ from: '19:30', to: '22:30' }], // domingo
  1: [{ from: '19:30', to: '22:30' }], // lunes
  2: [],                               // martes — CERRADO
  3: [{ from: '19:30', to: '22:30' }], // miércoles
  4: [{ from: '19:30', to: '22:30' }], // jueves
  5: [{ from: '19:30', to: '22:30' }], // viernes
  6: [{ from: '19:30', to: '22:30' }], // sábado
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Texto lindo para el footer: agrupa los días seguidos con el mismo horario.
export function scheduleSummary() {
  const out = []
  for (let d = 0; d < 7; d++) {
    const key = SCHEDULE[d].map((t) => `${t.from}-${t.to}`).join(',')
    const last = out[out.length - 1]
    if (last && last.key === key) last.days.push(d)
    else out.push({ key, days: [d], turns: SCHEDULE[d] })
  }
  return out.map((g) => {
    const first = DAY_NAMES[g.days[0]]
    const lastD = DAY_NAMES[g.days[g.days.length - 1]]
    const label = g.days.length === 1 ? first : `${first} a ${lastD}`
    const hours = g.turns.length
      ? g.turns.map((t) => `${t.from} a ${t.to}`).join(' y ')
      : 'cerrado'
    return { label, hours, closed: !g.turns.length }
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
function proximaApertura(day, nowAbs, saltarHoy = false) {
  for (let off = saltarHoy ? 1 : 0; off <= 7; off++) {
    const d = (day + off) % 7
    for (const t of SCHEDULE[d]) {
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
export function getStatus(now = new Date(), override = null) {
  const day = now.getDay()
  const nowAbs = day * 1440 + now.getHours() * 60 + now.getMinutes()

  // Excepción del día cargada desde el panel
  if (override) {
    if (override.closed) {
      const prox = proximaApertura(day, nowAbs, true)
      return { open: false, note: override.note || '', ...prox, day }
    }
    if (override.opensAt || override.closesAt) {
      const base = SCHEDULE[day][0] || { from: '19:30', to: '22:30' }
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
    for (const t of SCHEDULE[d]) {
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
    return { open: true, closesAt: fmt(t.to), day }
  }

  const next = turns
    .filter((t) => t.from > nowAbs)
    .sort((a, b) => a.from - b.from)[0]

  if (!next) return { open: false, opensAt: null, opensLabel: 'Consultanos por WhatsApp', day }

  const daysAhead = Math.floor(next.from / 1440) - day
  const opensLabel =
    daysAhead <= 0 ? 'hoy' : daysAhead === 1 ? 'mañana' : DAY_NAMES[next.day]

  return { open: false, opensAt: fmt(next.from), opensLabel, day }
}
