// ─── Datos del negocio (un solo lugar) ───────────────────────────────────
// Los usan el sitio, los datos estructurados para Google, llms.txt y el sitemap
// (ver scripts/seo.mjs). Cuando llegue el dominio propio, se cambia SOLO `url`
// y se vuelve a publicar: canonical, sitemap, robots y compartidos se actualizan solos.

export const NEGOCIO = {
  nombre: 'Mr. White Burgers',
  url: 'https://mrwhiteburgers.com.ar',
  telefono: '+54 9 221 303-4143',
  whatsapp: '5492213034143',
  instagram: 'https://www.instagram.com/mr.whiteburgers/',
  // Ficha de Google Maps ("Mr White Burgers La Plata"). La web la usa en "Cómo llegar" y en los datos para Google.
  perfilGoogle: 'https://www.google.com/maps?cid=11826860148380739577',
  // Abre directo el formulario para dejar una reseña (el Place ID sale del identificador de la ficha)
  resenaGoogle: 'https://search.google.com/local/writereview?placeid=ChIJBSpIKHfpopUR-Sd1wKRyIaQ',
  // Coordenadas y dirección: salen de ADDRESS en schedule.js
}

// Link de "Cómo llegar": el perfil de Google si ya está, si no el punto exacto del mapa
export const linkMapa = (lat, lng) =>
  NEGOCIO.perfilGoogle || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

// El link a WhatsApp, con un mensaje de arranque opcional
export const linkWhatsApp = (texto = '') =>
  `https://wa.me/${NEGOCIO.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
