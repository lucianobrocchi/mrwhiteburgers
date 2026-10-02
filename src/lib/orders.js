// Registra el pedido cuando el cliente toca "Pedir por WhatsApp".
// Va a /api/panel del propio sitio (no a un servicio externo) y de ahí a las
// estadísticas. Si la función no está configurada falla en silencio: el pedido
// de WhatsApp sale igual, esto nunca puede frenar una venta.
//
// No se guarda nada personal: ni nombre, ni teléfono, ni dirección. Solo qué se
// pidió, cuánto, a qué zona y de dónde llegó el cliente.

import { getSource } from './source'

export function recordOrder({ items, total, subtotal, discount, zone, promo }) {
  try {
    const payload = {
      items: items.map((i) => ({
        k: i.kind === 'drink' ? 'd' : 'b',
        id: i.id,
        n: i.name,
        s: i.size,
        sl: i.sizeLabel,
        f: i.flavor || undefined,
        q: i.qty,
        u: i.basePrice ?? i.price,
        x: (i.extras || []).map((e) => ({ id: e.id, n: e.name, q: e.qty, p: e.price })),
      })),
      total: Math.round(total || 0),
      subtotal: Math.round(subtotal || 0),
      discount: Math.round(discount || 0),
      promo: promo || '',
      zoneId: zone?.id || '',
      zone: zone?.name || '',
      src: getSource(),
    }
    // keepalive: el navegador está por abrir WhatsApp y se lleva la pestaña
    fetch('/api/panel?action=order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* noop */
  }
}
