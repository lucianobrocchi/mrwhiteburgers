// Función de Vercel: /api/panel
//
// Corre en el mismo dominio del sitio, así que ningún bloqueador de anuncios la
// corta (a diferencia de llamar a api.github.com desde el navegador). Hace dos
// cosas: guarda lo que se edita en el panel (stock, precios, avisos) y registra
// los pedidos para las estadísticas.
//
// Para activarla en Vercel:
//   1. Storage → Create → Blob → conectarlo al proyecto
//      (Vercel agrega BLOB_READ_WRITE_TOKEN solo)
//   2. Settings → Environment Variables → PANEL_PASSWORD = la clave del panel
//   3. Redeploy
//
// La lógica está en server/panel-core.js (con tests); acá solo se arma.

import { createPanel } from '../server/panel-core.js'
import { blobStore } from '../server/blob-store.js'

const store = process.env.BLOB_READ_WRITE_TOKEN ? blobStore(process.env) : null

export default createPanel({ store, env: process.env })
