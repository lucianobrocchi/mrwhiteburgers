import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const horarios = [
  { label: 'LUNES A VIERNES', hora: '18:00 – 00:00' },
  { label: 'SÁBADOS Y DOMINGOS', hora: '12:00 – 01:00' },
]

export default function LocalSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="local" className="bg-black">
      <div className="flex flex-col md:flex-row min-h-[600px]">

        {/* Left — image */}
        <div className="w-full md:w-1/2 h-72 md:h-auto overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=90&fit=crop"
            alt="Nuestro local"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Right — info */}
        <motion.div
          ref={ref}
          className="w-full md:w-1/2 bg-[#0D0D0D] p-10 md:p-16 flex flex-col justify-center"
          initial={{ opacity: 0, x: 50 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <p
            className="text-[#F0C832] text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            UN SOLO LOCAL. TODO EL FOCO.
          </p>

          <h2
            className="text-5xl md:text-6xl text-white uppercase leading-none"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            MR. WHITE
          </h2>

          <p
            className="text-[#888888] text-base mt-6"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Av. Corrientes 1234, Buenos Aires
            <br />
            Ciudad Autónoma de Buenos Aires
          </p>

          <div
            className="mt-6 mb-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          />

          {/* Horarios */}
          <div className="flex flex-col gap-5">
            {horarios.map(({ label, hora }) => (
              <div key={label}>
                <p
                  className="text-[#F0C832] text-xs tracking-wide uppercase"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {label}
                </p>
                <p
                  className="text-white text-2xl uppercase leading-tight mt-0.5"
                  style={{ fontFamily: 'Anton, sans-serif' }}
                >
                  {hora}
                </p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <motion.a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-7 py-3 text-sm tracking-widest uppercase text-center transition-all duration-300 hover:bg-white hover:text-black"
              style={{ fontFamily: 'Anton, sans-serif' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              CÓMO LLEGAR
            </motion.a>
            <motion.a
              href="https://wa.me/5492213034143"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#F0C832] text-black px-7 py-3 text-sm tracking-widest uppercase text-center hover:opacity-90 transition-opacity duration-300"
              style={{ fontFamily: 'Anton, sans-serif' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              PEDÍ AHORA
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
