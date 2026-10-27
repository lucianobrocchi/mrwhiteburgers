// Tests de las promos. Se corren con:   node --test src/lib/promos.test.mjs
//
// Primero fijan el comportamiento que el sitio tenía ANTES de mover las promos al
// panel: la lógica vieja (la que vivía en CartContext.jsx) está copiada acá abajo
// tal cual, y cada caso se corre contra la vieja y contra la nueva (src/lib/promos.js)
// para comprobar que dan lo mismo. Si alguna vez una de las dos cambia, estos tests
// avisan: un descuento mal calculado es plata del local.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as P from './promos.js'

// ─── Lógica VIEJA (CartContext.jsx antes del panel de promos) ────────────
// Única diferencia: la promo llega por parámetro en vez de salir de la constante
// de módulo ACTIVE_PROMO.
const legacy = {
  localDateStr(d) {
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  },
  // resolvePromos(): PROMOS atadas a una fecha (dateStr), hoy y mañana
  resolve(PROMOS, todayStr) {
    const tomorrowStr = legacy.localDateStr(new Date(new Date(`${todayStr}T12:00:00`).getTime() + 86400000))
    return {
      active: PROMOS.find((p) => p.dateStr === todayStr) || null,
      preview: PROMOS.find((p) => p.dateStr === tomorrowStr) || null,
    }
  },
  itemPromoPrice(promo, name, size, price) {
    const p = promo
    if (p && p.kind === 'itemPrice' && p.itemName === name && p.itemSize === size && price > p.specialPrice) {
      return p.specialPrice
    }
    return null
  },
  calcPromoDiscount(items, promo) {
    const esBurger = (it) => (it.kind ?? 'burger') === 'burger'
    const precioBase = (it) => it.basePrice ?? it.price
    if (!promo) return 0
    const burgers = items.filter(esBurger)
    let discount = 0
    if (promo.kind === 'simplesBundle') {
      const simples = []
      for (const it of burgers) {
        for (let i = 0; i < it.qty; i++) if (it.size === 'simple') simples.push(precioBase(it))
      }
      simples.sort((a, b) => b - a)
      for (let i = 0; i + 1 < simples.length; i += 2) {
        discount += Math.max(0, simples[i] + simples[i + 1] - promo.bundlePrice)
      }
    } else if (promo.kind === 'itemPrice') {
      for (const it of burgers) {
        const base = precioBase(it)
        const sp = legacy.itemPromoPrice(promo, it.name, it.size, base)
        if (sp != null) discount += (base - sp) * it.qty
      }
    }
    return discount
  },
}

// ─── Armado de ítems como los arma el carrito ────────────────────────────
const burger = (name, size, base, qty = 1, extrasUnit = 0) => ({
  kind: 'burger', name, size, qty, basePrice: base, price: base + extrasUnit,
})
const bebida = (name, size, price, qty = 1) => ({
  kind: 'drink', name, size, qty, basePrice: price, price,
})

const BUNDLE = { kind: 'simplesBundle', bundlePrice: 15000 }
const CURRI_TRIPLE = { kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: 15000 }

// ─── Descuento del carrito ───────────────────────────────────────────────
// [descripción, ítems, promo, descuento esperado]
const CASOS_DESCUENTO = [
  ['sin promo no hay descuento', [burger('CURRI WHITE', 'simple', 13500, 2)], null, 0],
  ['carrito vacío', [], BUNDLE, 0],
  ['bundle: 1 simple no alcanza para el par', [burger('CURRI WHITE', 'simple', 13500)], BUNDLE, 0],
  ['bundle: 2 simples iguales (27.000 → 15.000)', [burger('CURRI WHITE', 'simple', 13500, 2)], BUNDLE, 12000],
  ['bundle: 2 simples en dos líneas distintas', [burger('CURRI WHITE', 'simple', 13500), burger('OBRERA', 'simple', 12500)], BUNDLE, 11000],
  ['bundle: 3 simples, el tercero se paga entero', [burger('CURRI WHITE', 'simple', 13500, 2), burger('LA CHEESE JOA', 'simple', 12000)], BUNDLE, 12000],
  [
    'bundle: 4 simples con precios distintos se emparejan de mayor a menor',
    // ordenados: 13500, 13500, 12500, 12000 → (27000-15000) + (24500-15000)
    [burger('OBRERA', 'simple', 12500), burger('LA CHEESE JOA', 'simple', 12000), burger('CURRI WHITE', 'simple', 13500, 2)],
    BUNDLE, 21500,
  ],
  [
    'bundle: el orden en el carrito no cambia el resultado',
    [burger('CURRI WHITE', 'simple', 13500, 2), burger('LA CHEESE JOA', 'simple', 12000), burger('OBRERA', 'simple', 12500)],
    BUNDLE, 21500,
  ],
  ['bundle: dobles y triples no cuentan', [burger('CURRI WHITE', 'doble', 15000, 2), burger('OBRERA', 'triple', 15500, 2)], BUNDLE, 0],
  ['bundle: 1 simple + 1 doble no arman par', [burger('CURRI WHITE', 'simple', 13500), burger('CURRI WHITE', 'doble', 15000)], BUNDLE, 0],
  [
    'bundle: los extras se pagan completos (el descuento se calcula sobre el precio base)',
    [burger('CURRI WHITE', 'simple', 13500, 2, 1800)], BUNDLE, 12000,
  ],
  [
    'bundle: las bebidas no cuentan aunque se llamen "simple"',
    [bebida('Coca-Cola', 'simple', 2500, 2), burger('CURRI WHITE', 'simple', 13500)], BUNDLE, 0,
  ],
  ['bundle: un par que ya es más barato que la promo no descuenta nada (nunca negativo)', [burger('X', 'simple', 6000, 2)], BUNDLE, 0],
  [
    'bundle: un par parejo y otro más barato que la promo',
    [burger('CURRI WHITE', 'simple', 13500, 2), burger('X', 'simple', 6000, 2)], BUNDLE, 12000,
  ],
  [
    'bundle: un simple caro con uno barato igual descuenta la diferencia',
    [burger('CURRI WHITE', 'simple', 13500), burger('X', 'simple', 6000)], BUNDLE, 4500,
  ],
  [
    'bundle: un ítem sin "kind" cuenta como burger y usa price si no hay basePrice',
    [{ name: 'CURRI WHITE', size: 'simple', qty: 2, price: 13500 }], BUNDLE, 12000,
  ],
  ['precio especial: 1 triple de la burger de la promo', [burger('CURRI WHITE', 'triple', 16500)], CURRI_TRIPLE, 1500],
  ['precio especial: se multiplica por la cantidad', [burger('CURRI WHITE', 'triple', 16500, 3)], CURRI_TRIPLE, 4500],
  ['precio especial: otra burger del mismo tamaño no entra', [burger('OBRERA', 'triple', 15500)], CURRI_TRIPLE, 0],
  ['precio especial: la misma burger en otro tamaño no entra', [burger('CURRI WHITE', 'doble', 15000)], CURRI_TRIPLE, 0],
  [
    'precio especial: con extras descuenta solo la diferencia del precio base',
    [burger('CURRI WHITE', 'triple', 16500, 2, 1800)], CURRI_TRIPLE, 3000,
  ],
  [
    'precio especial: si el panel bajó el precio al mismo valor, no hay descuento',
    [burger('CURRI WHITE', 'triple', 15000)], CURRI_TRIPLE, 0,
  ],
  [
    'precio especial: si el precio de la carta ya es más bajo, tampoco (nunca negativo)',
    [burger('CURRI WHITE', 'triple', 14000, 2)], CURRI_TRIPLE, 0,
  ],
  [
    'precio especial: una bebida con el mismo nombre no entra',
    [bebida('CURRI WHITE', 'triple', 16500)], CURRI_TRIPLE, 0,
  ],
  [
    'precio especial: se suma solo sobre las líneas que corresponden',
    [burger('CURRI WHITE', 'triple', 16500), burger('CURRI WHITE', 'doble', 15000), burger('OBRERA', 'triple', 15500)],
    CURRI_TRIPLE, 1500,
  ],
]

const CASOS_PRECIO_ESPECIAL = [
  // [promo, nombre, tamaño, precio vigente, esperado]
  [CURRI_TRIPLE, 'CURRI WHITE', 'triple', 16500, 15000],
  [CURRI_TRIPLE, 'CURRI WHITE', 'triple', 15001, 15000],
  [CURRI_TRIPLE, 'CURRI WHITE', 'triple', 15000, null], // igual: sin efecto
  [CURRI_TRIPLE, 'CURRI WHITE', 'triple', 12000, null], // más barato: sin efecto
  [CURRI_TRIPLE, 'CURRI WHITE', 'doble', 16500, null],
  [CURRI_TRIPLE, 'OBRERA', 'triple', 16500, null],
  [BUNDLE, 'CURRI WHITE', 'triple', 16500, null], // el bundle no pone precio a un ítem
  [null, 'CURRI WHITE', 'triple', 16500, null],
]

// Las dos promos que tenía el código (fechas pasadas), con la forma vieja
const PROMOS_VIEJAS = [
  { dateStr: '2026-07-09', ...BUNDLE },
  { dateStr: '2026-07-10', ...CURRI_TRIPLE },
]
const firma = (p) =>
  p && { kind: p.kind, bundlePrice: p.bundlePrice, itemName: p.itemName, itemSize: p.itemSize, specialPrice: p.specialPrice }

// ─── Contra la lógica vieja ──────────────────────────────────────────────
test('[vieja] descuento del carrito', () => {
  for (const [desc, items, promo, esperado] of CASOS_DESCUENTO) {
    assert.equal(legacy.calcPromoDiscount(items, promo), esperado, desc)
  }
})

test('[vieja] precio especial de una burger', () => {
  for (const [promo, nombre, tam, precio, esperado] of CASOS_PRECIO_ESPECIAL) {
    assert.equal(legacy.itemPromoPrice(promo, nombre, tam, precio), esperado, `${nombre} ${tam} ${precio}`)
  }
})

test('[vieja] hoy y mañana, también al cambiar de mes y de año', () => {
  const r = (hoy, promos = PROMOS_VIEJAS) => {
    const x = legacy.resolve(promos, hoy)
    return [firma(x.active)?.kind ?? null, firma(x.preview)?.kind ?? null]
  }
  assert.deepEqual(r('2026-07-08'), [null, 'simplesBundle'])
  assert.deepEqual(r('2026-07-09'), ['simplesBundle', 'itemPrice'])
  assert.deepEqual(r('2026-07-10'), ['itemPrice', null])
  assert.deepEqual(r('2026-07-11'), [null, null])
  assert.deepEqual(r('2026-07-31', [{ dateStr: '2026-08-01', ...BUNDLE }]), [null, 'simplesBundle'])
  assert.deepEqual(r('2026-12-31', [{ dateStr: '2027-01-01', ...BUNDLE }]), [null, 'simplesBundle'])
  assert.deepEqual(r('2028-02-28', [{ dateStr: '2028-02-29', ...BUNDLE }]), [null, 'simplesBundle']) // bisiesto
  assert.deepEqual(r('2026-02-28', [{ dateStr: '2026-03-01', ...BUNDLE }]), [null, 'simplesBundle']) // no bisiesto
  assert.deepEqual(r('2026-10-11', []), [null, null])
})

// ─── Contra la lógica NUEVA: tiene que dar exactamente lo mismo ──────────
// Las promos guardadas en la config → las promos "ya derivadas" que usa el sitio
const guardada = (id, extra) => ({ id, enabled: true, ...extra })
const BUNDLE_G = guardada('b', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
const CURRI_G = guardada('c', { kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: 15000, date: '2026-10-11' })
const derivada = (raw) => P.normalizePromo(raw, { dateLabel: 'HOY' })
// La promo de los casos de arriba (forma vieja) → su equivalente nuevo
const aNueva = (promo) => (!promo ? null : promo.kind === 'simplesBundle' ? derivada(BUNDLE_G) : derivada(CURRI_G))

test('[nueva] descuento del carrito: mismos números que la lógica vieja', () => {
  for (const [desc, items, promo, esperado] of CASOS_DESCUENTO) {
    assert.equal(P.calcPromoDiscount(items, aNueva(promo)), esperado, desc)
    assert.equal(P.calcPromoDiscount(items, aNueva(promo)), legacy.calcPromoDiscount(items, promo), `igual a la vieja: ${desc}`)
  }
})

test('[nueva] precio especial de una burger: mismos números que la lógica vieja', () => {
  for (const [promo, nombre, tam, precio, esperado] of CASOS_PRECIO_ESPECIAL) {
    assert.equal(P.itemPromoPrice(aNueva(promo), nombre, tam, precio), esperado, `${nombre} ${tam} ${precio}`)
  }
})

test('[nueva] hoy y mañana: igual que la lógica vieja, también al cambiar de mes y de año', () => {
  // Las dos promos viejas más una por cada borde del calendario (mes, año, bisiesto)
  const viejas = [...PROMOS_VIEJAS, ...['2026-08-01', '2027-01-01', '2028-02-29', '2026-03-01'].map((d) => ({ dateStr: d, ...BUNDLE }))]
  const nuevas = viejas.map(({ dateStr, ...resto }, i) => guardada(`p${i}`, { ...resto, date: dateStr }))
  const fechas = [
    '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-31', '2026-08-01', '2026-12-31', '2027-01-01',
    '2028-02-28', '2028-02-29', '2026-02-28', '2026-03-01', '2026-10-11',
  ]
  for (const hoy of fechas) {
    const v = legacy.resolve(viejas, hoy)
    const n = P.promosActivas(nuevas, hoy)
    assert.deepEqual(firma(n.active), firma(v.active), `hoy ${hoy}`)
    assert.deepEqual(firma(n.preview), firma(v.preview), `mañana de ${hoy}`)
  }
})

test('[nueva] los textos de la promo de 2 simples son los de siempre', () => {
  const p = P.promosActivas([BUNDLE_G], '2026-10-11').active
  assert.equal(p.headline, '2 simples x $15.000')
  assert.equal(p.ticker, '2 SIMPLES X $15.000')
  assert.equal(p.short, '2 simples x $15.000')
  assert.equal(p.bigPrice, '$15.000')
  assert.equal(p.bigSub, '2 simples')
  assert.equal(p.title, 'Promo de Hoy')
  assert.equal(p.dateLabel, 'HOY')
})

// ─── Textos derivados de una burger a precio especial ────────────────────
test('los textos de una burger a precio especial salen de los campos', () => {
  const p = P.normalizePromo(CURRI_G, { dateLabel: 'HOY' })
  assert.equal(p.headline, 'CURRI WHITE triple a $15.000')
  assert.equal(p.short, 'CURRI WHITE triple a $15.000')
  assert.equal(p.ticker, 'CURRI WHITE TRIPLE X $15.000')
  assert.equal(p.bigPrice, '$15.000')
  assert.equal(p.bigSub, 'CURRI WHITE triple')
})

test('el título es el que cargó Joaco; si no, "Promo de Hoy" o el día de la semana', () => {
  const conTitulo = P.normalizePromo({ ...BUNDLE_G, title: '  Noche   de   simples ' })
  assert.equal(conTitulo.title, 'Noche de simples')
  assert.equal(conTitulo.customTitle, true)
  assert.equal(P.normalizePromo(BUNDLE_G, { dateLabel: 'HOY' }).title, 'Promo de Hoy')
  assert.equal(P.normalizePromo(BUNDLE_G, { dateLabel: 'SÁBADO' }).title, 'Promo del Sábado')
  assert.equal(P.normalizePromo(BUNDLE_G, { dateLabel: 'SÁBADO' }).customTitle, false)
  // sin contexto, con día puntual: el día de la semana de esa fecha (2026-10-11 es domingo)
  assert.equal(P.normalizePromo(BUNDLE_G).dateLabel, 'DOMINGO')
  assert.equal(P.normalizePromo(BUNDLE_G).title, 'Promo del Domingo')
  // y por días de la semana no hay un solo día: título genérico
  assert.equal(P.normalizePromo({ ...BUNDLE_G, date: undefined, weekdays: [5, 6] }).title, 'Promo')
})

test('la etiqueta del día: HOY si corre hoy, el día de la semana si es mañana', () => {
  const semanal = guardada('s', { kind: 'simplesBundle', bundlePrice: 15000, weekdays: [1] }) // lunes
  assert.equal(P.promosActivas([semanal], '2026-10-11').preview.dateLabel, 'LUNES') // domingo → mañana lunes
  assert.equal(P.promosActivas([semanal], '2026-10-11').preview.title, 'Promo del Lunes')
  assert.equal(P.promosActivas([semanal], '2026-10-12').active.dateLabel, 'HOY')
  assert.equal(P.promosActivas([semanal], '2026-10-12').active.title, 'Promo de Hoy')
})

// ─── Qué promo corre ─────────────────────────────────────────────────────
test('sin promos (o config vacía) no hay promo', () => {
  for (const lista of [[], undefined, null]) {
    assert.deepEqual(P.promosActivas(lista, '2026-10-11'), { active: null, preview: null })
  }
})

test('una promo apagada no corre ni avisa para mañana', () => {
  const apagada = { ...BUNDLE_G, enabled: false }
  assert.deepEqual(P.promosActivas([apagada], '2026-10-11'), { active: null, preview: null })
  assert.deepEqual(P.promosActivas([{ ...apagada, date: '2026-10-12' }], '2026-10-11'), { active: null, preview: null })
  // y si falta el campo "enabled", queda apagada (una promo cuesta plata: nunca corre "de casualidad")
  const sinCampo = { ...BUNDLE_G }
  delete sinCampo.enabled
  assert.equal(P.promosActivas([sinCampo], '2026-10-11').active, null)
})

test('por fecha: solo ese día; por días de la semana: se repite cada semana', () => {
  const puntual = guardada('p', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-16' })
  assert.equal(P.promosActivas([puntual], '2026-10-16').active.id, 'p')
  assert.equal(P.promosActivas([puntual], '2026-10-15').active, null)
  assert.equal(P.promosActivas([puntual], '2026-10-15').preview.id, 'p')
  assert.equal(P.promosActivas([puntual], '2026-10-17').active, null)
  assert.equal(P.promosActivas([puntual], '2026-10-23').active, null) // la semana siguiente no se repite

  const finde = guardada('f', { kind: 'simplesBundle', bundlePrice: 15000, weekdays: [5, 6] }) // vie y sáb
  const corre = (d) => !!P.promosActivas([finde], d).active
  assert.deepEqual(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map(corre), [false, true, true, false])
  assert.deepEqual(['2026-10-23', '2026-10-24'].map(corre), [true, true]) // la semana que viene también
  assert.equal(P.promosActivas([finde], '2026-10-15').preview.id, 'f') // jueves: mañana arranca
  assert.equal(P.promosActivas([finde], '2026-10-17').preview, null) // sábado: mañana domingo ya no
})

test('el aviso de mañana funciona al cambiar de mes y de año', () => {
  const primero = guardada('x', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-11-01' })
  assert.equal(P.promosActivas([primero], '2026-10-31').preview.id, 'x')
  const anioNuevo = guardada('y', { kind: 'simplesBundle', bundlePrice: 15000, date: '2027-01-01' })
  assert.equal(P.promosActivas([anioNuevo], '2026-12-31').preview.id, 'y')
  assert.equal(P.addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(P.addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(P.addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(P.addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(P.addDays('basura', 1), null)
})

test('dos promos el mismo día: gana la primera de la lista (las apagadas no cuentan)', () => {
  const a = guardada('a', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
  const b = guardada('b', { kind: 'itemPrice', itemName: 'OBRERA', itemSize: 'doble', specialPrice: 10000, weekdays: [0] })
  assert.equal(P.promosActivas([a, b], '2026-10-11').active.id, 'a')
  assert.equal(P.promosActivas([b, a], '2026-10-11').active.id, 'b')
  assert.equal(P.promosActivas([{ ...a, enabled: false }, b], '2026-10-11').active.id, 'b')
})

test('hoy y mañana pueden ser promos distintas', () => {
  const hoy = guardada('hoy', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
  const manana = guardada('man', { kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: 15000, date: '2026-10-12' })
  const r = P.promosActivas([hoy, manana], '2026-10-11')
  assert.equal(r.active.id, 'hoy')
  assert.equal(r.preview.id, 'man')
  assert.equal(r.preview.dateLabel, 'LUNES')
})

test('un precio especial igual o mayor al normal no tiene efecto (ni en la tarjeta ni en el carrito)', () => {
  const p = P.promosActivas([{ ...CURRI_G, specialPrice: 16500 }], '2026-10-11').active
  assert.ok(p, 'la promo existe')
  assert.equal(P.itemPromoPrice(p, 'CURRI WHITE', 'triple', 16500), null)
  assert.equal(P.calcPromoDiscount([burger('CURRI WHITE', 'triple', 16500, 2)], p), 0)
  const mayor = P.promosActivas([{ ...CURRI_G, specialPrice: 20000 }], '2026-10-11').active
  assert.equal(P.itemPromoPrice(mayor, 'CURRI WHITE', 'triple', 16500), null)
  assert.equal(P.calcPromoDiscount([burger('CURRI WHITE', 'triple', 16500, 2)], mayor), 0)
})

// ─── Config basura: nunca tira, nunca inventa una promo ──────────────────
test('normalizePromo devuelve null (sin tirar) ante cualquier basura', () => {
  const ok = { id: 'a', enabled: true, kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' }
  const item = { id: 'a', enabled: true, kind: 'itemPrice', itemName: 'X', itemSize: 'doble', specialPrice: 100, date: '2026-10-11' }
  const sin = (o, campo) => { const c = { ...o }; delete c[campo]; return c }
  const basura = [
    undefined, null, 0, 5, 'texto', true, [], [1, 2], {}, () => 1,
    { id: 'a' },
    { ...ok, kind: 'otra' },
    sin(ok, 'bundlePrice'),
    sin(item, 'specialPrice'),
    { ...item, itemName: '' },
    { ...item, itemName: 'X'.repeat(41) },
    { ...item, itemSize: 'gigante' },
    sin(item, 'itemSize'),
    { ...ok, id: '' },
    { ...ok, id: 'con espacio' },
    sin(ok, 'id'),
    sin(ok, 'date'), // sin cuándo
    { ...sin(ok, 'date'), weekdays: [] },
    { ...ok, date: '' },
    { ...ok, date: '11/10/2026' },
    { ...ok, date: '2026-13-01' },
    { ...ok, date: '2026-02-30' },
    { ...ok, date: 20261011 },
    { ...sin(ok, 'date'), weekdays: [7] },
    { ...sin(ok, 'date'), weekdays: [-1] },
    { ...sin(ok, 'date'), weekdays: [1.5] },
    { ...sin(ok, 'date'), weekdays: ['1'] },
    { ...sin(ok, 'date'), weekdays: 5 },
    { ...ok, weekdays: [1] }, // fecha Y días: los dos a la vez no
    { ...ok, title: 7 },
    { ...ok, title: 'x'.repeat(41) },
  ]
  for (const b of basura) assert.equal(P.normalizePromo(b), null, JSON.stringify(b))
})

test('los precios tienen que ser enteros, finitos y mayores a 0', () => {
  const con = (bundlePrice) => ({ ...BUNDLE_G, bundlePrice })
  for (const malo of [0, -1, -15000, 1.5, 15000.5, NaN, Infinity, -Infinity, '15000', null, undefined, true, [], {}, 500_001, 1e12]) {
    assert.equal(P.normalizePromo(con(malo)), null, `precio ${String(malo)}`)
    assert.equal(P.validatePromo(con(malo)).ok, false)
  }
  for (const bueno of [1, 100, 15000, 500_000]) assert.ok(P.normalizePromo(con(bueno)), `precio ${bueno}`)
  // lo mismo para el precio especial
  for (const malo of [0, -5, 1.2, NaN, Infinity, '9000', null]) {
    assert.equal(P.normalizePromo({ ...CURRI_G, specialPrice: malo }), null, `precio especial ${String(malo)}`)
  }
})

test('validatePromo dice qué campo está mal (para marcarlo en el panel)', () => {
  const campos = (raw) => Object.keys(P.validatePromo(raw).errors).sort()
  assert.deepEqual(campos({ id: 'a', enabled: true, kind: 'simplesBundle', weekdays: [] }), ['bundlePrice', 'when'])
  assert.deepEqual(campos({ id: 'a', enabled: true, kind: 'itemPrice', date: '2026-10-11' }), ['itemName', 'itemSize', 'specialPrice'])
  assert.deepEqual(campos({ id: 'a', enabled: true, date: '2026-10-11' }), ['kind'])
  assert.deepEqual(campos({ enabled: true, kind: 'simplesBundle', bundlePrice: 1, date: '2026-10-11' }), ['id'])
  assert.deepEqual(campos({ id: 'a', kind: 'simplesBundle', bundlePrice: 1, date: '2026-10-11', title: 'x'.repeat(50) }), ['title'])
  for (const msg of Object.values(P.validatePromo({ id: 'a', kind: 'itemPrice' }).errors)) {
    assert.equal(typeof msg, 'string')
    assert.ok(msg.length > 5)
  }
})

test('la promo limpia solo conserva sus campos y ordena los días', () => {
  const r = P.validatePromo({
    id: ' abc ', enabled: true, title: ' Mi promo ', kind: 'simplesBundle', bundlePrice: 15000,
    // campos que no le corresponden, de otro tipo o de la interfaz del panel
    itemName: 'OBRERA', itemSize: 'doble', specialPrice: 9, mode: 'weekly', hack: '<script>', date: undefined, weekdays: [6, 1, 6, 0],
  })
  assert.equal(r.ok, true)
  assert.deepEqual(r.promo, { id: 'abc', enabled: true, title: 'Mi promo', kind: 'simplesBundle', bundlePrice: 15000, weekdays: [0, 1, 6] })
  const item = P.validatePromo({ ...CURRI_G, bundlePrice: 5, extra: 1 })
  assert.deepEqual(item.promo, { id: 'c', enabled: true, kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: 15000, date: '2026-10-11' })
  // limpiar dos veces da lo mismo (es idempotente)
  assert.deepEqual(P.validatePromo(r.promo).promo, r.promo)
})

test('promosActivas ignora las entradas inválidas y sigue con las buenas', () => {
  const buena = guardada('ok', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
  const lista = [null, 5, 'x', [], {}, { id: 'a', kind: 'otra' }, { ...buena, bundlePrice: -1 }, buena]
  assert.equal(P.promosActivas(lista, '2026-10-11').active.id, 'ok')
  for (const rara of ['texto', 5, {}, true]) {
    assert.deepEqual(P.promosActivas(rara, '2026-10-11'), { active: null, preview: null })
  }
  // fecha de hoy inválida: sin promo, sin romper
  for (const hoy of [undefined, null, '', 'hoy', '2026-02-30', 20261011]) {
    assert.deepEqual(P.promosActivas([buena], hoy), { active: null, preview: null })
  }
})

test('el descuento y el precio especial aguantan promos y carritos raros', () => {
  assert.equal(P.calcPromoDiscount(undefined, derivada(BUNDLE_G)), 0)
  assert.equal(P.calcPromoDiscount([], null), 0)
  assert.equal(P.calcPromoDiscount([burger('X', 'simple', 100, 2)], { kind: 'otra' }), 0)
  assert.equal(P.itemPromoPrice(undefined, 'X', 'doble', 100), null)
})

test('validatePromoList: lista limpia, tope de 30 y sin identificadores repetidos', () => {
  const una = (i) => guardada(`p${i}`, { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
  assert.deepEqual(P.validatePromoList(undefined), { ok: true, promos: [] })
  assert.deepEqual(P.validatePromoList(null), { ok: true, promos: [] })
  assert.deepEqual(P.validatePromoList([]), { ok: true, promos: [] })
  assert.equal(P.validatePromoList(Array.from({ length: 30 }, (_, i) => una(i))).ok, true)

  const muchas = P.validatePromoList(Array.from({ length: 31 }, (_, i) => una(i)))
  assert.equal(muchas.ok, false)
  assert.match(muchas.error, /demasiadas/)

  for (const rara of ['x', 5, {}, true]) assert.equal(P.validatePromoList(rara).ok, false)

  const repetida = P.validatePromoList([una(1), una(1)])
  assert.equal(repetida.ok, false)
  assert.match(repetida.error, /Promo 2/)

  const mala = P.validatePromoList([una(1), { ...una(2), title: 'Mi promo', bundlePrice: 0 }])
  assert.equal(mala.ok, false)
  assert.match(mala.error, /Promo 2 “Mi promo”: .*precio/i)
  assert.equal(P.validatePromoList([una(1), 'basura']).ok, false)
})

// ─── Textos y fechas del panel ───────────────────────────────────────────
test('describeWhen: cuándo vale una promo, en palabras', () => {
  const hoy = '2026-10-11' // domingo
  assert.equal(P.describeWhen({ date: '2026-10-11' }, hoy), 'Hoy')
  assert.equal(P.describeWhen({ date: '2026-10-12' }, hoy), 'Mañana')
  assert.equal(P.describeWhen({ date: '2026-10-16' }, hoy), 'Vie 16/10')
  assert.equal(P.describeWhen({ date: '2027-01-01' }, hoy), 'Vie 01/01/2027')
  assert.equal(P.describeWhen({ weekdays: [5] }, hoy), 'Todos los viernes')
  assert.equal(P.describeWhen({ weekdays: [6] }, hoy), 'Todos los sábados')
  assert.equal(P.describeWhen({ weekdays: [1] }, hoy), 'Todos los lunes')
  assert.equal(P.describeWhen({ weekdays: [0, 6, 5] }, hoy), 'Todos los vie, sáb y dom')
  assert.equal(P.describeWhen({ weekdays: [0, 1, 2, 3, 4, 5, 6] }, hoy), 'Todos los días')
  assert.equal(P.describeWhen({ weekdays: [] }, hoy), '')
  assert.equal(P.describeWhen(null, hoy), '')
})

test('nextDateOf: la próxima fecha en que corre (para "Ver cómo se ve")', () => {
  assert.equal(P.nextDateOf({ date: '2026-07-10' }, '2026-10-11'), '2026-07-10') // aunque ya pasó
  assert.equal(P.nextDateOf({ weekdays: [0] }, '2026-10-11'), '2026-10-11') // hoy mismo
  assert.equal(P.nextDateOf({ weekdays: [5, 6] }, '2026-10-11'), '2026-10-16')
  assert.equal(P.nextDateOf({ weekdays: [] }, '2026-10-11'), null)
  assert.equal(P.nextDateOf({ weekdays: [1] }, 'basura'), null)
})

test('weekdayOf, isDateStr y localDateStr', () => {
  assert.equal(P.weekdayOf('2026-10-11'), 0) // domingo
  assert.equal(P.weekdayOf('2026-10-12'), 1)
  assert.equal(P.weekdayOf('2026-10-17'), 6)
  assert.equal(P.weekdayOf('2026-02-30'), null)
  assert.equal(P.isDateStr('2028-02-29'), true) // bisiesto
  assert.equal(P.isDateStr('2026-02-29'), false)
  assert.equal(P.localDateStr(new Date(2026, 9, 11, 23, 59)), '2026-10-11')
  assert.equal(P.localDateStr(new Date(2026, 0, 5, 0, 0)), '2026-01-05')
})

test('money: separador de miles igual que el del sitio (es-AR)', () => {
  assert.equal(P.money(15000), '$15.000')
  assert.equal(P.money(2500), '$2.500')
  assert.equal(P.money(999), '$999')
  assert.equal(P.money(1234567), '$1.234.567')
  assert.equal(P.money(15000), '$' + (15000).toLocaleString('es-AR'))
})

// ─── Revisión adversarial: carritos al azar contra la lógica vieja ───────
// Mismo carrito, mismas promos: la cuenta nueva (que junta los simples por precio)
// tiene que dar EXACTAMENTE lo mismo que la vieja (que los apilaba de a uno).
function azar(semilla) {
  let s = semilla
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1))
  const pick = (arr) => arr[ri(0, arr.length - 1)]
  return { rnd, ri, pick }
}

test('[azar] 5.000 carritos: la cuenta nueva da lo mismo que la vieja, nunca negativa, y no descuenta extras ni bebidas', () => {
  const { rnd, ri, pick } = azar(20261012)
  const NOMBRES = ['CURRI WHITE', 'OBRERA', 'LA CHEESE JOA', 'BIG WHITE', 'OKLAHOMA WHITE', 'LA JOA WHITE']
  const TAMANOS = ['simple', 'doble', 'triple']
  const PRECIOS = [6000, 9000, 12000, 12500, 13000, 13500, 14000, 15000, 15500, 16000, 16500, 20000]
  for (let n = 0; n < 5000; n++) {
    const items = Array.from({ length: ri(0, 8) }, () => {
      if (rnd() < 0.25) {
        const precio = pick([2500, 4000, 5000, 6000, 16500])
        return { kind: 'drink', name: pick([...NOMBRES, 'Coca-Cola']), size: pick([...TAMANOS, 'lata']), qty: ri(1, 5), basePrice: precio, price: precio }
      }
      const base = pick(PRECIOS)
      const extras = rnd() < 0.4 ? pick([800, 1000, 1600, 2400, 3400]) : 0
      const it = { kind: 'burger', name: pick(NOMBRES), size: pick(TAMANOS), qty: ri(1, 7), basePrice: base, price: base + extras }
      if (rnd() < 0.05) delete it.kind
      if (rnd() < 0.05) delete it.basePrice
      return it
    })
    const vieja = rnd() < 0.5
      ? { kind: 'simplesBundle', bundlePrice: pick([1000, 10000, 15000, 20000, 25000, 27000, 30000]) }
      : { kind: 'itemPrice', itemName: pick(NOMBRES), itemSize: pick(TAMANOS), specialPrice: pick([1000, 9000, 13500, 15000, 15500, 16500, 17000]) }
    const nueva = P.normalizePromo({ id: 'x', enabled: true, date: '2026-10-12', ...vieja }, { dateLabel: 'HOY' })
    const d = P.calcPromoDiscount(items, nueva)
    assert.equal(d, legacy.calcPromoDiscount(items, vieja), JSON.stringify({ items, vieja }))

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const envio = pick([0, 2000, 4000, 5000, 7500])
    assert.ok(Number.isInteger(d) && d >= 0, 'descuento entero y no negativo')
    assert.ok(subtotal - d + envio >= envio, 'el total nunca baja del envío')
    // el descuento sale solo de las burgers a precio base
    const burgersBase = items.filter((i) => (i.kind ?? 'burger') === 'burger').reduce((s, i) => s + (i.basePrice ?? i.price) * i.qty, 0)
    assert.ok(d <= burgersBase, 'no descuenta extras ni bebidas')
  }
})

test('descuento: carritos con cantidades enormes o precios rotos no se cuelgan ni inventan descuentos', () => {
  const bundle = P.normalizePromo({ id: 'b', enabled: true, kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-12' })
  const item = P.normalizePromo({ id: 'c', enabled: true, kind: 'itemPrice', itemName: 'X', itemSize: 'simple', specialPrice: 10000, date: '2026-10-12' })
  // un millón de simples: la cuenta no depende de la cantidad (antes apilaba uno por uno)
  const t0 = Date.now()
  assert.equal(P.calcPromoDiscount([burger('X', 'simple', 13500, 1_000_000)], bundle), 500_000 * 12000)
  assert.equal(P.calcPromoDiscount([burger('X', 'simple', 13500, 1_000_001)], bundle), 500_000 * 12000)
  assert.ok(Date.now() - t0 < 200, 'rápido')
  // precios que no son números (texto, NaN, Infinity, negativos, null): esa línea no entra
  const rotos = ['13500', NaN, Infinity, -Infinity, -13500, null, undefined, {}, [], true]
  for (const r of rotos) {
    for (const promo of [bundle, item]) {
      const items = [{ kind: 'burger', name: 'X', size: 'simple', qty: 2, basePrice: r, price: r }, burger('X', 'simple', 13500, 2)]
      const d = P.calcPromoDiscount(items, promo)
      assert.ok(Number.isFinite(d) && d >= 0, `precio ${String(r)} → ${d}`)
    }
  }
  // un precio roto no arruina el descuento de las líneas sanas
  assert.equal(P.calcPromoDiscount([{ kind: 'burger', name: 'X', size: 'simple', qty: 3, basePrice: NaN, price: NaN }, burger('X', 'simple', 13500, 2)], bundle), 12000)
  // cantidades raras
  for (const q of [0, -3, NaN, Infinity, undefined, null, '2', 2.9, {}]) {
    const d = P.calcPromoDiscount([{ ...burger('X', 'simple', 13500), qty: q }], bundle)
    assert.ok(Number.isFinite(d) && d >= 0, `cantidad ${String(q)} → ${d}`)
  }
  // carrito o promo que no son lo que se espera
  for (const rara of [null, undefined, 'x', 5, {}, [null], [undefined], [5]]) {
    assert.equal(P.calcPromoDiscount(rara, bundle), 0, JSON.stringify(rara))
  }
  // una promo armada a mano con un precio roto no descuenta
  for (const mala of [{ kind: 'simplesBundle', bundlePrice: NaN }, { kind: 'simplesBundle', bundlePrice: -1 }, { kind: 'simplesBundle' }, { kind: 'simplesBundle', bundlePrice: '15000' }]) {
    assert.equal(P.calcPromoDiscount([burger('X', 'simple', 13500, 2)], mala), 0, JSON.stringify(mala))
  }
  // promo -1 de especial: tampoco
  assert.equal(P.calcPromoDiscount([burger('X', 'simple', 13500, 2)], { kind: 'itemPrice', itemName: 'X', itemSize: 'simple', specialPrice: -1 }), 0)
})

// ─── Fechas en los bordes del calendario ─────────────────────────────────
test('fechas: el último día que existe no tira (antes: TypeError que dejaba el sitio en blanco con ?promoDate=9999-12-31)', () => {
  assert.equal(P.addDays('9999-12-31', 1), null)
  assert.equal(P.addDays('9999-12-30', 1), '9999-12-31')
  assert.equal(P.addDays('0100-01-01', -1), null) // año 99: ya no es AAAA
  assert.equal(P.addDays('0100-01-01', 1), '0100-01-02') // el año se rellena con ceros
  const p = guardada('f', { kind: 'simplesBundle', bundlePrice: 15000, weekdays: [0, 1, 2, 3, 4, 5, 6] })
  for (const hoy of ['9999-12-31', '0100-01-01', '2026-12-31']) {
    const r = P.promosActivas([p], hoy)
    assert.equal(r.active?.id, 'f', `hoy ${hoy}`)
  }
  assert.equal(P.promosActivas([p], '9999-12-31').preview, null)
  assert.equal(P.promosActivas([p], '2026-12-31').preview.id, 'f')
})

test('describeWhen y nextDateOf aguantan un "hoy" que no es fecha', () => {
  for (const hoy of [undefined, null, 5, {}, 'hoy', '', '2026-02-30']) {
    assert.equal(P.describeWhen({ date: '2026-10-16' }, hoy), 'Vie 16/10')
    assert.equal(P.describeWhen({ weekdays: [5] }, hoy), 'Todos los viernes')
    assert.equal(P.nextDateOf({ weekdays: [5] }, hoy), null)
  }
})

test('semana, mes y año: el día de mañana de cada día de 2026 a 2028 cae bien', () => {
  // Contra el calendario del propio JS, día por día (cubre cambios de mes, año y bisiesto)
  for (const anio of [2026, 2027, 2028]) {
    for (let d = new Date(Date.UTC(anio, 0, 1)); d.getUTCFullYear() === anio; d = new Date(d.getTime() + 86400000)) {
      const hoy = d.toISOString().slice(0, 10)
      const manana = new Date(d.getTime() + 86400000).toISOString().slice(0, 10)
      assert.equal(P.addDays(hoy, 1), manana, hoy)
      assert.equal(P.weekdayOf(hoy), d.getUTCDay(), hoy)
      const semanal = guardada('w', { kind: 'simplesBundle', bundlePrice: 15000, weekdays: [new Date(manana + 'T00:00:00Z').getUTCDay()] })
      assert.equal(P.promosActivas([semanal], hoy).preview?.id, 'w', `mañana de ${hoy}`)
    }
  }
})

test('domingo → lunes: una promo de lunes se anuncia el domingo y corre el lunes', () => {
  const lunes = guardada('l', { kind: 'simplesBundle', bundlePrice: 15000, weekdays: [1] })
  assert.equal(P.promosActivas([lunes], '2026-10-11').active, null)
  assert.equal(P.promosActivas([lunes], '2026-10-11').preview.dateLabel, 'LUNES')
  assert.equal(P.promosActivas([lunes], '2026-10-12').active.id, 'l')
  assert.equal(P.promosActivas([lunes], '2026-10-12').preview, null)
  assert.equal(P.promosActivas([lunes], '2026-10-13').active, null)
})

test('"hoy" del sitio es la fecha del reloj del dispositivo (documentado): 23:59 y 00:00 son días distintos', () => {
  // localDateStr usa getFullYear/getMonth/getDate = la zona horaria del dispositivo
  assert.equal(P.localDateStr(new Date(2026, 9, 11, 23, 59, 59)), '2026-10-11')
  assert.equal(P.localDateStr(new Date(2026, 9, 12, 0, 0, 0)), '2026-10-12')
  const promo = guardada('p', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-11' })
  const antes = P.promosActivas([promo], P.localDateStr(new Date(2026, 9, 11, 23, 59, 59)))
  const despues = P.promosActivas([promo], P.localDateStr(new Date(2026, 9, 12, 0, 0, 0)))
  assert.ok(antes.active)
  assert.equal(despues.active, null)
})

// ─── Freno contra precios de promo absurdos ──────────────────────────────
test('una promo con un precio de error de tipeo ($15) no se aplica en el sitio', () => {
  for (const precio of [1, 15, 150, 999]) {
    const b = guardada('b', { kind: 'simplesBundle', bundlePrice: precio, date: '2026-10-12' })
    const i = guardada('i', { kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: precio, date: '2026-10-12' })
    assert.deepEqual(P.promosActivas([b], '2026-10-12'), { active: null, preview: null }, `bundle ${precio}`)
    assert.deepEqual(P.promosActivas([i], '2026-10-11'), { active: null, preview: null }, `item ${precio}`)
    assert.ok(P.isCheapPromo(b) && P.isCheapPromo(i))
  }
  // el límite: $1.000 ya vale
  const b = guardada('b', { kind: 'simplesBundle', bundlePrice: 1000, date: '2026-10-12' })
  assert.ok(P.promosActivas([b], '2026-10-12').active)
  assert.equal(P.isCheapPromo(b), false)
  // y una promo barata no tapa a la siguiente de la lista
  const sana = guardada('s', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-12' })
  assert.equal(P.promosActivas([{ ...b, bundlePrice: 15 }, sana], '2026-10-12').active.id, 's')
})

test('cheapPromoError: dice qué promo es y qué hacer', () => {
  const ok = guardada('a', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-12' })
  assert.equal(P.cheapPromoError([ok]), null)
  assert.equal(P.cheapPromoError([]), null)
  assert.equal(P.cheapPromoError(undefined), null)
  const msg = P.cheapPromoError([ok, { ...ok, id: 'b', bundlePrice: 15 }])
  assert.match(msg, /^Promo 2: \$15 es demasiado poco/)
  assert.match(msg, /ceros/)
})

// ─── Burger que no está en la carta ──────────────────────────────────────
test('una promo de una burger que no existe en la carta no se anuncia ni se aplica', () => {
  const carta = ['CURRI WHITE', 'OBRERA']
  const existe = guardada('e', { kind: 'itemPrice', itemName: 'CURRI WHITE', itemSize: 'triple', specialPrice: 15000, date: '2026-10-12' })
  const fantasma = guardada('f', { kind: 'itemPrice', itemName: 'CURRY WHITE', itemSize: 'triple', specialPrice: 15000, date: '2026-10-12' })
  assert.equal(P.promosActivas([existe], '2026-10-12', { burgerNames: carta }).active.id, 'e')
  assert.equal(P.promosActivas([fantasma], '2026-10-12', { burgerNames: carta }).active, null)
  assert.equal(P.promosActivas([fantasma], '2026-10-11', { burgerNames: carta }).preview, null)
  // una promo fantasma no tapa a la que sigue
  assert.equal(P.promosActivas([fantasma, existe], '2026-10-12', { burgerNames: carta }).active.id, 'e')
  // el bundle no depende de ninguna burger
  const b = guardada('b', { kind: 'simplesBundle', bundlePrice: 15000, date: '2026-10-12' })
  assert.equal(P.promosActivas([b], '2026-10-12', { burgerNames: [] }).active.id, 'b')
  // sin lista de nombres (o con basura) no se filtra nada: no cambia lo que ya andaba
  for (const sinLista of [undefined, null, 'x', {}]) {
    assert.equal(P.promosActivas([fantasma], '2026-10-12', { burgerNames: sinLista }).active.id, 'f')
  }
  assert.equal(P.promosActivas([fantasma], '2026-10-12').active.id, 'f')
})

// ─── Promos nuevas: combos, % off, 2x1, monto y envío gratis ─────────────
const base = { id: 'n', enabled: true, date: '2026-10-11' }
const val = (extra) => P.validatePromo({ ...base, ...extra })
const desc = (promo, items) => P.calcPromoDiscount(items, val(promo).promo)

test('20% off en la 2ª burger de cualquiera: descuenta solo la más barata de cada par', () => {
  const promo = { kind: 'nthPct', nth: 2, pct: 20, size: 'any' }
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 1)]), 0) // una sola: nada
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 1), burger('CURRI WHITE', 'triple', 16500, 1)]), 2800) // 20% de 14.000
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 3)]), 2800) // 3 burgers: solo la 2ª
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 4)]), 5600) // 4 burgers: la 2ª y la 4ª
})

test('2x1: la segunda sale gratis', () => {
  const promo = { kind: 'nthPct', nth: 2, pct: 100, size: 'any' }
  assert.equal(desc(promo, [burger('OBRERA', 'simple', 12500, 2)]), 12500)
  assert.equal(P.normalizePromo({ ...base, ...promo }).headline, '2x1 en burgers')
})

test('dos triples a tanto: solo cuentan los triples y el precio es del par', () => {
  const promo = { kind: 'bundle', qty: 2, size: 'triple', bundlePrice: 30000 }
  assert.equal(desc(promo, [burger('CURRI WHITE', 'triple', 16500, 2)]), 3000) // 33.000 → 30.000
  assert.equal(desc(promo, [burger('CURRI WHITE', 'triple', 16500, 1), burger('OBRERA', 'doble', 14000, 1)]), 0)
  assert.equal(desc(promo, [burger('CURRI WHITE', 'triple', 16500, 3)]), 3000) // el 3º queda a precio normal
  assert.equal(desc(promo, [burger('CURRI WHITE', 'triple', 16500, 4)]), 6000)
  assert.equal(P.normalizePromo({ ...base, ...promo }).headline, '2 triples x $30.000')
})

test('combo que no baja el precio no regala nada', () => {
  const promo = { kind: 'bundle', qty: 2, size: 'doble', bundlePrice: 40000 }
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 2)]), 0)
})

test('X% off en las burgers de un tamaño, sin tocar extras ni bebidas', () => {
  const promo = { kind: 'pctOff', pct: 10, size: 'doble' }
  const items = [burger('OBRERA', 'doble', 14000, 1, 800), burger('BIG WHITE', 'simple', 13500, 1), bebida('Coca-Cola', 'lata', 2500)]
  assert.equal(desc(promo, items), 1400) // 10% de 14.000, sin los extras
})

test('promo de una sola burger: solo esa lleva el descuento', () => {
  const promo = { kind: 'pctOff', pct: 50, size: 'any', itemName: 'OBRERA' }
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 1), burger('BIG WHITE', 'doble', 15000, 1)]), 7000)
})

test('$X off desde cierto gasto en burgers', () => {
  const promo = { kind: 'amountOff', amount: 2000, minSpend: 25000 }
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 1)]), 0) // no llega
  assert.equal(desc(promo, [burger('OBRERA', 'doble', 14000, 2)]), 2000)
  assert.equal(P.normalizePromo({ ...base, ...promo }).headline, '$2.000 off desde $25.000')
})

test('envío gratis: no descuenta burgers pero marca el envío como gratis desde el mínimo', () => {
  const promo = val({ kind: 'freeShipping', minSpend: 25000 }).promo
  assert.equal(P.calcPromoDiscount([burger('OBRERA', 'doble', 14000, 2)], promo), 0)
  assert.equal(P.envioGratis(promo, 28000), true)
  assert.equal(P.envioGratis(promo, 20000), false)
  assert.equal(P.envioGratis({ kind: 'pctOff' }, 99999), false)
  assert.equal(P.normalizePromo({ ...base, kind: 'freeShipping', minSpend: 0 }).headline, 'Envío gratis')
})

test('validación de las promos nuevas: rangos y campos que sobran', () => {
  assert.equal(val({ kind: 'nthPct', nth: 2, pct: 0 }).ok, false)
  assert.equal(val({ kind: 'nthPct', nth: 5, pct: 20 }).ok, false)
  assert.equal(val({ kind: 'pctOff', pct: 95 }).ok, false) // 90% es el tope
  assert.equal(val({ kind: 'bundle', qty: 1, bundlePrice: 20000 }).ok, false)
  assert.equal(val({ kind: 'bundle', qty: 2, size: 'gigante', bundlePrice: 20000 }).ok, false)
  assert.equal(val({ kind: 'amountOff', amount: 0 }).ok, false)
  const ok = val({ kind: 'nthPct', nth: 2, pct: 20, size: 'doble', precioViejo: 5, bundlePrice: 1 })
  assert.deepEqual(Object.keys(ok.promo).sort(), ['date', 'enabled', 'id', 'kind', 'nth', 'pct', 'size'])
})

test('un combo con precio absurdo por burger se frena igual que las otras promos', () => {
  assert.equal(P.isCheapPromo({ kind: 'bundle', qty: 2, bundlePrice: 1500 }), true) // $750 cada una
  assert.equal(P.isCheapPromo({ kind: 'bundle', qty: 2, bundlePrice: 30000 }), false)
})

test('la promo de una burger que ya no está en la carta no se anuncia', () => {
  const lista = [{ ...base, kind: 'pctOff', pct: 10, size: 'any', itemName: 'FANTASMA' }]
  assert.equal(P.promosActivas(lista, '2026-10-11', { burgerNames: ['OBRERA'] }).active, null)
  assert.ok(P.promosActivas(lista, '2026-10-11', { burgerNames: ['FANTASMA'] }).active)
})

// ─── Condiciones: modalidad y horario ────────────────────────────────────
const base2 = { id: 'x', enabled: true, kind: 'pctOff', pct: 20, size: 'any', weekdays: [1, 2, 3, 4, 5, 6, 0] }

test('modalidad y horario: se validan y se guardan solo si están', () => {
  const sin = P.validatePromo(base2)
  assert.ok(sin.ok && !('via' in sin.promo) && !('timeFrom' in sin.promo))
  const con = P.validatePromo({ ...base2, via: 'retiro', timeFrom: '20:00', timeTo: '21:30' })
  assert.ok(con.ok)
  assert.equal(con.promo.via, 'retiro')
  assert.equal(con.promo.timeFrom, '20:00')
  assert.equal(con.promo.timeTo, '21:30')
  assert.ok(!P.validatePromo({ ...base2, via: 'volando' }).ok)
  assert.ok(!P.validatePromo({ ...base2, timeFrom: '20:00' }).ok) // falta "hasta"
  assert.ok(!P.validatePromo({ ...base2, timeFrom: '25:00', timeTo: '26:00' }).ok)
})

test('el precio especial de una burger no admite modalidad ni horario', () => {
  const item = { id: 'i', enabled: true, kind: 'itemPrice', itemName: 'OBRERA', itemSize: 'doble', specialPrice: 9000, weekdays: [5] }
  assert.ok(P.validatePromo(item).ok)
  assert.ok(!P.validatePromo({ ...item, via: 'retiro' }).ok)
  assert.ok(!P.validatePromo({ ...item, timeFrom: '20:00', timeTo: '21:00' }).ok)
})

test('promoRige: retiro, envío y horario (incluido el que cruza la medianoche)', () => {
  const retiro = { via: 'retiro' }
  assert.ok(P.promoRige(retiro, { zoneId: 'retiro' }))
  assert.ok(!P.promoRige(retiro, { zoneId: 'z1' }))
  assert.ok(!P.promoRige(retiro, {})) // todavía no eligió
  const envio = { via: 'delivery' }
  assert.ok(P.promoRige(envio, { zoneId: 'z3' }) && P.promoRige(envio, { zoneId: 'otra' }))
  assert.ok(!P.promoRige(envio, { zoneId: 'retiro' }) && !P.promoRige(envio, {}))
  const hh = { timeFrom: '20:00', timeTo: '21:00' }
  assert.ok(P.promoRige(hh, { minutes: 20 * 60 + 15 }))
  assert.ok(!P.promoRige(hh, { minutes: 21 * 60 }))
  const noche = { timeFrom: '23:00', timeTo: '01:00' }
  assert.ok(P.promoRige(noche, { minutes: 23 * 60 + 30 }) && P.promoRige(noche, { minutes: 30 }) && !P.promoRige(noche, { minutes: 12 * 60 }))
  assert.ok(P.promoRige({}, {}) && !P.promoRige(null, {})) // sin condiciones, siempre
})

test('el texto de la promo avisa las condiciones', () => {
  const p = P.validatePromo({ ...base2, via: 'retiro', timeFrom: '20:00', timeTo: '21:00' }).promo
  const n = P.normalizePromo(p, { dateLabel: 'HOY' })
  assert.match(n.headline, /solo retirando en el local · de 20:00 a 21:00 hs/)
  assert.match(n.ticker, /SOLO RETIRANDO EN EL LOCAL/)
  assert.equal(P.condicionesTexto(base2), '')
})

test('minutosAR da la hora de Argentina', () => {
  assert.equal(P.minutosAR(new Date('2026-10-27T23:30:00Z')), 20 * 60 + 30) // UTC-3
})
