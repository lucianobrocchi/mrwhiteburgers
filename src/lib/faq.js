// ─── Preguntas frecuentes ────────────────────────────────────────────────
// Se muestran en la web y son los mismos textos que se mandan a Google (FAQPage) y a
// llms.txt. Salen de los datos reales (horarios, dirección, carta): si cambian, se actualizan.
// Solo se afirma lo que el sitio ya hace; no se promete nada que no esté confirmado.

import { ADDRESS, scheduleSummary } from './schedule.js'
import { BURGERS_BASE } from './menuBase.js'
import { NEGOCIO } from './negocio.js'

const minus = (s) => s.charAt(0).toLowerCase() + s.slice(1)

// "Miércoles a lunes de 19:30 a 22:30; los martes cerramos"
export function horariosEnFrase() {
  const grupos = scheduleSummary()
  const abre = grupos.filter((g) => !g.closed).map((g) => `${g.label.includes(' a ') ? 'de ' : 'los '}${minus(g.label)}, de ${g.hours}`)
  const cierra = grupos.filter((g) => g.closed).map((g) => minus(g.label))
  const cerrado = cierra.length ? ` y ${cierra.length === 1 ? 'los ' + cierra[0] + ' cerramos' : 'cerramos ' + cierra.join(' y ')}` : ''
  return `Abrimos ${abre.join(' y ')}${cerrado}`
}

export const direccionCompleta = () => `Calle ${ADDRESS.label}, ${ADDRESS.barrio}, ${ADDRESS.city}`

export function faqList() {
  const nombres = BURGERS_BASE.map((b) => b.name).join(', ')
  return [
    {
      q: '¿Dónde queda Mr. White Burgers?',
      a: `${direccionCompleta()}. Se retira en el local o llevamos el pedido a domicilio.`,
    },
    {
      q: '¿Qué días y horarios abren?',
      a: `${horariosEnFrase()}. Podés dejar el pedido armado desde la web y lo seguimos por WhatsApp.`,
    },
    {
      q: '¿Hacen envíos a domicilio en La Plata?',
      a: 'Sí. Enviamos a domicilio en La Plata y el costo depende de la zona: en el carrito escribís tu esquina y te mostramos el precio al instante. También podés retirar en el local sin costo de envío.',
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
