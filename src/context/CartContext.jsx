import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext()

export const WHATSAPP_NUMBER = '5492213034143'
export const WHATSAPP_DISPLAY = '221 303-4143'

export const PROMO = {
  active: false,
  date: '28 DE MAYO',
  title: 'Día Mundial de la Hamburguesa',
  headline: '50% OFF',
  subline: 'en la 2da hamburguesa',
  short: '50% off en la 2da burger',
}

export const SIZES = [
  { key: 'simple', label: 'Simple' },
  { key: 'doble',  label: 'Doble' },
  { key: 'triple', label: 'Triple' },
]

const SIZE_LABEL = Object.fromEntries(SIZES.map(s => [s.key, s.label]))

export const formatPrice = (n) => '$' + Math.round(n).toLocaleString('es-AR')

function calcPromoDiscount(items) {
  if (!PROMO.active) return 0
  const units = []
  for (const it of items) {
    for (let i = 0; i < it.qty; i++) units.push(it.price)
  }
  units.sort((a, b) => a - b) // cheapest first
  let discount = 0
  // 50% off the cheaper unit of each pair
  for (let i = 0; i + 1 < units.length; i += 2) {
    discount += units[i] / 2
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
