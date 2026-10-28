// Redirección permanente desde la dirección vieja (pages.dev) y desde www al dominio oficial, para no partir
// el posicionamiento en Google entre dos direcciones. Solo corre en las rutas de public/_routes.json.
//
// GET/HEAD → 301. El resto (POST del panel, etc.) → 308, que conserva el método y el cuerpo.

const OFICIAL = 'mrwhiteburgers.com.ar'
const VIEJOS = new Set(['mrwhiteburgers.pages.dev', 'www.mrwhiteburgers.com.ar'])

export async function onRequest({ request, next }) {
  const url = new URL(request.url)
  if (!VIEJOS.has(url.hostname)) return next()
  url.hostname = OFICIAL
  url.protocol = 'https:'
  url.port = ''
  const metodo = request.method
  return Response.redirect(url.toString(), metodo === 'GET' || metodo === 'HEAD' ? 301 : 308)
}
