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
import { ZONES } from '../src/lib/zones.js'
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


// ─── Página de envíos (/envios/) ─────────────────────────────────────────
// Página estática con contenido real: zonas, precios y cómo pedir. Se arma desde zones.js.
// Un script chico actualiza los precios si se cambian desde el panel.
// Las calles de cada tramo, como las muestra el panel: "De 22 a 31 · de 72 a 90" → "De 22 a 31 y de 72 a 90"
const sectoresEnFrase = (calles) => calles.map((c) => c.replace(/ · /g, ' y '))

export const TITULO_ENVIOS = 'Delivery de hamburguesas en La Plata: zonas y precios de envío | Mr. White Burgers'
export const DESCRIPCION_ENVIOS =
  'Zonas y precios de envío de Mr. White Burgers en La Plata. Mirá cuánto cuesta el delivery a tu zona (martes cerrado) y pedí por WhatsApp.'

export function paginaEnvios(url) {
  const filas = ZONES.map((z) => {
    const sec = sectoresEnFrase(z.calles)
    return `<tr><td><strong>${esc(z.name)}</strong><br><small>${esc(z.bounds)}</small></td><td data-zona="${z.id}">${money(z.price)}</td><td><small>${esc(sec.join('; ') || '—')}</small></td></tr>`
  }).join('')
  const desde = Math.min(...ZONES.map((z) => z.price))
  const hasta = Math.max(...ZONES.map((z) => z.price))
  const grafo = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}/envios/#pagina`,
        url: `${url}/envios/`,
        name: TITULO_ENVIOS,
        description: DESCRIPCION_ENVIOS,
        inLanguage: 'es-AR',
        isPartOf: { '@id': `${url}/#web` },
        about: { '@id': `${url}/#negocio` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${url}/` },
          { '@type': 'ListItem', position: 2, name: 'Envíos', item: `${url}/envios/` },
        ],
      },
    ],
  }
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITULO_ENVIOS)}</title>
<meta name="description" content="${esc(DESCRIPCION_ENVIOS)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="${url}/envios/">
<link rel="icon" type="image/png" href="/favicon-burger.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(TITULO_ENVIOS)}">
<meta property="og:description" content="${esc(DESCRIPCION_ENVIOS)}">
<meta property="og:url" content="${url}/envios/">
<meta property="og:image" content="${url}/og.jpg">
<script type="application/ld+json">${JSON.stringify(grafo).replace(/</g, '\\u003c')}</script>
<style>
  *{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  main{max-width:760px;margin:0 auto;padding:24px 20px 64px}
  a{color:#F0C832}h1{font-size:30px;line-height:1.15;margin:20px 0 12px}h2{font-size:22px;margin:36px 0 10px}
  p,li{color:rgba(255,255,255,.78)}table{width:100%;border-collapse:collapse;margin:14px 0}
  th,td{text-align:left;padding:12px 10px;border-bottom:1px solid rgba(255,255,255,.12);vertical-align:top}th{color:#F0C832;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
  small{color:rgba(255,255,255,.55)}.btn{display:inline-block;background:#F0C832;color:#000;font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;margin:8px 10px 8px 0}
  .btn.o{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}nav a{font-size:14px}
</style>
</head>
<body>
<main>
<nav><a href="/">← Mr. White Burgers</a></nav>
<h1>Delivery de hamburguesas en La Plata: zonas y precios de envío</h1>
<p>En <strong>Mr. White Burgers</strong> hacemos smash burgers en ${esc(direccionCompleta())} y las llevamos a tu casa. El envío cuesta <strong>entre ${money(desde)} y ${money(hasta)}</strong> según qué tan lejos estés del local. Si preferís, retirás en el local <strong>sin cargo</strong>.</p>
<h2>Zonas y precios</h2>
<table>
<thead><tr><th>Zona</th><th>Envío</th><th>Dónde</th></tr></thead>
<tbody>${filas}</tbody>
</table>
<p><small>Si estás fuera de estas zonas, escribinos por WhatsApp y lo coordinamos.</small></p>
<h2>¿Cómo sé en qué zona estoy?</h2>
<p>Armá tu pedido en la web y, en el carrito, escribí tu esquina (por ejemplo “12 y 60”): te mostramos tu zona y el precio del envío al instante. El pedido te llega por WhatsApp y seguimos por ahí.</p>
<h2>Horarios</h2>
<p>${esc(horariosEnFrase())}.</p>
<p><a class="btn" href="${url}/#menu">Armar mi pedido</a><a class="btn o" href="https://wa.me/${NEGOCIO.whatsapp}">Consultar por WhatsApp</a></p>
<p><small>${esc(NEGOCIO.nombre)} · ${esc(direccionCompleta())} · <a href="${linkMapa(ADDRESS.lat, ADDRESS.lng)}">Cómo llegar</a> · Tel. ${esc(NEGOCIO.telefono)}</small></p>
</main>
<script>
// Si los precios cambian desde el panel, se muestran los de ahora
fetch('/api/panel?action=public-config').then(function(r){return r.ok?r.json():null}).then(function(c){
  if(!c||!c.zones)return;
  Object.keys(c.zones).forEach(function(id){var p=c.zones[id]&&c.zones[id].price,el=document.querySelector('[data-zona="'+id+'"]');
    if(typeof p==='number'&&el)el.textContent='$'+p.toLocaleString('es-AR')})
}).catch(function(){});
</script>
</body>
</html>
`
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
  <url>
    <loc>${url}/envios/</loc>
    <lastmod>${fecha.toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
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
Se arma el pedido en ${url}/ y se envía por WhatsApp con el botón "Pedir por WhatsApp". Hay envío a domicilio en La Plata y retiro en el local (sin cargo).

## Envíos (detalle en ${url}/envios/)
${ZONES.map((z) => `- ${z.name} (${z.bounds.toLowerCase()}): ${money(z.price)}`).join('\n')}
Fuera de estas zonas se coordina por WhatsApp. En la web se escribe la esquina y se calcula la zona.

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
      this.emitFile({ type: 'asset', fileName: 'envios/index.html', source: paginaEnvios(url) })
    },
  }
}
