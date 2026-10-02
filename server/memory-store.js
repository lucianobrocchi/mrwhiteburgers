// Almacén en memoria: para probar la lógica del panel sin credenciales y para
// el servidor de desarrollo. Se comporta como Blob: cada escritura sube la
// versión (etag) y una escritura con un etag viejo falla con PRECONDITION.
//
// `latencia` simula el tiempo de red entre leer y escribir, que es justo donde
// dos pedidos simultáneos se pisarían si no hubiera escritura optimista.

export function memoryStore({ latencia = 0 } = {}) {
  const archivos = new Map() // path → { json, v }
  const esperar = () => (latencia ? new Promise((r) => setTimeout(r, Math.random() * latencia)) : Promise.resolve())

  return {
    name: 'memory',

    async getJson(path) {
      await esperar()
      const f = archivos.get(path)
      return f ? { data: JSON.parse(f.json), etag: String(f.v) } : null
    },

    async putJson(path, data, etag) {
      await esperar()
      const f = archivos.get(path)
      // Con etag: solo si el archivo sigue siendo esa versión.
      // Sin etag (crear): solo si todavía no existe. Así nadie pisa a nadie, ni
      // una lectura fallida puede terminar borrando lo que ya estaba guardado.
      const choca = etag != null ? !f || String(f.v) !== String(etag) : !!f
      if (choca) {
        const e = new Error('precondition')
        e.code = 'PRECONDITION'
        throw e
      }
      const v = (f?.v || 0) + 1
      archivos.set(path, { json: JSON.stringify(data), v })
      return String(v)
    },

    async listPaths(prefix) {
      return [...archivos.keys()].filter((p) => p.startsWith(prefix))
    },

    _archivos: archivos, // solo para tests
  }
}
