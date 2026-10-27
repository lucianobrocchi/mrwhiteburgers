// ─── SEO y GEO del sitio, generado desde los datos reales ────────────────
// Plugin de Vite. Al armar la web:
//   · reemplaza %SITE_URL% en index.html (canonical, compartidos),
//   · inserta los datos estructurados para Google (JSON-LD: negocio, carta, horarios, preguntas),
//   · inserta un resumen en <noscript> para los robots que no ejecutan JavaScript,
//   · crea robots.txt, sitemap.xml y llms.txt (para buscadores con IA).
// Todo sale de src/lib (carta, horarios, dirección, negocio): así nada se desactualiza.

import { BURGERS_BASE } from '../src/lib/menuBase.js'
import { EXTRAS, DRINKS } from '../src/lib/catalog.js'
import { SCHEDULE, ADDRESS } from '../src/lib/schedule.js'
import { NEGOCIO, linkMapa } from '../src/lib/negocio.js'
import { faqList, horariosEnFrase, direccionCompleta } from '../src/lib/faq.js'

const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const money = (n) => '$' + Math.round(n).toLocaleString('es-AR')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tam = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const TITULO = 'Mr. White Burgers — Smash burgers en La Plata | Delivery y retiro'
export const DESCRIPCION =
  'Smash burgers premium en La Plata: pan de papa, carne smasheada y papas fritas incluidas. Armá tu pedido online y mandalo por WhatsApp, con envío a domicilio o retiro en 27 y 80.'

// Horarios para Google: un bloque por cada tramo igual de días
function horariosSchema() {
  const grupos = new Map()
  for (let d = 0; d < 7; d++) {
    for (const t of SCHEDULE[d]) {
      const k = `${t.from}-${t.to}`
      if (!grupos.has(k)) grupos.set(k, { opens: t.from, closes: t.to, days: [] })
      grupos.get(k).days.push(DIAS_SCHEMA[d])
    }
  }
  return [...grupos.values()].map((g) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: g.days,
    opens: g.opens,
    closes: g.closes,
  }))
}

function cartaSchema(url) {
  const oferta = (nombre, precio) => ({ '@type': 'Offer', name: nombre, price: String(precio), priceCurrency: 'ARS' })
  return {
    '@type': 'Menu',
    '@id': `${url}/#carta`,
    name: 'Carta de Mr. White Burgers',
    url: `${url}/#menu`,
    inLanguage: 'es-AR',
    hasMenuSection: [
      {
        '@type': 'MenuSection',
        name: 'Hamburguesas (todas con papas fritas)',
        hasMenuItem: BURGERS_BASE.map((b) => ({
          '@type': 'MenuItem',
          name: b.name,
          description: b.description,
          offers: Object.entries(b.prices).map(([s, p]) => oferta(tam(s), p)),
        })),
      },
      {
        '@type': 'MenuSection',
        name: 'Extras',
        hasMenuItem: EXTRAS.map((e) => ({
          '@type': 'MenuItem',
          name: e.name,
          ...(e.desc ? { description: e.desc } : {}),
          offers: oferta('Extra', e.price),
        })),
      },
      {
        '@type': 'MenuSection',
        name: 'Bebidas',
        hasMenuItem: DRINKS.map((d) => ({
          '@type': 'MenuItem',
          name: d.name,
          offers: d.sizes.map((s) => oferta(s.label, s.price)),
        })),
      },
    ],
  }
}

export function jsonLd(url) {
  const faq = faqList()
  const grafo = [
    {
      '@type': 'WebSite',
      '@id': `${url}/#web`,
      url: `${url}/`,
      name: NEGOCIO.nombre,
      inLanguage: 'es-AR',
      publisher: { '@id': `${url}/#negocio` },
    },
    {
      '@type': 'Restaurant',
      '@id': `${url}/#negocio`,
      name: NEGOCIO.nombre,
      alternateName: ['Mr White Burgers', 'Mr. White'],
      url: `${url}/`,
      image: [`${url}/og.jpg`],
      logo: `${url}/favicon-burger.png`,
      description: DESCRIPCION,
      servesCuisine: ['Hamburguesas', 'Smash burgers'],
      priceRange: '$$',
      telephone: NEGOCIO.telefono,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `Calle ${ADDRESS.label}`,
        addressLocality: ADDRESS.city,
        addressRegion: 'Buenos Aires',
        addressCountry: 'AR',
      },
      geo: { '@type': 'GeoCoordinates', latitude: ADDRESS.lat, longitude: ADDRESS.lng },
      hasMap: linkMapa(ADDRESS.lat, ADDRESS.lng),
      areaServed: { '@type': 'City', name: ADDRESS.city },
      openingHoursSpecification: horariosSchema(),
      hasMenu: { '@id': `${url}/#carta` },
      acceptsReservations: false,
      sameAs: [NEGOCIO.instagram, ...(NEGOCIO.perfilGoogle ? [NEGOCIO.perfilGoogle] : [])],
      potentialAction: {
        '@type': 'OrderAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${url}/#menu`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
        },
        deliveryMethod: ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet', 'http://purl.org/goodrelations/v1#DeliveryModePickUp'],
      },
    },
    cartaSchema(url),
    {
      '@type': 'FAQPage',
      '@id': `${url}/#preguntas`,
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }).replace(/</g, '\\u003c')}</script>`
}

// Resumen legible para robots que no ejecutan JavaScript (los usuarios con JS ven la web normal)
export function resumenNoscript(url) {
  const carta = BURGERS_BASE.map((b) =>
    `<li><strong>${esc(b.name)}</strong>: ${esc(b.description)} Simple ${money(b.prices.simple)}, doble ${money(b.prices.doble)}, triple ${money(b.prices.triple)}.</li>`).join('')
  const preguntas = faqList().map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')
  return `<noscript><main style="font-family:sans-serif;color:#fff;background:#000;padding:24px;max-width:720px;margin:auto">
<h1>${esc(NEGOCIO.nombre)} — Smash burgers en La Plata</h1>
<p>${esc(DESCRIPCION)}</p>
<h2>Carta</h2><ul>${carta}</ul>
<h2>Dónde estamos y horarios</h2>
<p>${esc(direccionCompleta())}. ${esc(horariosEnFrase())}.</p>
<p>Pedidos por WhatsApp: <a href="https://wa.me/${NEGOCIO.whatsapp}">${esc(NEGOCIO.telefono)}</a> · Instagram: <a href="${NEGOCIO.instagram}">@mr.whiteburgers</a></p>
<h2>Preguntas frecuentes</h2>${preguntas}
<p><a href="${url}/">${esc(url)}</a></p>
</main></noscript>`
}

export function robotsTxt(url) {
  return `# Todos los buscadores (Google, Bing) y los asistentes con IA (ChatGPT, Gemini, Perplexity, Claude) pueden leer la web.
User-agent: *
Allow: /
Disallow: /panel/
Disallow: /api/

Sitemap: ${url}/sitemap.xml
`
}

export function sitemapXml(url, fecha = new Date()) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}/</loc>
    <lastmod>${fecha.toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
}

export function llmsTxt(url) {
  const carta = BURGERS_BASE.map((b) =>
    `- ${b.name}: ${b.description} Simple ${money(b.prices.simple)} · Doble ${money(b.prices.doble)} · Triple ${money(b.prices.triple)}`).join('\n')
  const extras = EXTRAS.map((e) => `${e.name}${e.desc ? ` (${e.desc})` : ''} ${money(e.price)}`).join(' · ')
  const bebidas = DRINKS.map((d) => `${d.name} ${d.sizes.map((s) => `${s.label} ${money(s.price)}`).join(', ')}`).join(' · ')
  return `# ${NEGOCIO.nombre}

> Hamburguería de smash burgers premium en La Plata, Buenos Aires, Argentina. Se pide online por WhatsApp y se recibe con envío a domicilio o se retira en el local.

## Datos del local
- Dirección: ${direccionCompleta()}
- Horarios: ${horariosEnFrase()}.
- WhatsApp / teléfono: ${NEGOCIO.telefono}
- Instagram: ${NEGOCIO.instagram}
- Web y carta para pedir: ${url}/
- Mapa: ${linkMapa(ADDRESS.lat, ADDRESS.lng)}

## Carta (todas las hamburguesas vienen con papas fritas; precios de carta, pueden variar)
${carta}

Extras: ${extras}
Bebidas: ${bebidas}

## Cómo pedir
Se arma el pedido en ${url}/ y se envía por WhatsApp con el botón "Pedir por WhatsApp". Hay envío a domicilio en La Plata (el costo depende de la zona y se calcula en la web al escribir la esquina) y retiro en el local.

## Preguntas frecuentes
${faqList().map((f) => `- ${f.q} ${f.a}`).join('\n')}
`
}

export function seoPlugin(siteUrl = NEGOCIO.url) {
  const url = siteUrl.replace(/\/$/, '')
  return {
    name: 'mrwhite-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replaceAll('%SITE_URL%', url)
          .replaceAll('%SEO_TITULO%', esc(TITULO))
          .replaceAll('%SEO_DESCRIPCION%', esc(DESCRIPCION))
          .replace('<!--SEO_JSONLD-->', jsonLd(url))
          .replace('<!--SEO_NOSCRIPT-->', resumenNoscript(url))
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(url) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(url) })
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt(url) })
    },
  }
}
