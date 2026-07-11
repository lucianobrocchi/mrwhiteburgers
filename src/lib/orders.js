import { supabase } from './supabase'

// Registra un pedido cuando el cliente toca "Pedir por WhatsApp".
// No bloquea ni rompe si falla (p. ej. si la tabla aún no existe).
export function recordOrder({ items, subtotal, discount, total, promo }) {
  try {
    const payload = {
      items: items.map((i) => ({ name: i.name, size: i.sizeLabel, qty: i.qty, price: i.price })),
      item_count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: Math.round(subtotal || 0),
      discount: Math.round(discount || 0),
      total: Math.round(total || 0),
      promo: promo || null,
    }
    supabase.from('orders').insert(payload).then(
      () => {},
      () => {},
    )
  } catch {
    /* noop */
  }
}
