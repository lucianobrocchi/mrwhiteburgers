// Precios que tipea Joaco en el panel: node --test src/lib/precio.test.mjs
// El caso que importa: "15.000" tiene que ser quince mil, no quince.
import test from 'node:test'
import assert from 'node:assert/strict'
import { leerPrecio, textoDePrecio, muyBarato, mensajeMuyBarato } from './precio.js'
import { MIN_PROMO_PRICE } from './promos.js'

test('leerPrecio: entiende los formatos con los que se escribe plata en Argentina', () => {
  for (const t of ['15000', '15.000', '$15.000', '$ 15.000', ' 15 000 ', '15.000,00', '15000,0']) {
    assert.equal(leerPrecio(t), 15000, `"${t}"`)
  }
  assert.equal(leerPrecio('1.250.000'), 1250000)
  assert.equal(leerPrecio('0'), 0)
  assert.equal(leerPrecio('7'), 7)
})

test('leerPrecio: vacío es undefined y lo que no se entiende es NaN (nunca un número equivocado)', () => {
  assert.equal(leerPrecio(''), undefined)
  assert.equal(leerPrecio('   '), undefined)
  assert.equal(leerPrecio(undefined), undefined)
  for (const t of ['15,5', '15.5', '15.50', '1.5000', '-5', 'abc', '15k', '1e3', '15..000', '15,000.00', '.000', '15.00']) {
    assert.ok(Number.isNaN(leerPrecio(t)), `"${t}" → ${leerPrecio(t)}`)
  }
})

test('textoDePrecio: 15000 → "15.000" (y nada si no hay número)', () => {
  assert.equal(textoDePrecio(15000), '15.000')
  assert.equal(textoDePrecio(1250000), '1.250.000')
  assert.equal(textoDePrecio(undefined), '')
  assert.equal(textoDePrecio(NaN), '')
  assert.equal(leerPrecio(textoDePrecio(16500)), 16500)
})

test('muyBarato: frena lo que casi seguro es un error de tipeo', () => {
  assert.equal(muyBarato(15), true)
  assert.equal(muyBarato(999), true)
  assert.equal(muyBarato(MIN_PROMO_PRICE), false)
  assert.equal(muyBarato(MIN_PROMO_PRICE - 1), true)
  assert.equal(muyBarato(15000), false)
  assert.equal(muyBarato(0), false) // el cero ya lo rechaza la validación de la promo
  assert.equal(muyBarato(undefined), false)
  assert.equal(muyBarato(NaN), false)
})

test('mensajeMuyBarato: sugiere los miles sólo cuando tiene sentido', () => {
  assert.match(mensajeMuyBarato(15), /\$15\.000/)
  assert.doesNotMatch(mensajeMuyBarato(999), /\$999\.000/)
})
