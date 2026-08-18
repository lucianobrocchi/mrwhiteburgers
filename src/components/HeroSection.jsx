import { motion } from 'framer-motion'
import imgHero from '../assets/burgers/curri_white_hero.jpg'
import logoFull from '../assets/logo_full.jpg'
import { getStatus } from '../lib/schedule'

const ease = [0.16, 1, 0.3, 1]

// Chip de abierto/cerrado. Si está cerrado, dice cuándo abre y lleva a los horarios.
function StatusChip() {
  const s = getStatus()
  const color = s.open ? '#4ADE80' : '#F87171'
  return (
    <motion.a
      href="#envios"
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
      style={{
        backgroundColor: s.open ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
        border: `1px solid ${s.open ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.32)'}`,
        backdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.28 }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      <p
        className="text-[11px] tracking-[0.14em] uppercase"
        style={{ fontFamily: 'DM Sans, sans-serif', color }}
      >
        {s.open
          ? `Abierto ahora · hasta ${s.closesAt}`
          : s.opensAt
            ? `Cerrado · abre ${s.opensLabel} ${s.opensAt}`
            : 'Cerrado'}
      </p>
    </motion.a>
  )
}

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden flex items-center">

      {/* Desktop: product video — right 55% */}
      <motion.div
        className="hidden md:block absolute right-0 top-0 w-[55%] h-full"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.4, ease, delay: 0.4 }}
      >
        <video
          src={`${import.meta.env.BASE_URL}videos/hero.mp4`}
          poster={imgHero}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          style={{ backgroundColor: '#000', objectPosition: '50% 35%' }}
        />
        {/* Fade left edge so video bleeds into the black left side */}
        <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-black via-black/80 to-transparent" />
        {/* Soft vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </motion.div>

      {/* Mobile: video top */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-[500px] bg-black overflow-hidden">
        <video
          src={`${import.meta.env.BASE_URL}videos/hero.mp4`}
          poster={imgHero}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 30%' }}
        />
        {/* Vignette top for navbar contrast */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />
        {/* Bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full md:w-[48%] px-6 md:px-12 lg:px-24 pt-[460px] md:pt-0 pb-14 md:pb-0 text-center md:text-left">

        {/* Label */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 md:mb-8 rounded-full"
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

        {/* Estado del local */}
        <div className="mb-4 md:mb-8 -mt-2 md:-mt-6">
          <StatusChip />
        </div>

        {/* Logo */}
        <motion.img
          src={logoFull}
          alt="Mr. White Burgers"
          className="w-full max-w-[340px] md:max-w-[440px] h-auto mx-auto md:mx-0 select-none"
          draggable={false}
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease, delay: 0.3 }}
        />

        {/* Divider */}
        <motion.div
          className="w-20 h-[2px] bg-gradient-to-r from-[#F0C832] to-transparent my-4 md:my-8 mx-auto md:mx-0 rounded-full"
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

        </motion.div>
      </div>
    </section>
  )
}
