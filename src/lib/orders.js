// Registra el pedido cuando el cliente toca "Pedir por WhatsApp".
// Va a /api/panel del propio sitio (no a un servicio externo), y desde ahí el
// servidor lo suma a las estadísticas. Si la función no está configurada, falla
// en silencio: el pedido de WhatsApp sale igual.

export function recordOrder({ items, total, cashTotal, zone }) {
  try {
    const payload = {
      action: 'order',
      items: items.map((i) => ({ id: i.id, name: i.name, size: i.size, qty: i.qty })),
      total: Math.round(total || 0),
      cashTotal: Math.round(cashTotal || 0),
      zone: zone?.name || '',
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
