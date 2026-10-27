// Tests del SEO generado. Se corren con:   node --test scripts/seo.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { jsonLd, robotsTxt, sitemapXml, llmsTxt, resumenNoscript } from './seo.mjs'
import { BURGERS_BASE } from '../src/lib/menuBase.js'

const URL = 'https://ejemplo.com.ar'

test('JSON-LD: es JSON válido con negocio, carta y preguntas, y usa la URL dada', () => {
  const crudo = jsonLd(URL).replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
  const g = JSON.parse(crudo)['@graph']
  const tipos = g.map((x) => x['@type'])
  assert.deepEqual(tipos, ['WebSite', 'Restaurant', 'Menu', 'FAQPage'])
  const r = g[1]
  assert.equal(r.url, `${URL}/`)
  assert.equal(r.address.addressLocality, 'La Plata')
  assert.ok(r.geo.latitude < -34 && r.geo.longitude < -57)
  assert.equal(r.openingHoursSpecification[0].opens, '19:30')
  assert.ok(!r.openingHoursSpecification[0].dayOfWeek.includes('Tuesday')) // los martes se cierra
  const items = g[2].hasMenuSection[0].hasMenuItem
  assert.equal(items.length, BURGERS_BASE.length)
  assert.equal(items[0].offers.length, 3) // simple, doble, triple
  assert.ok(g[3].mainEntity.length >= 5)
})

test('robots, sitemap y llms.txt apuntan al dominio y protegen el panel', () => {
  assert.match(robotsTxt(URL), /Disallow: \/panel\//)
  assert.match(robotsTxt(URL), new RegExp(`Sitemap: ${URL}/sitemap.xml`))
  assert.match(sitemapXml(URL, new Date('2026-10-27')), /<loc>https:\/\/ejemplo.com.ar\/<\/loc>/)
  const l = llmsTxt(URL)
  for (const b of BURGERS_BASE) assert.ok(l.includes(b.name))
  assert.match(l, /La Plata/)
})

test('noscript escapa el contenido y trae la dirección', () => {
  const n = resumenNoscript(URL)
  assert.match(n, /^<noscript>/)
  assert.match(n, /Altos de San Lorenzo/)
})
