import { motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const menuLinks = ['OBRERA', 'OKLAHOMA WHITE', 'BIG WHITE', 'LA CHESSE JOA', 'CURRI WHITE', 'LA JOA WHITE']

export default function Footer() {
  return (
    <footer className="relative bg-black pt-24 pb-10 px-6 md:px-12 lg:px-24">
      {/* Top hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-10">

          {/* Col 1 — Brand */}
          <div>
            <span
              className="block text-5xl text-white uppercase leading-none"
              style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
            >
              MR. WHITE
            </span>
            <span
              className="block text-5xl text-[#F0C832] uppercase leading-none"
              style={{
                fontFamily: 'Anton, sans-serif',
                letterSpacing: '-0.02em',
                textShadow: '0 0 40px rgba(240, 200, 50, 0.2)',
              }}
            >
              BURGERS
            </span>
            <p
              className="text-sm text-white/55 mt-5 max-w-xs leading-relaxed"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Smash Burger Premium. Retiro en local · Envíos a domicilio.
            </p>
          </div>

          {/* Col 2 — Menú */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full"
              style={{
                backgroundColor: 'rgba(240, 200, 50, 0.08)',
                border: '1px solid rgba(240, 200, 50, 0.22)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-[#F0C832]" />
              <p
                className="text-[#F0C832] text-[10px] tracking-[0.2em] uppercase"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Menú
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {menuLinks.map(item => (
                <li key={item}>
                  <a
                    href="#menu"
                    className="text-sm text-white/55 hover:text-[#F0C832] transition-colors duration-300"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Contacto */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full"
              style={{
                backgroundColor: 'rgba(240, 200, 50, 0.08)',
                border: '1px solid rgba(240, 200, 50, 0.22)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-[#F0C832]" />
              <p
                className="text-[#F0C832] text-[10px] tracking-[0.2em] uppercase"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Contacto
              </p>
            </div>

            <motion.a
              href="https://wa.me/5492213034143"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm tracking-widest uppercase"
              style={{
                fontFamily: 'Anton, sans-serif',
                backgroundColor: '#F0C832',
                color: '#000',
                boxShadow: '0 10px 28px -10px rgba(240, 200, 50, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.3)',
              }}
              whileHover={{ y: -2, boxShadow: '0 16px 36px -10px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.25, ease }}
            >
              <WhatsAppIcon />
              Pedir por WhatsApp
            </motion.a>

            <a
              href="mailto:hola@mrwhiteburgers.com"
              className="block text-sm text-white/55 hover:text-white transition-colors mt-5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              hola@mrwhiteburgers.com
            </a>

            <div className="flex items-center gap-3 mt-6">
              <motion.a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white/65 hover:text-[#F0C832]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
                whileHover={{ y: -3, backgroundColor: 'rgba(240,200,50,0.08)' }}
                transition={{ duration: 0.25, ease }}
                aria-label="Instagram"
              >
                <InstagramIcon />
              </motion.a>
              <motion.a
                href="https://wa.me/5492213034143"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white/65 hover:text-[#F0C832]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
                whileHover={{ y: -3, backgroundColor: 'rgba(240,200,50,0.08)' }}
                transition={{ duration: 0.25, ease }}
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </motion.a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p
            className="text-xs text-white/35 tracking-wide"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            © 2025 Mr. White Burgers. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
