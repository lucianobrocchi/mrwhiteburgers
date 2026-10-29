/* eslint-disable react-refresh/only-export-components --
   El contexto, el hook useCart y los helpers del carrito viven juntos a propósito. */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { recordOrder } from '../lib/orders'
import { trackPedido, registrar, hito, gaAgrego, gaSaco, gaVioCarrito, gaEligioZona, recordarCarrito } from '../lib/track'
import { findZone } from '../lib/zones'
import { getStatus } from '../lib/schedule'
import { getConfig, todayOverride } from '../lib/config'
import { extrasLabel } from '../lib/catalog'
import { calcPromoDiscount, envioGratis, promoRige, minutosAR } from '../lib/promos'
import { usePromos } from '../lib/usePromos'
import { SIZES } from '../lib/sizes'

const CartContext = createContext()

export const WHATSAPP_NUMBER = '5492213034143'
export const WHATSAPP_DISPLAY = '221 303-4143'

export { SIZES }

const SIZE_LABEL = Object.fromEntries(SIZES.map(s => [s.key, s.label]))

export const formatPrice = (n) => '$' + Math.round(n).toLocaleString('es-AR')

export function CartProvider({ children }) {
  const [items, setItems]     = useState([])
  const [isOpen, setIsOpen]   = useState(false)
  const [toast, setToast]     = useState(null) // { name, id }
  const [zone, setZoneState]  = useState(null) // zona de envío elegida
  const [enviado, setEnviado] = useState(false) // el pedido ya se mandó: el carrito muestra el agradecimiento
  // La promo de hoy sale de la config del panel (se actualiza sola al cargar)
  const { active: promoDeHoy } = usePromos()

  // El precio de envío puede venir pisado por el panel (config.zones)
  const setZone = useCallback((id) => {
    const z = findZone(id)
    if (!z) return setZoneState(null)
    registrar('eligio_zona', z.name)
    hito('eligio_zona')
    gaEligioZona(z.name)
    const override = getConfig()?.zones?.[z.id]?.price
    setZoneState(typeof override === 'number' ? { ...z, price: override } : z)
  }, [])

  const pushItem = useCallback((nuevo, toastName) => {
    registrar(nuevo.kind === 'drink' ? 'agrego_bebida' : 'agrego_burger', `${nuevo.name}${nuevo.kind === 'drink' ? ` ${nuevo.sizeLabel}` : ` ${nuevo.sizeLabel}`}`)
    ;(nuevo.extras || []).forEach(e => registrar('agrego_extra', e.name))
    hito('agrego')
    gaAgrego(nuevo)
    setEnviado(false)
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

  const removeItem = (key) => {
    registrar('saco_producto')
    const quitado = items.find(i => i.key === key)
    if (quitado) gaSaco(quitado)
    setItems(prev => prev.filter(i => i.key !== key))
  }

  const updateQty = (key, delta) => {
    setItems(prev =>
      prev
        .map(i => i.key === key ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
  }

  const clear = () => { setItems([]); setEnviado(false) }

  const totalItems = items.reduce((acc, i) => acc + i.qty, 0)
  const subtotal   = items.reduce((acc, i) => acc + i.price * i.qty, 0)
  // La promo de hoy rige solo si se cumple su modalidad (retiro/envío) y su horario, si los tiene
  const promo = promoDeHoy && promoRige(promoDeHoy, { zoneId: zone?.id, minutes: minutosAR() }) ? promoDeHoy : null
  const discount   = calcPromoDiscount(items, promo)
  // Promo de envío gratis: solo si la zona tiene precio (retiro y "a coordinar" no cambian)
  const envioBonificado = !!zone?.price && envioGratis(promo, subtotal)
  const shipping   = envioBonificado ? 0 : zone?.price || 0
  const totalPrice = subtotal - discount + shipping

  // Al abrir el carrito: recorrido (embudo del panel) y view_cart / begin_checkout de GA4
  useEffect(() => { recordarCarrito(items, totalPrice) })
  useEffect(() => {
    if (!isOpen) return
    registrar('abrio_carrito')
    hito('abrio_carrito')
    gaVioCarrito()
  }, [isOpen])

  const sendToWhatsApp = () => {
    if (!items.length) return
    // Registrar el pedido para las estadísticas del panel (no bloquea)
    recordOrder({ items, total: totalPrice, subtotal, discount, zone, promo: promo?.title })
    trackPedido({ id: `MW-${Date.now().toString(36)}`, items, total: totalPrice, shipping, zona: zone?.name, promo: promo?.title })
    // Una línea por ítem. Si lleva extras, van abajo para que se lean bien en la cocina.
    const lines = items
      .map(i => {
        const nombre = i.kind === 'drink' ? `${i.name} ${i.sizeLabel}` : `${i.name} (${i.sizeLabel})`
        const base = `• ${i.qty}x ${nombre} — ${formatPrice(i.price * i.qty)}`
        if (!i.extras?.length) return base
        return `${base}\n   ↳ Extras${i.qty > 1 ? ' (en cada una)' : ''}: ${extrasLabel(i.extras)}`
      })
      .join('\n')
    const promoLine = discount > 0 && promo
      ? `\nSubtotal: ${formatPrice(subtotal)}\nDescuento ${promo.title} (${promo.short}): -${formatPrice(discount)}`
      : ''
    const zoneLine = !zone
      ? ''
      : zone.price == null
        ? `\nEnvío ${zone.name}: a coordinar`
        : envioBonificado
          ? `\nEnvío ${zone.name}: GRATIS (${promo.short})`
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
    setEnviado(true)
  }

  return (
    <CartContext.Provider value={{
      items, addItem, addDrink, removeItem, updateQty,
      totalItems, subtotal, discount, shipping, envioBonificado, totalPrice,
      zone, setZone,
      isOpen, setIsOpen, clear, sendToWhatsApp, toast, enviado, setEnviado,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
