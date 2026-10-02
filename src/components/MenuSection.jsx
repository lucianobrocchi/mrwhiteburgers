import { useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Plus, Minus, UtensilsCrossed, ShoppingBag, ChevronDown } from 'lucide-react'
import { fadeUp } from '../styles/tokens'
import { useCart, formatPrice, SIZES, ACTIVE_PROMO, PROMO_ACTIVE, itemPromoPrice } from '../context/CartContext'
import { trackBurgerClick } from '../lib/track'
import { flyToCart, popCartBadge } from '../lib/flyToCart'
import { useConfig } from '../lib/config'
import { BURGERS } from '../lib/menu'
import {
  EXTRAS, MAX_PER_EXTRA, extraPrice, extraOut, resolveExtras, extrasTotal, extrasLabel,
} from '../lib/catalog'


const ease = [0.16, 1, 0.3, 1]


function SizeSelector({ cardId, size, setSize }) {
  return (
    <div
      className="grid grid-cols-3 gap-1 p-1 rounded-full"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {SIZES.map(s => {
        const active = s.key === size
        return (
          <button
            key={s.key}
            onClick={() => setSize(s.key)}
            className="relative py-2 rounded-full text-[11px] tracking-[0.12em] uppercase transition-colors duration-200"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {active && (
              <motion.span
                layoutId={`size-pill-${cardId}-${s.key}-active`}
                className="absolute inset-0 rounded-full bg-[#F0C832]"
                transition={{ duration: 0.25, ease }}
              />
            )}
            <span className={`relative z-10 ${active ? 'text-black font-semibold' : 'text-white/55'}`}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Extras tipo "armá tu burger": medallón, cheddar, bacon. Desplegable para no
// cargar la card, con el precio actualizándose en vivo.
function ExtrasPicker({ picked, setPicked, cfg }) {
  const [open, setOpen] = useState(false)
  const lista = resolveExtras(picked, cfg)
  const total = extrasTotal(lista)
  const hayAlgo = lista.length > 0

  const cambiar = (id, delta) =>
    setPicked((p) => {
      const n = Math.min(MAX_PER_EXTRA, Math.max(0, (p[id] || 0) + delta))
      const next = { ...p }
      if (n === 0) delete next[id]
      else next[id] = n
      return next
    })

  return (
    <div
      className="rounded-2xl overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hayAlgo ? 'rgba(240,200,50,0.38)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{
            backgroundColor: hayAlgo ? '#F0C832' : 'rgba(240,200,50,0.12)',
            border: `1px solid ${hayAlgo ? '#F0C832' : 'rgba(240,200,50,0.28)'}`,
            color: hayAlgo ? '#000' : '#F0C832',
          }}
        >
          <Plus
            size={16}
            strokeWidth={3}
            style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .25s ease' }}
          />
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="block text-white text-[13px] uppercase leading-tight"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}
          >
            {hayAlgo ? 'Tus extras' : 'Sumá extras'}
          </span>
          <span
            className="block text-[11px] truncate mt-0.5"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: hayAlgo ? '#F0C832' : 'rgba(255,255,255,0.45)',
            }}
          >
            {hayAlgo ? extrasLabel(lista) : EXTRAS.map((e) => e.name.split(' ')[0]).join(' · ')}
          </span>
        </span>
        {hayAlgo ? (
          <span className="text-[#F0C832] text-sm shrink-0" style={{ fontFamily: 'Anton, sans-serif' }}>
            +{formatPrice(total)}
          </span>
        ) : (
          <ChevronDown
            size={16}
            className="text-white/40 shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3.5 pb-2.5">
              {EXTRAS.map((e, i) => {
                const n = picked[e.id] || 0
                const sinStock = extraOut(e, cfg)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex-1 min-w-0" style={{ opacity: sinStock ? 0.45 : 1 }}>
                      <p className="text-white text-[13px] leading-tight" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        {e.name}
                      </p>
                      {e.desc && (
                        <p className="text-white/40 text-[11px] mt-0.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          {e.desc}
                        </p>
                      )}
                    </div>

                    {sinStock ? (
                      <span
                        className="text-[10px] tracking-[0.14em] uppercase text-white/45 px-2.5 py-1 rounded-full"
                        style={{ fontFamily: 'DM Sans, sans-serif', border: '1px solid rgba(255,255,255,0.14)' }}
                      >
                        Sin stock
                      </span>
                    ) : (
                      <>
                        <span className="text-white/70 text-[13px] tabular-nums shrink-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          +{formatPrice(extraPrice(e, cfg))}
                        </span>
                        <div
                          className="flex items-center gap-0.5 p-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <button
                            type="button"
                            onClick={() => cambiar(e.id, -1)}
                            disabled={n === 0}
                            aria-label={`Quitar ${e.name}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <Minus size={13} strokeWidth={3} />
                          </button>
                          <span
                            className="w-5 text-center text-sm tabular-nums"
                            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: n ? '#F0C832' : 'rgba(255,255,255,0.4)' }}
                          >
                            {n}
                          </span>
                          <button
                            type="button"
                            onClick={() => cambiar(e.id, 1)}
                            disabled={n >= MAX_PER_EXTRA}
                            aria-label={`Agregar ${e.name}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[#F0C832] hover:bg-[#F0C832]/15 disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <Plus size={13} strokeWidth={3} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CartControls({ burger, size, onAdded, imgRef, extras, extrasUnit }) {
  const { addItem, totalItems } = useCart()
  const [qty, setQty] = useState(1)
  const price = burger.prices[size]
  // Un burger con extras = precio base + extras. La promo se calcula sobre el
  // base (los extras se pagan completos), por eso el descuento no los toca.
  const subtotal = qty * (price + extrasUnit)
  // Preview del descuento "2 simples x $15.000" (solo aplica a simples)
  const isBundle = ACTIVE_PROMO?.kind === 'simplesBundle' && size === 'simple'
  const pairs = Math.floor(qty / 2)
  const discount = isBundle ? pairs * Math.max(0, price * 2 - ACTIVE_PROMO.bundlePrice) : 0
  const total = subtotal - discount

  const handleAdd = () => {
    const n = qty
    const wasEmpty = totalItems === 0
    const extrasAlAgregar = extras
    setQty(1)
    onAdded?.()
    trackBurgerClick(burger)
    // La foto vuela al carrito y el ítem se suma al aterrizar, así el contador
    // sube justo cuando llega (con reduced-motion se suma al instante).
    flyToCart(imgRef?.current, () => {
      addItem(burger, size, n, extrasAlAgregar)
      // El badge lo pinta React: le damos un tick para que exista y ahí el pop.
      // Si el carrito estaba vacío, el badge ya entra con su propio spring.
      if (!wasEmpty) setTimeout(popCartBadge, 0)
    })
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2">
        {/* Qty stepper */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <motion.button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
            whileTap={{ scale: 0.9 }}
            aria-label="Restar"
          >
            <Minus size={14} strokeWidth={3} />
          </motion.button>
          <span
            className="w-7 text-center text-white text-sm tabular-nums"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          >
            {qty}
          </span>
          <motion.button
            onClick={() => setQty(q => q + 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#F0C832] hover:bg-[#F0C832]/15"
            whileTap={{ scale: 0.9 }}
            aria-label="Sumar"
          >
            <Plus size={14} strokeWidth={3} />
          </motion.button>
        </div>

        {/* Add button */}
        <motion.button
          onClick={burger.soldOut ? undefined : handleAdd}
          disabled={burger.soldOut}
          className="group/btn flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-full text-sm tracking-widest uppercase disabled:cursor-not-allowed"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: burger.soldOut ? 'rgba(255,255,255,0.07)' : '#F0C832',
            color: burger.soldOut ? 'rgba(255,255,255,0.4)' : '#000',
            boxShadow: burger.soldOut
              ? 'none'
              : '0 8px 24px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          }}
          whileHover={burger.soldOut ? undefined : {
            y: -2,
            boxShadow: '0 14px 32px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)',
          }}
          whileTap={burger.soldOut ? undefined : { scale: 0.97 }}
          transition={{ duration: 0.2, ease }}
        >
          <ShoppingBag size={15} strokeWidth={2.5} />
          {burger.soldOut ? 'Sin stock' : 'Agregar'}
        </motion.button>
      </div>

      {/* Discount preview when qty>=2 (solo con promo activa y con descuento real) */}
      {PROMO_ACTIVE && qty >= 2 && discount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{
            backgroundColor: 'rgba(240, 200, 50, 0.08)',
            border: '1px solid rgba(240, 200, 50, 0.22)',
          }}
        >
          <span
            className="text-[10px] tracking-[0.18em] uppercase text-[#F0C832]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            ★ 2 simples x $15.000
          </span>
          <span
            className="text-[#F0C832] text-sm"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            Total: {formatPrice(total)}
          </span>
        </motion.div>
      )}
    </div>
  )
}

function BurgerCard({ burger, index }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [size, setSize] = useState('doble')
  const [showAlt, setShowAlt] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const addedTimer = useRef(null)
  const imgWrapRef = useRef(null)   // origen del vuelo al carrito
  const revealed = showAlt || justAdded
  const cfg = useConfig()
  const [picked, setPicked] = useState({})        // extras elegidos { id: cantidad }
  const extras = resolveExtras(picked, cfg)
  const extrasUnit = extrasTotal(extras)
  const price = burger.prices[size]
  const promoPrice = itemPromoPrice(burger.name, size, price)  // precio especial del tamaño elegido (o null)
  const itemPromo = ACTIVE_PROMO?.kind === 'itemPrice' && ACTIVE_PROMO.itemName === burger.name
    ? ACTIVE_PROMO : null  // esta burger tiene promo puntual hoy

  const handleAdded = () => {
    setPicked({})   // como en un pedido real: el siguiente arranca sin extras
    if (!burger.imageAlt) return
    setJustAdded(true)
    clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setJustAdded(false), 1600)
  }

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden flex flex-col h-full rounded-[28px] transition-shadow duration-500"
      style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Soft inner glow on hover */}
      <div
        className="absolute -inset-px rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(240,200,50,0.12), transparent 60%)',
        }}
      />

      {/* Image */}
      <div
        ref={imgWrapRef}
        className="relative overflow-hidden rounded-t-[28px]"
        style={{ aspectRatio: '4/3', backgroundColor: '#0A0A0A' }}
        onMouseEnter={() => burger.imageAlt && setShowAlt(true)}
        onMouseLeave={() => burger.imageAlt && setShowAlt(false)}
        onClick={() => burger.imageAlt && setShowAlt(v => !v)}
      >
        {burger.soldOut && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(0,0,0,0.62)' }}
          >
            <span
              className="px-4 py-2 rounded-full text-sm tracking-[0.18em] uppercase"
              style={{
                fontFamily: 'Anton, sans-serif',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              Sin stock
            </span>
          </div>
        )}
        {itemPromo && !burger.soldOut && (
          <div
            className="absolute top-3 left-3 z-20 inline-flex items-center px-2.5 py-1 rounded-full pointer-events-none"
            style={{ backgroundColor: '#F0C832', boxShadow: '0 6px 18px -6px rgba(240,200,50,0.6)' }}
          >
            <span
              className="text-[10px] tracking-[0.12em] uppercase text-black"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}
            >
              ★ Hoy {itemPromo.itemSize} {formatPrice(itemPromo.specialPrice)}
            </span>
          </div>
        )}
        {burger.image && burger.imageAlt ? (
          <>
            {/* Foto base (fondo negro) */}
            <img
              src={burger.image}
              alt={burger.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {/* Foto alternativa (con papel) — crossfade */}
            <motion.img
              src={burger.imageAlt}
              alt={`${burger.name} — servida`}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              initial={false}
              animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1.04 : 1 }}
              transition={{ duration: 0.6, ease }}
            />
            {/* Indicador tipo carrusel — 2 fotos */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 pointer-events-none">
              {[false, true].map((alt) => {
                const active = revealed === alt
                return (
                  <motion.span
                    key={String(alt)}
                    className="rounded-full"
                    style={{ height: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.55)' }}
                    animate={{
                      width: active ? 18 : 6,
                      backgroundColor: active ? '#F0C832' : 'rgba(255,255,255,0.55)',
                    }}
                    transition={{ duration: 0.3, ease }}
                  />
                )
              })}
            </div>
          </>
        ) : burger.image ? (
          <motion.img
            src={burger.image}
            alt={burger.name}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.8, ease }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center relative"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(240,200,50,0.18), transparent 60%), linear-gradient(135deg, #1a1a1a, #0A0A0A)',
            }}
          >
            <span
              className="text-7xl text-[#F0C832]/70 leading-none"
              style={{ fontFamily: 'Anton, sans-serif', textShadow: '0 0 40px rgba(240,200,50,0.3)' }}
            >
              {burger.name.charAt(0)}
            </span>
            <span
              className="mt-3 text-[10px] tracking-[0.2em] uppercase text-white/40"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Foto próximamente
            </span>
          </div>
        )}
        {/* Subtle gradient at bottom for text contrast */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Info */}
      <div className="relative px-6 pt-6 pb-7 flex flex-col flex-1 gap-4">
        <div className="flex-1">
          <h3
            className="text-3xl text-white uppercase group-hover:text-[#F0C832] transition-colors duration-300"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
          >
            {burger.name}
          </h3>
          <p
            className="text-sm text-white/55 mt-2 leading-relaxed"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {burger.description}
          </p>
        </div>

        {/* Fries chip */}
        <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <UtensilsCrossed size={11} className="text-[#F0C832]" />
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-white/60"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Con papas incluidas
          </span>
        </div>

        {/* Size selector */}
        <SizeSelector cardId={burger.id} size={size} setSize={setSize} />

        {/* Extras */}
        {!burger.soldOut && <ExtrasPicker picked={picked} setPicked={setPicked} cfg={cfg} />}

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span
            className="text-[10px] tracking-[0.18em] uppercase text-white/40"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Precio
          </span>
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-2">
              {promoPrice != null && (
                <span
                  className="text-lg text-white/35 line-through"
                  style={{ fontFamily: 'Anton, sans-serif' }}
                >
                  {formatPrice(price + extrasUnit)}
                </span>
              )}
              <motion.span
                key={(promoPrice ?? price) + extrasUnit}
                className="text-3xl text-[#F0C832]"
                style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease }}
              >
                {formatPrice((promoPrice ?? price) + extrasUnit)}
              </motion.span>
            </div>
            {extrasUnit > 0 && (
              <span
                className="text-white/45 text-[11px] leading-tight mt-0.5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Burger {formatPrice(promoPrice ?? price)} + extras {formatPrice(extrasUnit)}
              </span>
            )}
          </div>
        </div>

        <CartControls
          burger={burger}
          size={size}
          onAdded={handleAdded}
          imgRef={imgWrapRef}
          extras={extras}
          extrasUnit={extrasUnit}
        />
      </div>
    </motion.div>
  )
}

// Pisa los datos de la burger con lo que haya cargado el panel (precios,
// descripción, agotado). Lo que no esté configurado queda como en el código.
function aplicarConfig(burger, cfg) {
  const c = cfg?.burgers?.[burger.id]
  if (!c) return burger
  return {
    ...burger,
    soldOut: !!c.soldOut,
    prices: c.prices ? { ...burger.prices, ...c.prices } : burger.prices,
    description: c.description || burger.description,
  }
}

export default function MenuSection() {
  const headerRef    = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })
  const cfg = useConfig()
  // El menú vive en el código; el panel solo pisa precios, textos y "sin stock"
  const burgers = BURGERS.map((b) => aplicarConfig(b, cfg))

  const isOdd = burgers.length % 2 !== 0

  return (
    <section id="menu" className="relative bg-black pt-20 pb-10 md:pt-40 md:pb-16 px-6 md:px-12 lg:px-24 overflow-hidden">
      {/* Decorative ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(240,200,50,0.06), transparent 70%)',
        }}
      />

      <div className="relative w-full">

        {/* Header */}
        <div ref={headerRef} className="mb-6 max-w-4xl">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full"
            style={{
              backgroundColor: 'rgba(240, 200, 50, 0.08)',
              border: '1px solid rgba(240, 200, 50, 0.22)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0C832]" />
            <p
              className="text-[#F0C832] text-[11px] tracking-[0.2em] uppercase"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Nuestras hamburguesas
            </p>
          </motion.div>

          <motion.h2
            className="text-6xl md:text-9xl text-white uppercase leading-[0.9]"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: 50 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease, delay: 0.2 }}
          >
            El Menú
          </motion.h2>
        </div>

        {/* Sub note */}
        <motion.p
          className="text-white/50 text-sm md:text-lg mb-10 md:mb-16 max-w-xl"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
          initial={{ opacity: 0 }}
          animate={headerInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Todas las hamburguesas vienen con papas fritas.
        </motion.p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {burgers.map((burger, index) => {
            const isLast = index === burgers.length - 1
            const isOrphan = isLast && isOdd
            return (
              <div
                key={burger.id}
                className={isOrphan ? 'sm:col-span-2 sm:flex sm:justify-center' : 'flex'}
              >
                <div className={isOrphan ? 'w-full sm:w-1/2 sm:px-3' : 'w-full'}>
                  <BurgerCard burger={burger} index={index} />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
