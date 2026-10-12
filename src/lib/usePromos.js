import { useMemo, useState, useSyncExternalStore } from 'react'
import { useConfig } from './config'
import { promosActivas, localDateStr, isDateStr } from './promos'
import { BURGERS } from './menu'

// ─── Qué promo corre ahora, para los componentes del sitio ──────────────
// Reemplaza a las constantes de módulo de antes (ACTIVE_PROMO / PREVIEW_PROMO):
// deriva la promo de HOY y la de MAÑANA de la config que viene del panel, así que
// se actualiza sola cuando la config termina de cargar o cuando cambia el día.
//
// Para probar sin esperar (igual que antes):
//   ?promoDate=AAAA-MM-DD  simula que hoy es ese día
//   ?promo=off             sin promo
//
// "Hoy" es la fecha del reloj del dispositivo de quien mira (igual que el horario
// de apertura del sitio). Si el celular está en otra zona horaria, el día cambia a
// la medianoche de ESA zona, no a la de La Plata.
function leerParametros() {
  try {
    const q = new URLSearchParams(window.location.search)
    const fecha = q.get('promoDate')
    return { off: q.get('promo') === 'off', fecha: isDateStr(fecha) ? fecha : null }
  } catch {
    return { off: false, fecha: null }
  }
}

// El reloj es UNO solo para todo el sitio. Si cada componente tuviera el suyo,
// alrededor de la medianoche el carrito, las tarjetas y el cartel podrían cambiar de
// día en momentos distintos (y mostrar un descuento que el carrito ya no hace).
// useSyncExternalStore lee la fecha de verdad en cada render; esto solo avisa
// "fijate otra vez" cada 20 segundos y cuando la pestaña vuelve a estar a la vista
// (un celular dormido no corre timers).
const oyentes = new Set()
let apagarReloj = null

function avisar() {
  oyentes.forEach((fn) => fn())
}

function suscribirReloj(fn) {
  oyentes.add(fn)
  if (!apagarReloj) {
    const id = setInterval(avisar, 20_000)
    document.addEventListener('visibilitychange', avisar)
    window.addEventListener('focus', avisar)
    apagarReloj = () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', avisar)
      window.removeEventListener('focus', avisar)
    }
  }
  return () => {
    oyentes.delete(fn)
    if (!oyentes.size && apagarReloj) {
      apagarReloj()
      apagarReloj = null
    }
  }
}

// El texto 'AAAA-MM-DD' es igual mientras no cambie el día: React no re-renderiza de más
const hoyDelReloj = () => localDateStr()

const NADA = { active: null, preview: null }
const NOMBRES_CARTA = BURGERS.map((b) => b.name)

// → { active, preview }: la promo que corre hoy y la de mañana (o null), ya con
// los textos derivados (title, headline, ticker, short, bigPrice, bigSub, dateLabel).
export function usePromos() {
  const cfg = useConfig()
  const [params] = useState(leerParametros)
  const delReloj = useSyncExternalStore(suscribirReloj, hoyDelReloj, hoyDelReloj)
  const hoy = params.fecha || delReloj
  const promos = cfg?.promos
  return useMemo(() => (params.off ? NADA : promosActivas(promos, hoy, { burgerNames: NOMBRES_CARTA })), [promos, hoy, params.off])
}
