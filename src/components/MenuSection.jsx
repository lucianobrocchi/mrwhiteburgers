import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Plus, Minus, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { fadeUp } from '../styles/tokens'
import { useCart, formatPrice, SIZES } from '../context/CartContext'

import imgObrera    from '../assets/burgers/obrera.png'
import imgOklahoma  from '../assets/burgers/oklahoma.png'
import imgBigWhite  from '../assets/burgers/big_white.png'
import imgChesseJoa from '../assets/burgers/chesse_joa.jpg'
import imgCurry     from '../assets/burgers/curry_white.jpg'

const ease = [0.16, 1, 0.3, 1]

const burgers = [
  {
    id: 1,
    name: 'OBRERA',
    description: 'Pan de papa, medallón de carne, queso Tybo, cebolla, lechuga, tomate y salsa Big White.',
    tag: 'La Clásica',
    image: imgObrera,
    prices: { simple: 12500, doble: 14000, triple: 15000 },
  },
  {
    id: 2,
    name: 'OKLAHOMA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, cebolla smash, bacon y salsa Big White.',
    tag: 'La Más Pedida',
    image: imgOklahoma,
    prices: { simple: 13000, doble: 14500, triple: 15500 },
  },
  {
    id: 3,
    name: 'BIG WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, pepinillos y salsa Big White.',
    tag: 'La Contundente',
    image: imgBigWhite,
    prices: { simple: 13000, doble: 14500, triple: 15500 },
  },
  {
    id: 4,
    name: 'LA CHESSE JOA',
    description: 'Pan de papa, medallón de carne, cheddar, bacon, cebolla crispy y salsa Big White.',
    tag: 'La Bestia',
    image: null,
    prices: { simple: 11500, doble: 13000, triple: 14000 },
  },
  {
    id: 5,
    name: 'CURRI WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, bacon y salsa barbacoa.',
    tag: 'Smash Burger',
    image: imgCurry,
    prices: { simple: 13500, doble: 15000, triple: 16000 },
  },
  {
    id: 6,
    name: 'LA JOA WHITE',
    description: 'Pan de papa, medallón de carne, cheddar, pepinillos, bacon y salsa Big White.',
    tag: 'Edición Joa',
    image: imgChesseJoa,
    prices: { simple: 13000, doble: 14500, triple: 15500 },
  },
]

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

function CartControls({ burger, size }) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const price = burger.prices[size]
  const subtotal = qty * price
  const discount = Math.floor(qty / 2) * (price / 2)
  const total = subtotal - discount

  const handleAdd = () => {
    addItem(burger, size, qty)
    setQty(1)
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
          onClick={handleAdd}
          className="group/btn flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-full text-sm tracking-widest uppercase"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: '#F0C832',
            color: '#000',
            boxShadow: '0 8px 24px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          }}
          whileHover={{
            y: -2,
            boxShadow: '0 14px 32px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)',
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2, ease }}
        >
          <ShoppingBag size={15} strokeWidth={2.5} />
          Agregar
        </motion.button>
      </div>

      {/* Discount preview when qty>=2 */}
      {qty >= 2 && (
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
            ★ 2da con 50% off
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
  const price = burger.prices[size]

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
        className="relative overflow-hidden rounded-t-[28px]"
        style={{ aspectRatio: '4/3', backgroundColor: '#0A0A0A' }}
      >
        {burger.image ? (
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

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span
            className="text-[10px] tracking-[0.18em] uppercase text-white/40"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Precio
          </span>
          <div className="flex items-baseline gap-1.5">
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
        </div>

        <CartControls burger={burger} size={size} />
      </div>
    </motion.div>
  )
}

export default function MenuSection() {
  const headerRef    = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' })

  const isOdd = burgers.length % 2 !== 0

  return (
    <section id="menu" className="relative bg-black py-20 md:py-40 px-6 md:px-12 lg:px-24 overflow-hidden">
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
          Todas las hamburguesas vienen con papas fritas. Sin excepciones. Precios por transferencia — consultanos el precio en efectivo.
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
