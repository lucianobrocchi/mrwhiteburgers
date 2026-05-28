import { motion } from 'framer-motion'
import { Package, Bike, UtensilsCrossed, ArrowRight } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1]

const chips = [
  { Icon: Package,          label: 'Retiro en local',     sub: 'Listo en 15 min' },
  { Icon: Bike,             label: 'Envíos a domicilio',  sub: 'Zona La Plata' },
  { Icon: UtensilsCrossed,  label: 'Con papas',           sub: 'Todas las burger' },
]

export default function OrderBanner() {
  return (
    <section className="relative bg-black py-14 px-6 md:px-12 lg:px-24">
      {/* Decorative top/bottom hairlines with fade */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-8">

        {/* Glass chips */}
        <div className="flex flex-wrap justify-center lg:justify-start gap-3 md:gap-4">
          {chips.map(({ Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease, delay: i * 0.08 }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#F0C832]"
                style={{
                  backgroundColor: 'rgba(240, 200, 50, 0.1)',
                  border: '1px solid rgba(240, 200, 50, 0.18)',
                }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <div className="text-left">
                <p
                  className="text-white text-[11px] tracking-[0.18em] uppercase leading-tight"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {label}
                </p>
                <p
                  className="text-white/50 text-[11px] leading-tight mt-0.5"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA pill */}
        <motion.a
          href="#menu"
          className="group flex items-center gap-2 px-8 py-4 rounded-full text-sm tracking-widest uppercase whitespace-nowrap"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: '#F0C832',
            color: '#000',
            boxShadow: '0 12px 32px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          }}
          whileHover={{
            y: -3,
            boxShadow: '0 18px 40px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)',
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.25, ease }}
        >
          Ver el menú
          <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-300" />
        </motion.a>
      </div>
    </section>
  )
}
