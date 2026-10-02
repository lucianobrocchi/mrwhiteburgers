import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { CupSoda, GlassWater, Droplets, Plus, Minus, ShoppingBag, Check } from 'lucide-react'
import { fadeUp } from '../styles/tokens'
import { useCart, formatPrice } from '../context/CartContext'
import { useConfig } from '../lib/config'
import { trackDrinkClick } from '../lib/track'
import { flyToCart, popCartBadge } from '../lib/flyToCart'
import { DRINKS, drinkPrice, sizeOut, flavorOut } from '../lib/catalog'

const ease = [0.16, 1, 0.3, 1]
const ICONS = { soda: CupSoda, water: GlassWater, drops: Droplets }

function DrinkCard({ drink, index }) {
  const cfg = useConfig()
  const { addDrink, totalItems } = useCart()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const iconRef = useRef(null)           // origen del vuelo al carrito

  const Icon = ICONS[drink.icon] || CupSoda
  const flavors = drink.flavors || null
  const sizes = drink.sizes

  // Por defecto: el tamaño del medio (1,5 L) y el primer sabor con stock
  const [sizeId, setSizeId] = useState(sizes[Math.min(1, sizes.length - 1)].id)
  const [flavorId, setFlavorId] = useState(flavors ? flavors[0].id : null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const addedTimer = useRef(null)
  useEffect(() => () => clearTimeout(addedTimer.current), [])

  // Si el tamaño elegido se quedó sin stock (lo marcan desde el panel) pasamos al
  // primero disponible; el sin stock queda deshabilitado, no se puede elegir.
  const elegida = sizes.find((s) => s.id === sizeId) || sizes[0]
  const size = sizeOut(drink, elegida, cfg)
    ? sizes.find((s) => !sizeOut(drink, s, cfg)) || elegida
    : elegida
  // Si el sabor elegido se quedó sin stock (lo marcan desde el panel), mostramos
  // el primero que haya. Se calcula acá, sin estado extra que sincronizar.
  const elegido = flavors ? flavors.find((f) => f.id === flavorId) || flavors[0] : null
  const flavor = elegido && flavorOut(elegido, cfg)
    ? flavors.find((f) => !flavorOut(f, cfg)) || elegido
    : elegido
  const price = drinkPrice(drink, size, cfg)
  const tint = flavor?.tint || drink.tint

  const sinStock = sizeOut(drink, size, cfg) || (flavor && flavorOut(flavor, cfg))
  const todoAgotado = sizes.every((s) => sizeOut(drink, s, cfg))

  const handleAdd = () => {
    if (sinStock) return
    const n = qty
    const wasEmpty = totalItems === 0
    setQty(1)
    setAdded(true)
    clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAdded(false), 1400)
    trackDrinkClick(`${flavor ? flavor.label : drink.name} ${size.label}`)
    flyToCart(iconRef.current, () => {
      addDrink(drink, { ...size, price }, flavor, n)
      if (!wasEmpty) setTimeout(popCartBadge, 0)
    })
  }

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delay: index * 0.1 }}
      className="relative overflow-hidden flex flex-col h-full rounded-[28px]"
      style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Cabecera: burbuja con el ícono y un brillo del color de la bebida */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: 150, background: 'linear-gradient(160deg, #161616, #0B0B0B)' }}
      >
        {/* Un brillo por sabor; el activo se muestra, el resto queda invisible */}
        {(flavors ? flavors.map((f) => f.tint) : [drink.tint]).map((t) => (
          <motion.div
            key={t}
            className="absolute inset-0 pointer-events-none"
            initial={false}
            animate={{ opacity: t === tint ? 1 : 0 }}
            transition={{ duration: 0.5, ease }}
            style={{ background: `radial-gradient(circle at 50% 115%, ${t}55, transparent 62%)` }}
          />
        ))}

        <div
          ref={iconRef}
          className="relative flex items-center justify-center"
          style={{
            width: 76,
            height: 76,
            borderRadius: '9999px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `0 14px 36px -12px ${tint}99, inset 0 1px 0 0 rgba(255,255,255,0.12)`,
            color: tint,
            transition: 'color .45s ease, box-shadow .45s ease',
          }}
        >
          <Icon size={34} strokeWidth={1.8} />
        </div>

        {todoAgotado && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
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
      </div>

      {/* Cuerpo */}
      <div className="relative px-6 pt-5 pb-6 flex flex-col flex-1 gap-4">
        <div>
          <h3
            className="text-[26px] leading-none text-white uppercase"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
          >
            {drink.name}
          </h3>
          {drink.blurb && (
            <p className="text-sm text-white/50 mt-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {drink.blurb}
            </p>
          )}
        </div>

        {/* Sabor */}
        {flavors && (
          <div
            className="grid gap-1 p-1 rounded-full"
            style={{
              gridTemplateColumns: `repeat(${flavors.length}, minmax(0, 1fr))`,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {flavors.map((f) => {
              const active = f.id === flavor?.id
              const out = flavorOut(f, cfg)
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={out}
                  onClick={() => setFlavorId(f.id)}
                  className="relative py-2 rounded-full text-[11px] tracking-[0.1em] uppercase flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {active && (
                    <motion.span
                      layoutId={`flavor-pill-${drink.id}`}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: `${f.tint}33`, border: `1px solid ${f.tint}88` }}
                      transition={{ duration: 0.25, ease }}
                    />
                  )}
                  <span
                    className="relative z-10 w-2 h-2 rounded-full"
                    style={{ backgroundColor: f.tint, opacity: out ? 0.35 : 1 }}
                  />
                  <span
                    className="relative z-10"
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontWeight: active ? 600 : 400,
                      textDecoration: out ? 'line-through' : 'none',
                      opacity: out ? 0.5 : 1,
                    }}
                  >
                    {f.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Tamaño: cada opción muestra su precio. Con un solo tamaño no hay nada que elegir. */}
        {sizes.length === 1 ? (
          <div
            className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-white/60"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Presentación · {size.label}
            </span>
          </div>
        ) : (
          <div
            className="grid gap-1 p-1 rounded-[22px]"
            style={{
              gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))`,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {sizes.map((s) => {
              const active = s.id === size.id
              const out = sizeOut(drink, s, cfg)
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={out}
                  onClick={() => setSizeId(s.id)}
                  className="relative py-2 rounded-[18px] flex flex-col items-center justify-center leading-tight disabled:cursor-not-allowed"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {active && (
                    <motion.span
                      layoutId={`size-pill-drink-${drink.id}`}
                      className="absolute inset-0 rounded-[18px] bg-[#F0C832]"
                      transition={{ duration: 0.25, ease }}
                    />
                  )}
                  <span
                    className="relative z-10 text-[11px] tracking-[0.08em] uppercase"
                    style={{
                      color: active ? '#000' : out ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                      fontWeight: active ? 700 : 500,
                      textDecoration: out ? 'line-through' : 'none',
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="relative z-10 text-[11px] tabular-nums mt-0.5"
                    style={{ color: active ? 'rgba(0,0,0,0.65)' : out ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)' }}
                  >
                    {out ? 'sin stock' : formatPrice(drinkPrice(drink, s, cfg))}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Precio */}
        <div className="flex items-baseline justify-between mt-auto">
          <span
            className="text-[10px] tracking-[0.18em] uppercase text-white/40"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Precio
          </span>
          <motion.span
            key={price}
            className="text-3xl text-[#F0C832]"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease }}
          >
            {formatPrice(price)}
          </motion.span>
        </div>

        {/* Cantidad + agregar */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-0.5 p-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <motion.button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
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
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#F0C832] hover:bg-[#F0C832]/15"
              whileTap={{ scale: 0.9 }}
              aria-label="Sumar"
            >
              <Plus size={14} strokeWidth={3} />
            </motion.button>
          </div>

          <motion.button
            type="button"
            onClick={handleAdd}
            disabled={sinStock}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-full text-sm tracking-widest uppercase disabled:cursor-not-allowed"
            style={{
              fontFamily: 'Anton, sans-serif',
              backgroundColor: sinStock ? 'rgba(255,255,255,0.07)' : added ? '#4ADE80' : '#F0C832',
              color: sinStock ? 'rgba(255,255,255,0.4)' : '#000',
              boxShadow: sinStock
                ? 'none'
                : '0 8px 24px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
              transition: 'background-color .25s ease',
            }}
            whileHover={sinStock ? undefined : { y: -2 }}
            whileTap={sinStock ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.2, ease }}
          >
            {added ? <Check size={16} strokeWidth={3} /> : <ShoppingBag size={15} strokeWidth={2.5} />}
            {sinStock ? 'Sin stock' : added ? 'Listo' : 'Agregar'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function DrinksSection() {
  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })

  return (
    <section id="bebidas" className="relative bg-black pt-6 pb-20 md:pt-10 md:pb-36 px-6 md:px-12 lg:px-24 overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(240,200,50,0.05), transparent 70%)' }}
      />

      <div className="relative w-full">
        <div ref={headerRef} className="mb-8 md:mb-12 max-w-4xl">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full"
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
              Para acompañar
            </p>
          </motion.div>

          <motion.h2
            className="text-5xl md:text-8xl text-white uppercase leading-[0.9]"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: 40 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease, delay: 0.2 }}
          >
            Bebidas
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {DRINKS.map((d, i) => (
            <DrinkCard key={d.id} drink={d} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
