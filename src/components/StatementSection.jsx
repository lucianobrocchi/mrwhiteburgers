import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import imgDesglose from '../assets/burgers/chesse_joa_desglose.jpg'

const ease = [0.16, 1, 0.3, 1]

export default function StatementSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

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
      </div>
    </section>
  )
}
