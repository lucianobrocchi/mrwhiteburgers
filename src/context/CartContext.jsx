import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext()

export const WHATSAPP_NUMBER = '5492213034143'
export const WHATSAPP_DISPLAY = '221 303-4143'

// ─── Promos por día ──────────────────────────────────────────────────────
// Cada promo se activa sola el día de su dateStr y se apaga al día siguiente.
// Para agregar/editar una promo, tocá el array PROMOS.
//   kind 'simplesBundle' → 2 simples al precio bundlePrice
//   kind 'itemPrice'     → una burger + tamaño puntual a specialPrice
// Probar sin esperar: ?promoDate=AAAA-MM-DD (simula ese día) · ?promo=off (sin promo).
export const PROMOS = [
  {
    dateStr: '2026-07-09',
    dateLabel: 'HOY',
    kind: 'simplesBundle',
    title: 'Promo de Hoy',
    bundlePrice: 15000,
    headline: '2 simples x $15.000',
    ticker: '2 SIMPLES X $15.000',
    short: '2 simples x $15.000',
    bigPrice: '$15.000',
    bigSub: '2 simples',
  },
  {
    dateStr: '2026-07-10',
    dateLabel: 'SÁBADO',
    kind: 'itemPrice',
    title: 'Promo del Sábado',
    itemName: 'CURRI WHITE',
    itemSize: 'triple',
    specialPrice: 15000,
    headline: 'Curry White TRIPLE a $15.000',
    ticker: 'CURRY WHITE TRIPLE X $15.000',
    short: 'Curry White triple a $15.000',
    bigPrice: '$15.000',
    bigSub: 'Curry triple',
  },
]

function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function resolvePromos() {
  let todayStr
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('promo') === 'off') return { active: null, preview: null }
    todayStr = params.get('promoDate') || localDateStr(new Date())
  } catch {
    todayStr = localDateStr(new Date())
  }
  const tomorrowStr = localDateStr(new Date(new Date(`${todayStr}T12:00:00`).getTime() + 86400000))
  return {
    active: PROMOS.find((p) => p.dateStr === todayStr) || null,
    preview: PROMOS.find((p) => p.dateStr === tomorrowStr) || null,
  }
}

const _promos = resolvePromos()
export const ACTIVE_PROMO = _promos.active
export const PREVIEW_PROMO = _promos.preview
export const PROMO_ACTIVE = !!ACTIVE_PROMO

// Precio especial de un ítem según la promo activa (o null si no aplica)
export function itemPromoPrice(name, size, price) {
  const p = ACTIVE_PROMO
  if (p && p.kind === 'itemPrice' && p.itemName === name && p.itemSize === size && price > p.specialPrice) {
    return p.specialPrice
  }
  return null
}

export const SIZES = [
  { key: 'simple', label: 'Simple' },
  { key: 'doble',  label: 'Doble' },
  { key: 'triple', label: 'Triple' },
]

const SIZE_LABEL = Object.fromEntries(SIZES.map(s => [s.key, s.label]))

export const formatPrice = (n) => '$' + Math.round(n).toLocaleString('es-AR')

function calcPromoDiscount(items) {
  const promo = ACTIVE_PROMO
  if (!promo) return 0
  let discount = 0
  if (promo.kind === 'simplesBundle') {
    // Cada par de simples sale bundlePrice
    const simples = []
    for (const it of items) {
      for (let i = 0; i < it.qty; i++) if (it.size === 'simple') simples.push(it.price)
    }
    simples.sort((a, b) => b - a)
    for (let i = 0; i + 1 < simples.length; i += 2) {
      discount += Math.max(0, simples[i] + simples[i + 1] - promo.bundlePrice)
    }
  } else if (promo.kind === 'itemPrice') {
    // Una burger + tamaño puntual baja a specialPrice
    for (const it of items) {
      const sp = itemPromoPrice(it.name, it.size, it.price)
      if (sp != null) discount += (it.price - sp) * it.qty
    }
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
    const promoLine = discount > 0 && ACTIVE_PROMO
      ? `\nSubtotal: ${formatPrice(subtotal)}\nDescuento ${ACTIVE_PROMO.title} (${ACTIVE_PROMO.short}): -${formatPrice(discount)}`
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
