import { track } from '@vercel/analytics'

// Eventos para Vercel Analytics (los ves en su pestaña Events, por nombre).
// Si Analytics no está disponible (dev, bloqueado) no se rompe nada.
function enviar(nombre, datos) {
  try {
    track(nombre, datos)
  } catch {
    /* analytics no disponible */
  }
}

export const trackBurgerClick = (burger) => enviar('burger_add', { burger: burger.name })
export const trackDrinkClick = (nombre) => enviar('drink_add', { drink: nombre })
