import { createContext, useContext, useState, useCallback } from 'react'
import { recordOrder } from '../lib/orders'
import { findZone } from '../lib/zones'
import { getStatus } from '../lib/schedule'
import { getConfig, todayOverride } from '../lib/config'
import { extrasLabel } from '../lib/catalog'

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

// Las promos son sobre las BURGERS y se calculan con su precio base: los extras
// y las bebidas se pagan siempre completos, por encima de la promo.
const esBurger = (it) => (it.kind ?? 'burger') === 'burger'
const precioBase = (it) => it.basePrice ?? it.price

function calcPromoDiscount(items) {
  const promo = ACTIVE_PROMO
  if (!promo) return 0
  const burgers = items.filter(esBurger)
  let discount = 0
  if (promo.kind === 'simplesBundle') {
    // Cada par de simples sale bundlePrice
    const simples = []
    for (const it of burgers) {
      for (let i = 0; i < it.qty; i++) if (it.size === 'simple') simples.push(precioBase(it))
    }
    simples.sort((a, b) => b - a)
    for (let i = 0; i + 1 < simples.length; i += 2) {
      discount += Math.max(0, simples[i] + simples[i + 1] - promo.bundlePrice)
    }
  } else if (promo.kind === 'itemPrice') {
    // Una burger + tamaño puntual baja a specialPrice
    for (const it of burgers) {
      const base = precioBase(it)
      const sp = itemPromoPrice(it.name, it.size, base)
      if (sp != null) discount += (base - sp) * it.qty
    }
  }
  return discount
}

export function CartProvider({ children }) {
  const [items, setItems]     = useState([])
  const [isOpen, setIsOpen]   = useState(false)
  const [toast, setToast]     = useState(null) // { name, id }
  const [zone, setZoneState]  = useState(null) // zona de envío elegida

  // El precio de envío puede venir pisado por el panel (config.zones)
  const setZone = useCallback((id) => {
    const z = findZone(id)
    if (!z) return setZoneState(null)
    const override = getConfig()?.zones?.[z.id]?.price
    setZoneState(typeof override === 'number' ? { ...z, price: override } : z)
  }, [])

  const pushItem = useCallback((nuevo, toastName) => {
    setItems(prev => {
      const existing = prev.find(i => i.key === nuevo.key)
      if (existing) return prev.map(i => i.key === nuevo.key ? { ...i, qty: i.qty + nuevo.qty } : i)
      return [...prev, nuevo]
    })
    const suffix = nuevo.qty > 1 ? ` × ${nuevo.qty}` : ''
    setToast({ name: `${toastName}${suffix}`, id: Date.now() })
    setTimeout(() => setToast(null), 2200)
  }, [])

  // `extras` = [{ id, name, price, qty }] ya resueltos con el precio vigente.
  // Dos líneas con distintos extras NO se juntan: cada combinación es su línea.
  const addItem = useCallback((burger, size = 'doble', qty = 1, extras = []) => {
    const n = Math.max(1, Math.floor(qty))
    const ex = (extras || []).filter(e => e.qty > 0)
    const sig = ex.map(e => `${e.id}x${e.qty}`).sort().join('+')
    const base = burger.prices[size]
    const extrasUnit = ex.reduce((s, e) => s + e.price * e.qty, 0)
    pushItem({
      key: `b${burger.id}-${size}${sig ? `-${sig}` : ''}`,
      kind: 'burger',
      id: burger.id,
      name: burger.name,
      image: burger.image,
      size,
      sizeLabel: SIZE_LABEL[size],
      basePrice: base,
      extras: ex,
      price: base + extrasUnit,   // precio de UNA unidad, extras incluidos
      qty: n,
    }, `${burger.name} ${SIZE_LABEL[size]}${ex.length ? ' + extras' : ''}`)
  }, [pushItem])

  // `size.price` ya viene resuelto con el precio vigente (puede estar pisado por el panel)
  const addDrink = useCallback((drink, size, flavor, qty = 1) => {
    const n = Math.max(1, Math.floor(qty))
    const name = flavor ? flavor.label : drink.name
    pushItem({
      key: `d${drink.id}-${size.id}${flavor ? `-${flavor.id}` : ''}`,
      kind: 'drink',
      id: drink.id,
      name,
      icon: drink.icon,
      tint: flavor?.tint || drink.tint,
      size: size.id,
      sizeLabel: size.label,
      flavor: flavor?.id,
      basePrice: size.price,
      extras: [],
      price: size.price,
      qty: n,
    }, `${name} ${size.label}`)
  }, [pushItem])

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
  const shipping   = zone?.price || 0
  const totalPrice = subtotal - discount + shipping

  const sendToWhatsApp = () => {
    if (!items.length) return
    // Registrar el pedido para las estadísticas del panel (no bloquea)
    recordOrder({ items, total: totalPrice, subtotal, discount, zone, promo: ACTIVE_PROMO?.title })
    // Una línea por ítem. Si lleva extras, van abajo para que se lean bien en la cocina.
    const lines = items
      .map(i => {
        const nombre = i.kind === 'drink' ? `${i.name} ${i.sizeLabel}` : `${i.name} (${i.sizeLabel})`
        const base = `• ${i.qty}x ${nombre} — ${formatPrice(i.price * i.qty)}`
        if (!i.extras?.length) return base
        return `${base}\n   ↳ Extras${i.qty > 1 ? ' (en cada una)' : ''}: ${extrasLabel(i.extras)}`
      })
      .join('\n')
    const promoLine = discount > 0 && ACTIVE_PROMO
      ? `\nSubtotal: ${formatPrice(subtotal)}\nDescuento ${ACTIVE_PROMO.title} (${ACTIVE_PROMO.short}): -${formatPrice(discount)}`
      : ''
    const zoneLine = !zone
      ? ''
      : zone.price == null
        ? `\nEnvío ${zone.name}: a coordinar`
        : zone.price
          ? `\nEnvío ${zone.name}: ${formatPrice(zone.price)}`
          : `\n${zone.name}`
    // Si está cerrado, se avisa que el pedido es para cuando abran.
    const st = getStatus(new Date(), todayOverride(getConfig()))
    const closedLine = st.open
      ? ''
      : `\n\n(Sé que están cerrados — lo dejo pedido para cuando abran${
          st.opensAt ? `, ${st.opensLabel} ${st.opensAt}` : ''
        }.)`
    const tail = zone ? '' : '\n\n¿Hacen entrega o retiro en local?'
    const msg =
      `Hola! Quiero hacer un pedido:\n\n${lines}\n${promoLine}${zoneLine}\n` +
      `Total: ${formatPrice(totalPrice)}${tail}${closedLine}`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <CartContext.Provider value={{
      items, addItem, addDrink, removeItem, updateQty,
      totalItems, subtotal, discount, shipping, totalPrice,
      zone, setZone,
      isOpen, setIsOpen, clear, sendToWhatsApp, toast,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
