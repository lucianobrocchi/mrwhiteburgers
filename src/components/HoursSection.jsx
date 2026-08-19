import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock, MapPin, Bike } from 'lucide-react'
import { ADDRESS, scheduleSummary, getStatus } from '../lib/schedule'
import { ZONES, formatZonePrice } from '../lib/zones'

const ease = [0.16, 1, 0.3, 1]

export default function HoursSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const status = getStatus()
  const horarios = scheduleSummary()

  return (
    <section
      id="horarios"
      ref={ref}
      className="relative px-5 md:px-12 lg:px-24 py-14 md:py-20"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease }}
        className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5"
      >
        {/* Horarios */}
        <div
          className="rounded-2xl px-5 py-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-[#F0C832]" />
            <span
              className="text-white text-xs tracking-[0.18em] uppercase"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Horarios
            </span>
            <span
              className="ml-auto text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                backgroundColor: status.open ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                color: status.open ? '#4ADE80' : '#F87171',
              }}
            >
              {status.open ? 'Abierto ahora' : 'Cerrado'}
            </span>
          </div>
          {horarios.map((h) => (
            <div key={h.label} className="flex items-baseline justify-between py-1">
              <span
                className="text-white/60 text-sm capitalize"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {h.label}
              </span>
              <span
                className={h.closed ? 'text-white/30 text-sm' : 'text-white/85 text-sm'}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {h.hours}
              </span>
            </div>
          ))}
          {!status.open && status.opensAt && (
            <p
              className="text-[#F87171] text-xs mt-3 pt-3"
              style={{ fontFamily: 'DM Sans, sans-serif', borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              Abrimos {status.opensLabel} a las {status.opensAt}. Podés dejar tu pedido igual.
            </p>
          )}
        </div>

        {/* Dónde estamos + envíos */}
        <div
          className="rounded-2xl px-5 py-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-[#F0C832]" />
            <span
              className="text-white text-xs tracking-[0.18em] uppercase"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Dónde estamos
            </span>
          </div>
          <p
            className="text-white text-2xl uppercase leading-none"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            {ADDRESS.label}
          </p>
          <p
            className="text-white/50 text-sm mt-1.5"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {ADDRESS.barrio} · {ADDRESS.city}
          </p>

          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <Bike size={14} className="text-[#F0C832]" />
              <span
                className="text-white/70 text-xs tracking-[0.14em] uppercase"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Envíos
              </span>
            </div>
            {ZONES.map((z) => (
              <div key={z.id} className="flex items-baseline justify-between py-0.5">
                <span
                  className="text-white/55 text-sm flex items-center gap-2"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                  {z.bounds}
                </span>
                <span
                  className="text-white/85 text-sm"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {formatZonePrice(z)}
                </span>
              </div>
            ))}
            <p
              className="text-white/35 text-[11px] mt-2.5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Elegís tu zona al hacer el pedido, en el carrito.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
