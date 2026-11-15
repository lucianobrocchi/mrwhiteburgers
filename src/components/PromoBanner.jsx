import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Bike, Package, ArrowRight } from 'lucide-react'
import { BURGERS_BASE } from '../lib/menuBase'
import { usePromos } from '../lib/usePromos'

const ease = [0.16, 1, 0.3, 1]

// La promo llega con la config del panel (después del primer render), así que el
// banner se monta recién cuando hay promo: useInView tiene que nacer junto con la
// <section>, por eso vive en este componente y no en el de afuera.
function Banner({ promo, isLive }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Si la promo es de una burger puntual, el botón baja directo a esa burger
  const burger = promo.itemName && BURGERS_BASE.find((b) => b.name === promo.itemName)
  const destino = burger ? `#burger-${burger.id}` : '#menu'

  return (
    <section
      ref={ref}
      className="relative px-5 md:px-12 lg:px-24 py-8 md:py-12 overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #4A1311 0%, #6B1F1A 45%, #4A1311 100%)',
      }}
    >
      {/* Decorative bg accents */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(240,200,50,0.4), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full pointer-events-none opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(240,200,50,0.3), transparent 70%)' }}
      />
      {/* Top/bottom hairlines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F0C832]/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F0C832]/40 to-transparent" />

      <div className="relative w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

        {/* Left — big price mark */}
        <motion.div
          className="flex items-center gap-5 flex-shrink-0"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
        >
          <div
            className="relative flex flex-col items-center px-6 py-3 rounded-2xl"
            style={{
              backgroundColor: '#F0C832',
              boxShadow: '0 14px 40px -10px rgba(240, 200, 50, 0.4), inset 0 1px 0 0 rgba(255,255,255,0.4)',
            }}
          >
            <Sparkles size={20} className="absolute -top-2 -right-2 text-white" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
            <span
              className="text-5xl md:text-6xl leading-none text-black"
              style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.03em' }}
            >
              {promo.bigPrice}
            </span>
            <span
              className="text-sm md:text-base leading-none text-black mt-1.5 tracking-[0.18em] uppercase"
              style={{ fontFamily: 'Anton, sans-serif' }}
            >
              {promo.bigSub}
            </span>
          </div>
        </motion.div>

        {/* Center — copy */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.2 }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full"
            style={{
              backgroundColor: 'rgba(240, 200, 50, 0.15)',
              border: '1px solid rgba(240, 200, 50, 0.35)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0C832] animate-pulse" />
            <p
              className="text-[#F0C832] text-[10px] tracking-[0.22em] uppercase"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {isLive ? 'Solo hoy' : `Mañana · ${promo.dateLabel}`}
            </p>
          </div>

          <h2
            className="text-3xl md:text-4xl lg:text-5xl text-white uppercase leading-[0.95]"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
          >
            {promo.title}
          </h2>

          <p
            className="text-[#F0C832] text-base md:text-lg mt-3"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}
          >
            {promo.headline}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-3">
            <div className="inline-flex items-center gap-1.5 text-white/75 text-xs tracking-wide"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              <Package size={13} className="text-[#F0C832]" /> Take away
            </div>
            <span className="text-white/55 text-xs">·</span>
            <div className="inline-flex items-center gap-1.5 text-white/75 text-xs tracking-wide"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              <Bike size={13} className="text-[#F0C832]" /> Envíos a domicilio
            </div>
          </div>
        </motion.div>

        {/* Right — CTA: al menú. El descuento se aplica solo en el carrito, así el pedido llega completo. */}
        <motion.a
          href={destino}
          className="group btn-brillo flex items-center gap-3 px-7 py-4 rounded-full text-sm tracking-widest uppercase whitespace-nowrap flex-shrink-0 text-black"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: '#F0C832',
            boxShadow: '0 14px 40px -10px rgba(240, 200, 50, 0.6), inset 0 1px 0 0 rgba(255,255,255,0.35)',
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.4, ease, delay: 0.35 }}
        >
          <span className="flex flex-col items-start leading-tight">
            <span>{isLive ? 'Pedir esta promo' : 'Ver el menú'}</span>
            <span className="text-[10px] tracking-[0.08em] opacity-80 normal-case" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {isLive ? 'El descuento se aplica solo' : `Vale mañana · ${promo.dateLabel}`}
            </span>
          </span>
          <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-300" />
        </motion.a>
      </div>
    </section>
  )
}

export default function PromoBanner() {
  const { active, preview } = usePromos()
  const promo = active || preview
  if (!promo) return null
  return <Banner promo={promo} isLive={!!active} />
}
