import { track } from '@vercel/analytics'
import { supabase } from './supabase'

// Registra el interés en una burger (clic en "Agregar").
// - Evento en Vercel Analytics (lo ves en la pestaña Events, por nombre)
// - Contador en Supabase (lo ve el cliente en el panel), solo si viene de la base
export function trackBurgerClick(burger) {
  try {
    track('burger_add', { burger: burger.name })
  } catch {
    /* analytics no disponible (dev / bloqueado) — no romper */
  }
  if (burger?.fromDb && burger.id != null) {
    supabase.rpc('increment_burger_click', { b_id: burger.id }).then(
      () => {},
      () => {},
    )
  }
}
