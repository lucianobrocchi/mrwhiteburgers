import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { faqList } from '../lib/faq'

const ease = [0.16, 1, 0.3, 1]

// Preguntas frecuentes: ayudan a quien busca en Google o le pregunta a un asistente con IA
// (los mismos textos van como datos estructurados, ver scripts/seo.mjs).
export default function FaqSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const preguntas = faqList()

  return (
    <section
      id="preguntas"
      ref={ref}
      className="px-5 md:px-12 lg:px-24 py-14 md:py-20"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease }}
        className="max-w-3xl mx-auto"
      >
        <h2 className="text-4xl md:text-5xl text-white uppercase leading-none mb-8" style={{ fontFamily: 'Anton, sans-serif' }}>
          Preguntas frecuentes
        </h2>
        <div className="flex flex-col gap-3">
          {preguntas.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl px-5 py-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <summary
                className="flex items-center justify-between gap-4 cursor-pointer list-none text-white text-[15px] min-h-[28px] [&::-webkit-details-marker]:hidden"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
              >
                <h3 className="text-[15px] font-semibold">{f.q}</h3>
                <ChevronDown size={18} className="shrink-0 text-[#F0C832] transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-white/65 text-sm leading-relaxed mt-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
