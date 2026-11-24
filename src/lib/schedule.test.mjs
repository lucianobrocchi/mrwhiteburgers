// Tests del horario del local.   node --test src/lib/schedule.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SCHEDULE, validateSchedule, scheduleOf, scheduleSummary, getStatus } from './schedule.js'
import { horariosEnFrase, faqList } from './faq.js'

// Noviembre 2026: el 25 es miércoles. Fechas con la hora local de quien mira la web.
const el = (dia, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2026, 10, dia, h, m)
}
const DOM = 22, LUN = 23, MAR = 24, MIE = 25, SAB = 28

test('horario por defecto: miércoles a domingo de 19:00 a 23:00, lunes y martes cerrado', () => {
  assert.deepEqual(scheduleSummary(), [
    { label: 'Miércoles a domingo', hours: '19:00 a 23:00', closed: false, days: [3, 4, 5, 6, 0] },
    { label: 'Lunes y martes', hours: 'cerrado', closed: true, days: [1, 2] },
  ])
  assert.equal(horariosEnFrase(), 'Abrimos de miércoles a domingo, de 19:00 a 23:00 y los lunes y martes cerramos')
  assert.match(faqList()[1].a, /miércoles a domingo/)
})

test('abierto/cerrado con el horario por defecto', () => {
  assert.deepEqual(getStatus(el(MIE, '18:30')), { open: false, opensAt: '19:00', opensLabel: 'hoy', day: 3 })
  assert.deepEqual(getStatus(el(MIE, '19:00')), { open: true, closesAt: '23:00', day: 3 })
  assert.deepEqual(getStatus(el(SAB, '22:59')), { open: true, closesAt: '23:00', day: 6 })
  // el domingo después de cerrar, el lunes y el martes: vuelve a abrir el miércoles
  assert.deepEqual(getStatus(el(DOM, '23:00')), { open: false, opensAt: '19:00', opensLabel: 'miércoles', day: 0 })
  assert.deepEqual(getStatus(el(LUN, '20:00')), { open: false, opensAt: '19:00', opensLabel: 'miércoles', day: 1 })
  assert.deepEqual(getStatus(el(MAR, '20:00')), { open: false, opensAt: '19:00', opensLabel: 'mañana', day: 2 })
})

test('valida el horario que carga Joaco', () => {
  assert.deepEqual(validateSchedule(null), { ok: true, schedule: null })
  const ok = validateSchedule({ ...DEFAULT_SCHEDULE, 1: [{ from: '20:00', to: '00:30', sobra: 1 }] })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.schedule[1], [{ from: '20:00', to: '00:30' }])
  assert.deepEqual(ok.schedule[2], [])
  for (const malo of [
    { 3: [{ from: '19:00', to: '' }] },
    { 3: [{ from: '7', to: '23:00' }] },
    { 3: [{ from: '24:00', to: '23:00' }] },
    { 3: [{ from: '19:00', to: '19:00' }] },
    { 3: 'abierto' },
    { 3: [1, 2, 3, 4].map(() => ({ from: '19:00', to: '20:00' })) },
    'lunes a viernes',
    [],
  ]) {
    const r = validateSchedule(malo)
    assert.equal(r.ok, false, JSON.stringify(malo))
    assert.ok(r.error)
  }
})

test('la web usa el horario del panel; si está roto o no hay, el por defecto', () => {
  const todos = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [{ from: '19:00', to: '23:00' }]]))
  assert.deepEqual(scheduleOf({ schedule: todos }), todos)
  assert.equal(scheduleSummary(scheduleOf({ schedule: todos }))[0].label, 'Todos los días')
  assert.equal(horariosEnFrase(todos), 'Abrimos todos los días, de 19:00 a 23:00')
  assert.equal(scheduleOf({}), DEFAULT_SCHEDULE)
  assert.equal(scheduleOf({ schedule: { 3: [{ from: 'x', to: 'y' }] } }), DEFAULT_SCHEDULE)
  assert.equal(scheduleOf(null), DEFAULT_SCHEDULE)
})

test('turno que cruza la medianoche y días sueltos', () => {
  // viernes y sábado de 20:00 a 01:00; el resto cerrado
  const finde = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [{ from: '20:00', to: '01:00' }], 6: [{ from: '20:00', to: '01:00' }] }
  assert.deepEqual(getStatus(new Date(2026, 10, 29, 0, 30), null, finde), { open: true, closesAt: '01:00', day: 0 }) // domingo 00:30, sigue el turno del sábado
  assert.deepEqual(getStatus(new Date(2026, 10, 29, 1, 0), null, finde), { open: false, opensAt: '20:00', opensLabel: 'viernes', day: 0 })
  assert.equal(horariosEnFrase(finde), 'Abrimos los viernes y sábados, de 20:00 a 01:00 y de domingo a jueves cerramos')
  const soloSabado = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [{ from: '19:00', to: '23:00' }] }
  assert.equal(horariosEnFrase(soloSabado), 'Abrimos los sábados, de 19:00 a 23:00 y de domingo a viernes cerramos')
})

test('"hoy abrimos distinto" desde el panel en un día que normalmente no abre', () => {
  // lunes (cerrado) con excepción "hoy abrimos 20:00": toma el cierre de un día que abre
  const s = getStatus(el(LUN, '21:00'), { opensAt: '20:00' })
  assert.deepEqual(s, { open: true, closesAt: '23:00', note: '', day: 1 })
})
