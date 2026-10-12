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
