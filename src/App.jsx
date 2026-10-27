import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { CartProvider, useCart } from './context/CartContext'
import { iniciarTracking, hito, gaVioMenu } from './lib/track'
import CartDrawer from './components/CartDrawer'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import OrderBanner from './components/OrderBanner'
import PromoBanner from './components/PromoBanner'
import MenuSection from './components/MenuSection'
import DrinksSection from './components/DrinksSection'
import MarqueeStrip from './components/MarqueeStrip'
import HoursSection from './components/HoursSection'
import StatementSection from './components/StatementSection'
import Footer from './components/Footer'
import CartFab from './components/CartFab'
import BackToTop from './components/BackToTop'
import DiscountTicker from './components/DiscountTicker'

function AddedToast() {
  const { toast, setIsOpen } = useCart()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="fixed bottom-[88px] md:bottom-6 left-1/2 z-[60] flex items-center gap-3 w-max max-w-[calc(100vw-2rem)] bg-[#111] px-4 md:px-5 py-3.5 md:py-4 cursor-pointer"
          style={{ border: '1px solid rgba(240,200,50,0.35)', translateX: '-50%' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setIsOpen(true)}
        >
          <span className="w-6 h-6 bg-[#F0C832] rounded-full flex items-center justify-center flex-shrink-0">
            <Check size={13} strokeWidth={3} className="text-black" />
          </span>
          <div>
            <p className="text-white text-sm uppercase" style={{ fontFamily: 'Anton, sans-serif' }}>
              {toast.name} agregada
            </p>
            <p className="text-[#F0C832] text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Tocá para ver el carrito →
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Inner() {
  useEffect(() => {
    iniciarTracking()
    // Qué partes de la página llegan a verse (una vez por visita)
    const vistas = { menu: 'vio_menu', bebidas: 'vio_bebidas', horarios: 'vio_horarios' }
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        hito(vistas[e.target.id])
        if (e.target.id === 'menu') gaVioMenu()
        io.unobserve(e.target)
      })
    }, { threshold: 0.2 })
    Object.keys(vistas).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return (
    <main className="bg-black min-h-screen pt-9">
      <DiscountTicker />
      <Navbar />
      <CartDrawer />
      <CartFab />
      <BackToTop />
      <AddedToast />
      <HeroSection />
      <OrderBanner />
      <PromoBanner />
      <MenuSection />
      <DrinksSection />
      <MarqueeStrip />
      <StatementSection />
      <HoursSection />
      <Footer />
    </main>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Inner />
      <Analytics />
    </CartProvider>
  )
}
