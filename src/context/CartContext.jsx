import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext()

export const WHATSAPP_NUMBER = '5492213034143'
export const WHATSAPP_DISPLAY = '221 303-4143'

// ─── Promo del Viernes (3 de julio 2026) ─────────────────────────────────
// Se maneja sola por fecha: jueves 2/7 = anticipo (cartel sin descuento),
// viernes 3/7 = activa (cartel + descuentos), después = apagada.
// Para probar otro estado sin esperar: agregar ?promo=live | preview | off a la URL.
export const PROMO = {
  dateStr: '2026-07-03',
  dateLabel: 'VIERNES 3 DE JULIO',
  title: 'Promo del Viernes',
  bundlePrice: 15000,
  bundleLabel: '2 simples x $15.000',
  secondPct: 0.2,
  secondLabel: '20% off en el 2do combo',
  short: '2 simples x $15.000 + 20% off en el 2do combo',
}

function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function computePromoPhase() {
  try {
    const forced = new URLSearchParams(window.location.search).get('promo')
    if (forced === 'live' || forced === 'preview' || forced === 'off') return forced
  } catch { /* sin window/URL rara — seguimos por fecha */ }
  const now = new Date()
  if (localDateStr(now) === PROMO.dateStr) return 'live'
  const tomorrow = new Date(now.getTime() + 86400000)
  if (localDateStr(tomorrow) === PROMO.dateStr) return 'preview'
  return 'off'
}

export const PROMO_PHASE = computePromoPhase()
export const PROMO_ACTIVE = PROMO_PHASE === 'live'

export const SIZES = [
  { key: 'simple', label: 'Simple' },
  { key: 'doble',  label: 'Doble' },
  { key: 'triple', label: 'Triple' },
]

const SIZE_LABEL = Object.fromEntries(SIZES.map(s => [s.key, s.label]))

export const formatPrice = (n) => '$' + Math.round(n).toLocaleString('es-AR')

function calcPromoDiscount(items) {
  if (!PROMO_ACTIVE) return 0
  const simples = []
  const others = []
  for (const it of items) {
    for (let i = 0; i < it.qty; i++) {
      ;(it.size === 'simple' ? simples : others).push(it.price)
    }
  }
  let discount = 0
  // Cada par de simples sale $15.000 (no se acumula con el 20%)
  simples.sort((a, b) => b - a)
  const pairs = Math.floor(simples.length / 2)
  for (let p = 0; p < pairs; p++) {
    discount += Math.max(0, simples[p * 2] + simples[p * 2 + 1] - PROMO.bundlePrice)
  }
  // La simple suelta puede entrar como "2do combo" al 20%
  if (simples.length % 2) others.push(simples[simples.length - 1])
  // 20% off en el 2do combo: el más barato de cada par restante
  others.sort((a, b) => b - a)
  for (let i = 1; i < others.length; i += 2) {
    discount += others[i] * PROMO.secondPct
  }
  return discount
}

export function CartProvider({ children }) {
  const [items, setItems]     = useState([])
  const [isOpen, setIsOpen]   = useState(false)
  const [toast, setToast]     = useState(null) // { name, id }

  const addItem = useCallback((burger, size = 'doble', qty = 1) => {
    const n = Math.max(1, Math.floor(qty))
    const lineKey = `${burger.id}-${size}`
    const price = burger.prices[size]
    setItems(prev => {
      const existing = prev.find(i => i.key === lineKey)
      if (existing) return prev.map(i => i.key === lineKey ? { ...i, qty: i.qty + n } : i)
      return [...prev, {
        key: lineKey,
        id: burger.id,
        name: burger.name,
        image: burger.image,
        size,
        sizeLabel: SIZE_LABEL[size],
        price,
        qty: n,
      }]
    })
    const suffix = n > 1 ? ` × ${n}` : ''
    setToast({ name: `${burger.name} ${SIZE_LABEL[size]}${suffix}`, id: Date.now() })
    setTimeout(() => setToast(null), 2200)
  }, [])

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key))

  const updateQty = (key, delta) => {
    setItems(prev =>
      prev
        .map(i => i.key === key ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
  }

  const clear = () => setItems([])

  const totalItems = items.reduce((acc, i) => acc + i.qty, 0)
  const subtotal   = items.reduce((acc, i) => acc + i.price * i.qty, 0)
  const discount   = calcPromoDiscount(items)
  const totalPrice = subtotal - discount

  const sendToWhatsApp = () => {
    if (!items.length) return
    const lines = items
      .map(i => `• ${i.qty}x ${i.name} (${i.sizeLabel}) — ${formatPrice(i.price * i.qty)}`)
      .join('\n')
    const promoLine = discount > 0
      ? `\nSubtotal: ${formatPrice(subtotal)}\nDescuento ${PROMO.title} (${PROMO.short}): -${formatPrice(discount)}`
      : ''
    const msg =
      `Hola! Quiero hacer un pedido:\n\n${lines}\n${promoLine}\n` +
      `Total: ${formatPrice(totalPrice)} (precio transferencia)\n\n` +
      `¿Hacen entrega o retiro en local?`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty,
      totalItems, subtotal, discount, totalPrice,
      isOpen, setIsOpen, clear, sendToWhatsApp, toast,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
