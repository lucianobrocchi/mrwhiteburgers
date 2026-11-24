// ─── Preguntas frecuentes ────────────────────────────────────────────────
// Se muestran en la web y son los mismos textos que se mandan a Google (FAQPage) y a
// llms.txt. Salen de los datos reales (horarios, dirección, carta): si cambian, se actualizan.
// Solo se afirma lo que el sitio ya hace; no se promete nada que no esté confirmado.

import { ADDRESS, scheduleSummary, DEFAULT_SCHEDULE } from './schedule.js'
import { BURGERS_BASE } from './menuBase.js'
import { NEGOCIO } from './negocio.js'
import { ZONES } from './zones.js'

const minus = (s) => s.charAt(0).toLowerCase() + s.slice(1)

// "Abrimos de miércoles a domingo, de 19:00 a 23:00 y los lunes y martes cerramos".
// `schedule`: el horario que rige (el del panel); sin pasarlo, el por defecto.
const plural = (dia) => (dia.endsWith('s') ? dia : `${dia}s`) // sábado → sábados, lunes → lunes
const enPlural = (label) => label.split(' y ').map(plural).join(' y ') // "sábado y domingo" → "sábados y domingos"

export function horariosEnFrase(schedule = DEFAULT_SCHEDULE) {
  const grupos = scheduleSummary(schedule)
  const tramo = (g) => {
    const l = minus(g.label)
    if (g.days.length === 7) return l          // "todos los días"
    if (g.days.length > 2) return `de ${l}`    // "de miércoles a domingo"
    return `los ${enPlural(l)}`                // "los sábados", "los viernes y sábados"
  }
  const abre = grupos.filter((g) => !g.closed).map((g) => `${tramo(g)}, de ${g.hours}`)
  const cierra = grupos.filter((g) => g.closed).map((g) => (g.days.length > 2 ? `de ${minus(g.label)}` : `los ${enPlural(minus(g.label))}`))
  if (!abre.length) return 'Por ahora no tenemos días fijos de apertura: consultanos por WhatsApp'
  const cerrado = cierra.length ? ` y ${cierra.join(' y ')} cerramos` : ''
  return `Abrimos ${abre.join(' y ')}${cerrado}`
}

export const direccionCompleta = () => `Calle ${ADDRESS.label}, ${ADDRESS.barrio}, ${ADDRESS.city}`

export function faqList(schedule = DEFAULT_SCHEDULE) {
  const nombres = BURGERS_BASE.map((b) => b.name).join(', ')
  return [
    {
      q: '¿Dónde queda Mr. White Burgers?',
      a: `${direccionCompleta()}. Se retira en el local o llevamos el pedido a domicilio.`,
    },
    {
      q: '¿Qué días y horarios abren?',
      a: `${horariosEnFrase(schedule)}. Podés dejar el pedido armado desde la web y lo seguimos por WhatsApp.`,
    },
    {
      q: '¿Hacen envíos a domicilio en La Plata?',
      a: `Sí. Enviamos a domicilio en La Plata y el costo depende de la zona (desde $${Math.min(...ZONES.map((z) => z.price)).toLocaleString('es-AR')}): en el carrito escribís tu esquina y te mostramos el precio al instante. También podés retirar en el local sin costo de envío.`,
    },
    {
      q: '¿Cómo hago un pedido?',
      a: `Elegís tus hamburguesas en la web, agregás extras y bebidas si querés y tocás “Pedir por WhatsApp”. El pedido llega armado a nuestro WhatsApp (${NEGOCIO.telefono}) y seguimos por ahí.`,
    },
    {
      q: '¿Qué hamburguesas tienen?',
      a: `Smash burgers en tamaño simple, doble y triple: ${nombres}. Todas vienen con papas fritas.`,
    },
    {
      q: '¿Qué es una smash burger?',
      a: 'Es una hamburguesa donde el medallón de carne se aplasta (“smashea”) contra la plancha muy caliente, lo que forma una costra crocante y caramelizada por fuera y lo deja jugoso por dentro. Las nuestras van en pan de papa con queso y nuestras salsas.',
    },
  ]
}
