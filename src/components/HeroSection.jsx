import { motion } from 'framer-motion'
import imgCurry from '../assets/burgers/curry_white_desglose.jpg'
import imgChesseJoa from '../assets/burgers/chesse_joa.jpg'

const ease = [0.16, 1, 0.3, 1]

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden flex items-center">

      {/* Desktop: product image — right 55% */}
      <motion.div
        className="hidden md:block absolute right-0 top-0 w-[55%] h-full"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.4, ease, delay: 0.4 }}
      >
        <img
          src={imgCurry}
          alt="Curry White — Smash Burger Premium"
          className="w-full h-full object-cover object-center"
          style={{ backgroundColor: '#000' }}
          loading="eager"
        />
        {/* Fade left edge so image bleeds into the black left side */}
        <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-black via-black/80 to-transparent" />
        {/* Soft vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </motion.div>

      {/* Mobile: image top */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-80 bg-black overflow-hidden">
        <img
          src={imgChesseJoa}
          alt="La Joa White — Smash Burger Premium"
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 30%' }}
          loading="eager"
        />
        {/* Vignette top for navbar contrast */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />
        {/* Bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full md:w-[48%] px-6 md:px-12 lg:px-24 pt-80 md:pt-0 pb-14 md:pb-0 text-center md:text-left">

        {/* Label */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full"
          style={{
            backgroundColor: 'rgba(240, 200, 50, 0.08)',
            border: '1px solid rgba(240, 200, 50, 0.25)',
            backdropFilter: 'blur(8px)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.2 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0C832]" />
          <p
            className="text-[#F0C832] text-[11px] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Smash Burger · Premium
          </p>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden leading-none">
          <motion.h1
            className="text-[3.5rem] md:text-[6rem] lg:text-[7.5rem] leading-[0.95] text-white uppercase"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease, delay: 0.3 }}
          >
            MR.
          </motion.h1>
          <motion.h1
            className="text-[3.5rem] md:text-[6rem] lg:text-[7.5rem] leading-[0.95] text-[#F0C832] uppercase"
            style={{
              fontFamily: 'Anton, sans-serif',
              letterSpacing: '-0.02em',
              textShadow: '0 0 60px rgba(240, 200, 50, 0.25)',
            }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease, delay: 0.45 }}
          >
            WHITE
          </motion.h1>
          <motion.h1
            className="text-[3.5rem] md:text-[6rem] lg:text-[7.5rem] leading-[0.95] text-white uppercase"
            style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease, delay: 0.6 }}
          >
            BURGERS
          </motion.h1>
        </div>

        {/* Divider */}
        <motion.div
          className="w-20 h-[2px] bg-gradient-to-r from-[#F0C832] to-transparent my-6 md:my-8 mx-auto md:mx-0 rounded-full"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          style={{ originX: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.85 }}
        />

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center md:items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 1.1 }}
        >
          {/* PRIMARY pill */}
          <motion.a
            href="#menu"
            className="group relative w-full sm:w-auto px-8 py-4 md:px-9 md:py-5 rounded-full text-base tracking-widest uppercase text-black flex items-center justify-center gap-3"
            style={{
              fontFamily: 'Anton, sans-serif',
              backgroundColor: '#F0C832',
              boxShadow: '0 14px 40px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
            }}
            whileHover={{
              y: -3,
              boxShadow: '0 20px 50px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.25, ease }}
          >
            Ver el menú
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="group-hover:translate-x-1 transition-transform duration-300"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </motion.svg>
          </motion.a>

          {/* SECONDARY pill — glass */}
          <motion.a
            href="https://wa.me/5492213034143"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 md:px-9 md:py-5 rounded-full text-sm tracking-widest uppercase text-white/90 hover:text-white text-center"
            style={{
              fontFamily: 'Anton, sans-serif',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
            }}
            whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.25, ease }}
          >
            Pedí ahora
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
