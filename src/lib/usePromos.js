import { useEffect, useMemo, useState } from 'react'
import { useConfig } from './config'
import { promosActivas, localDateStr, isDateStr } from './promos'

// ─── Qué promo corre ahora, para los componentes del sitio ──────────────
// Reemplaza a las constantes de módulo de antes (ACTIVE_PROMO / PREVIEW_PROMO):
// deriva la promo de HOY y la de MAÑANA de la config que viene del panel, así que
// se actualiza sola cuando la config termina de cargar o cuando cambia el día.
//
// Para probar sin esperar (igual que antes):
//   ?promoDate=AAAA-MM-DD  simula que hoy es ese día
//   ?promo=off             sin promo
function leerParametros() {
  try {
    const q = new URLSearchParams(window.location.search)
    const fecha = q.get('promoDate')
    return { off: q.get('promo') === 'off', fecha: isDateStr(fecha) ? fecha : null }
  } catch {
    return { off: false, fecha: null }
  }
}

// La fecha de hoy en el reloj del cliente; se refresca si la página queda abierta
// pasada la medianoche (así la promo de ayer no sigue colgada).
function useHoy(fijo) {
  const [hoy, setHoy] = useState(() => localDateStr())
  useEffect(() => {
    if (fijo) return undefined
    const id = setInterval(() => {
      const ahora = localDateStr()
      setHoy((prev) => (prev === ahora ? prev : ahora))
    }, 60_000)
    return () => clearInterval(id)
  }, [fijo])
  return fijo || hoy
}

const NADA = { active: null, preview: null }

// → { active, preview }: la promo que corre hoy y la de mañana (o null), ya con
// los textos derivados (title, headline, ticker, short, bigPrice, bigSub, dateLabel).
export function usePromos() {
  const cfg = useConfig()
  const [params] = useState(leerParametros)
  const hoy = useHoy(params.fecha)
  const promos = cfg?.promos
  return useMemo(() => (params.off ? NADA : promosActivas(promos, hoy)), [promos, hoy, params.off])
}
