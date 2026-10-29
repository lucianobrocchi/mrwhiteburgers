import test from 'node:test'
import assert from 'node:assert/strict'
import { visitaReal } from './track.js'

const CEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0 Safari/537.36'

test('una persona de La Plata se mide', () => {
  assert.equal(visitaReal({ ua: CEL, tz: 'America/Argentina/Buenos_Aires' }), true)
  assert.equal(visitaReal({ ua: PC, tz: 'America/Buenos_Aires' }), true)
})

test('países vecinos también (gente de paso, Instagram)', () => {
  assert.equal(visitaReal({ ua: CEL, tz: 'America/Montevideo' }), true)
  assert.equal(visitaReal({ ua: CEL, tz: 'America/Santiago' }), true)
})

test('los centros de datos de EE. UU. y Europa no se miden', () => {
  assert.equal(visitaReal({ ua: PC, tz: 'America/Los_Angeles' }), false)
  assert.equal(visitaReal({ ua: PC, tz: 'America/Chicago' }), false)
  assert.equal(visitaReal({ ua: PC, tz: 'Europe/Amsterdam' }), false)
  assert.equal(visitaReal({ ua: PC, tz: 'UTC' }), false)
})

test('navegadores automáticos y herramientas no se miden', () => {
  assert.equal(visitaReal({ ua: CEL, tz: 'America/Argentina/Buenos_Aires', webdriver: true }), false)
  assert.equal(visitaReal({ ua: 'Mozilla/5.0 HeadlessChrome/120 Safari', tz: 'America/Argentina/Buenos_Aires' }), false)
  assert.equal(visitaReal({ ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)', tz: 'America/Argentina/Buenos_Aires' }), false)
  assert.equal(visitaReal({ ua: 'Chrome-Lighthouse', tz: 'America/Argentina/Buenos_Aires' }), false)
})

test('si el navegador no informa el huso horario se mide igual (no se pierde a nadie)', () => {
  assert.equal(visitaReal({ ua: CEL, tz: '' }), true)
})
