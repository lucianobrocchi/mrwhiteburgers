import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll } from 'framer-motion'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import logoChars from '../assets/logo_chars.jpg'

function BrandLogo() {
  return (
    <img
      src={logoChars}
      alt="Mr. White Burgers"
      className="h-10 md:h-12 w-auto object-contain select-none"
      draggable={false}
    />
  )
}

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY }                 = useScroll()
  const { totalItems, setIsOpen }   = useCart()

  useEffect(() => {
    return scrollY.on('change', (v) => setScrolled(v > 40))
  }, [scrollY])

  return (
    <>
      {/* Floating pill nav — appears after scroll, glassmorphic */}
      <motion.nav
        className="fixed top-14 md:top-16 left-1/2 -translate-x-1/2 z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <motion.div
          className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-full transition-all duration-500"
          style={{
            backgroundColor: scrolled ? 'rgba(13, 13, 13, 0.72)' : 'rgba(13, 13, 13, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: scrolled
              ? '0 10px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.04)'
              : '0 8px 32px -12px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.04)',
          }}
        >

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 pl-1.5 pr-2 md:pr-4 group">
            <BrandLogo />
            <span
              className="text-white text-base md:text-xl tracking-wide uppercase"
              style={{ fontFamily: 'Anton, sans-serif' }}
            >
              MR. WHITE
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#menu"
              className="relative px-5 py-2.5 rounded-full text-sm tracking-widest uppercase text-white/80 hover:text-white transition-colors duration-300 hover:bg-white/5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Menú
            </a>

            <motion.a
              href="#menu"
              className="ml-1 px-6 py-2.5 rounded-full text-sm tracking-widest uppercase text-black"
              style={{
                fontFamily: 'Anton, sans-serif',
                backgroundColor: '#F0C832',
                boxShadow: '0 8px 24px -8px rgba(240, 200, 50, 0.55), inset 0 1px 0 0 rgba(255,255,255,0.25)',
              }}
              whileHover={{ y: -2, boxShadow: '0 14px 32px -8px rgba(240, 200, 50, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              Pedí ahora
            </motion.a>

            {/* Cart */}
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative ml-2 w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-[#F0C832] hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Carrito"
            >
              <ShoppingBag size={20} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    key="badge"
                    className="absolute -top-1 -right-1 bg-[#F0C832] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      boxShadow: '0 4px 12px -2px rgba(240, 200, 50, 0.6)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-white"
              whileTap={{ scale: 0.9 }}
              aria-label="Carrito"
            >
              <ShoppingBag size={20} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    key="badge-m"
                    className="absolute -top-0.5 -right-0.5 bg-[#F0C832] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <button
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
          </div>
        </motion.div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-4 bottom-4 right-4 w-72 bg-[#0D0D0D]/95 backdrop-blur-xl z-50 flex flex-col px-8 py-10 gap-8 rounded-3xl"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px -20px rgba(0,0,0,0.8)',
              }}
              initial={{ x: '110%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '110%', opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            >
              <button
                className="self-end w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
              <a
                href="#menu"
                onClick={() => setMobileOpen(false)}
                className="text-white text-2xl tracking-widest uppercase"
                style={{ fontFamily: 'Anton, sans-serif' }}
              >
                Menú
              </a>
              <a
                href="#menu"
                onClick={() => setMobileOpen(false)}
                className="self-start px-7 py-3.5 rounded-full text-black text-sm tracking-widest uppercase"
                style={{
                  fontFamily: 'Anton, sans-serif',
                  backgroundColor: '#F0C832',
                  boxShadow: '0 10px 28px -10px rgba(240, 200, 50, 0.6)',
                }}
              >
                Pedí ahora
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
