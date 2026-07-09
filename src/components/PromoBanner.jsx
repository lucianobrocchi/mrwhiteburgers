import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Bike, Package } from 'lucide-react'
import { PROMO, PROMO_PHASE, WHATSAPP_NUMBER, WHATSAPP_DISPLAY } from '../context/CartContext'

const ease = [0.16, 1, 0.3, 1]

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function PromoBanner() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  if (PROMO_PHASE === 'off') return null

  const isLive = PROMO_PHASE === 'live'
  const waMsg = encodeURIComponent(
    `Hola! Quiero aprovechar la ${PROMO.title} (${PROMO.short}).`
  )

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
              $15.000
            </span>
            <span
              className="text-sm md:text-base leading-none text-black mt-1.5 tracking-[0.18em] uppercase"
              style={{ fontFamily: 'Anton, sans-serif' }}
            >
              2 simples
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
              {isLive ? 'Solo hoy' : `Mañana · ${PROMO.dateLabel}`}
            </p>
          </div>

          <h2
            className="text-3xl md:text-4xl lg:text-5xl text-white uppercase leading-[0.95]"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
          >
            {PROMO.title}
          </h2>

          <p
            className="text-[#F0C832] text-base md:text-lg mt-3"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}
          >
            {PROMO.bundleLabel}
            {PROMO.secondLabel && (
              <>
                <span className="text-white/40 mx-1">·</span> {PROMO.secondLabel}
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-3">
            <div className="inline-flex items-center gap-1.5 text-white/75 text-xs tracking-wide"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              <Package size={13} className="text-[#F0C832]" /> Take away
            </div>
            <span className="text-white/30 text-xs">·</span>
            <div className="inline-flex items-center gap-1.5 text-white/75 text-xs tracking-wide"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              <Bike size={13} className="text-[#F0C832]" /> Envíos a domicilio
            </div>
          </div>
        </motion.div>

        {/* Right — CTA */}
        <motion.a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-7 py-4 rounded-full text-sm tracking-widest uppercase whitespace-nowrap flex-shrink-0"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: '#25D366',
            color: '#fff',
            boxShadow: '0 14px 40px -10px rgba(37, 211, 102, 0.6), inset 0 1px 0 0 rgba(255,255,255,0.2)',
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          whileHover={{
            y: -3,
            boxShadow: '0 20px 48px -10px rgba(37, 211, 102, 0.8), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.4, ease, delay: 0.35 }}
        >
          <WhatsAppIcon />
          <span className="flex flex-col items-start leading-tight">
            <span>Pedí por WhatsApp</span>
            <span className="text-[10px] tracking-[0.15em] opacity-90 normal-case" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {WHATSAPP_DISPLAY}
            </span>
          </span>
        </motion.a>
      </div>
    </section>
  )
}
