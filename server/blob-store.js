// Almacén real: Vercel Blob.
//
// - Lee con useCache:false, así siempre ve lo último que se guardó.
// - Escribe con `ifMatch` (etag): si otro proceso modificó el archivo entre que
//   lo leímos y lo escribimos, falla con PRECONDITION y panel-core reintenta.
// - Soporta stores privados (preferido: los pedidos no quedan en una URL
//   pública) y públicos. Prueba primero 'private' y, si el store no lo acepta,
//   usa 'public'. Se puede forzar con la variable BLOB_ACCESS.

import { put, get, list, BlobPreconditionFailedError } from '@vercel/blob'

export function blobStore(env = {}) {
  let access = env.BLOB_ACCESS === 'public' || env.BLOB_ACCESS === 'private' ? env.BLOB_ACCESS : null
  const orden = () => (access ? [access, access === 'private' ? 'public' : 'private'] : ['private', 'public'])

  return {
    name: 'blob',

    async getJson(path) {
      for (const acc of orden()) {
        try {
          const r = await get(path, { access: acc, useCache: false })
          if (!r || r.statusCode !== 200) continue
          const texto = await new Response(r.stream).text()
          access = acc
          return { data: JSON.parse(texto), etag: r.blob.etag }
        } catch {
          /* no existe, o el store es del otro tipo: probamos el otro */
        }
      }
      return null
    },

    async putJson(path, data, etag) {
      const cuerpo = JSON.stringify(data)
      let ultimo
      for (const acc of orden()) {
        try {
          // Con etag: pisa solo si sigue siendo esa versión (ifMatch).
          // Sin etag (crear): solo si no existe (allowOverwrite:false). Así una
          // lectura que falló no puede terminar sobrescribiendo datos buenos.
          const r = await put(path, cuerpo, {
            access: acc,
            allowOverwrite: !!etag,
            addRandomSuffix: false,
            contentType: 'application/json',
            cacheControlMaxAge: 60,
            ...(etag ? { ifMatch: etag } : {}),
          })
          access = acc
          return r?.etag ?? null
        } catch (e) {
          if (e instanceof BlobPreconditionFailedError || (!etag && /already exists/i.test(String(e?.message)))) {
            const err = new Error('El archivo cambió mientras se guardaba')
            err.code = 'PRECONDITION'
            throw err
          }
          ultimo = e
        }
      }
      throw ultimo
    },

    async listPaths(prefix) {
      const paths = []
      let cursor
      do {
        const r = await list({ prefix, cursor, limit: 1000 })
        paths.push(...r.blobs.map((b) => b.pathname))
        cursor = r.hasMore ? r.cursor : undefined
      } while (cursor)
      return paths
    },
  }
}
