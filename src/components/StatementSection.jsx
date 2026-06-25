import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import imgDesglose from '../assets/burgers/chesse_joa_desglose.jpg'
import { WHATSAPP_NUMBER } from '../context/CartContext'

const ease = [0.16, 1, 0.3, 1]

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default function StatementSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const waMsg = encodeURIComponent('Hola! Quiero hacer un pedido en Mr. White Burgers.')

  return (
    <section className="relative w-full min-h-[75vh] md:h-[80vh] overflow-hidden bg-black flex items-end">
      {/* Background image */}
      <img
        src={imgDesglose}
        alt="Chesse Joa desglose"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
      />

      {/* Multi-layer gradient overlay for cinematic depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div
        ref={ref}
        className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-16 md:pb-24"
      >
        {/* Label */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0C832]" />
          <p
            className="text-white/80 text-[11px] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            La Filosofía
          </p>
        </motion.div>

        <div style={{ overflow: 'hidden' }}>
          <motion.h2
            className="text-5xl md:text-7xl lg:text-[6.5rem] text-white max-w-4xl uppercase leading-[0.95]"
            style={{
              fontFamily: 'Anton, sans-serif',
              letterSpacing: '-0.02em',
              clipPath: inView ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
              transition: 'clip-path 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            }}
          >
            Cada mordida habla por sí sola.
          </motion.h2>
        </div>
        <motion.p
          className="text-base md:text-lg text-white/65 mt-6 max-w-md leading-relaxed"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.55 }}
        >
          Sin secretos. Solo buena carne, buen fuego y actitud.
        </motion.p>

        {/* CTAs — cierre con acción */}
        <motion.div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.75 }}
        >
          {/* Primary — Ver el menú */}
          <motion.a
            href="#menu"
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-sm tracking-widest uppercase text-black"
            style={{
              fontFamily: 'Anton, sans-serif',
              backgroundColor: '#F0C832',
              boxShadow: '0 14px 40px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
            }}
            whileHover={{ y: -3, boxShadow: '0 20px 50px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.25, ease }}
          >
            Ver el menú
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
              className="group-hover:translate-x-1 transition-transform duration-300"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.a>

          {/* Secondary — Pedí por WhatsApp */}
          <motion.a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-sm tracking-widest uppercase text-white"
            style={{
              fontFamily: 'Anton, sans-serif',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
            }}
            whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.25, ease }}
          >
            <WhatsAppIcon />
            Pedí por WhatsApp
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
