// Almacén sobre Cloudflare D1: una base de datos de verdad para todos los clientes.
//   · config / eventos → tabla `kv` (un renglón chico por archivo, con versión para no pisarse)
//   · pedidos          → tabla `orders` (UNA FILA POR PEDIDO, nunca un archivo gigante)
// Todo lleva el site_id del cliente: cada sitio fija el suyo en el servidor, así uno
// nunca ve ni toca los datos de otro.
//
// Mismo contrato que memory-store y blob-store (ver panel-core.js), más `orders`.

const choque = () => Object.assign(new Error('precondition'), { code: 'PRECONDITION' })

const aPedido = (r) => ({
  id: r.id, at: r.at, d: r.d, h: r.h, w: r.w, total: r.total, subtotal: r.subtotal, discount: r.discount,
  promo: r.promo, zoneId: r.zone_id, zone: r.zone, src: r.src, items: JSON.parse(r.items),
})

export function d1Store(db, siteId) {
  return {
    name: 'd1',

    async getJson(path) {
      const f = await db.prepare('SELECT json, version FROM kv WHERE site_id = ? AND path = ?').bind(siteId, path).first()
      return f ? { data: JSON.parse(f.json), etag: String(f.version) } : null
    },

    async putJson(path, data, etag) {
      const json = JSON.stringify(data)
      if (etag == null) {
        // Crear: solo si todavía no existe
        const r = await db.prepare('INSERT INTO kv (site_id, path, json, version) VALUES (?, ?, ?, 1) ON CONFLICT(site_id, path) DO NOTHING')
          .bind(siteId, path, json).run()
        if (!r.meta.changes) throw choque()
        return '1'
      }
      const v = Number(etag)
      const r = await db.prepare("UPDATE kv SET json = ?, version = version + 1, updated_at = datetime('now') WHERE site_id = ? AND path = ? AND version = ?")
        .bind(json, siteId, path, v).run()
      if (!r.meta.changes) throw choque()
      return String(v + 1)
    },

    async listPaths(prefix) {
      const r = await db.prepare('SELECT path FROM kv WHERE site_id = ? AND path LIKE ?').bind(siteId, `${prefix}%`).all()
      return (r.results || []).map((x) => x.path)
    },

    orders: {
      // Suma un pedido. Si es igual a uno de los últimos `ventanaMs` (doble toque), no lo repite.
      async add(p, { ventanaMs, huella }) {
        const desde = new Date(Date.parse(p.at) - ventanaMs).toISOString()
        const rec = await db.prepare('SELECT * FROM orders WHERE site_id = ? AND at >= ?').bind(siteId, desde).all()
        const f = huella(p)
        if ((rec.results || []).some((r) => huella(aPedido(r)) === f)) return { duplicado: true }
        await db.prepare(
          'INSERT INTO orders (id, site_id, at, d, h, w, total, subtotal, discount, promo, zone_id, zone, src, items) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ).bind(p.id, siteId, p.at, p.d, p.h, p.w, p.total, p.subtotal, p.discount, p.promo, p.zoneId, p.zone, p.src, JSON.stringify(p.items)).run()
        return { duplicado: false }
      },

      // Pedidos desde la fecha `desde` (AAAA-MM-DD), los más nuevos primero
      async list(desde) {
        const r = await db.prepare('SELECT * FROM orders WHERE site_id = ? AND d >= ? ORDER BY at DESC LIMIT 20000').bind(siteId, desde).all()
        return (r.results || []).map(aPedido)
      },

      async remove(id) {
        const r = await db.prepare('DELETE FROM orders WHERE id = ? AND site_id = ?').bind(id, siteId).run()
        return r.meta.changes > 0
      },
    },
  }
}
