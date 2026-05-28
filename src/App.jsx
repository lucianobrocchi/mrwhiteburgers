import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { CartProvider, useCart } from './context/CartContext'
import CartDrawer from './components/CartDrawer'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import OrderBanner from './components/OrderBanner'
import PromoBanner from './components/PromoBanner'
import MenuSection from './components/MenuSection'
import MarqueeStrip from './components/MarqueeStrip'
import StatementSection from './components/StatementSection'
import Footer from './components/Footer'

function AddedToast() {
  const { toast, setIsOpen } = useCart()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="fixed bottom-6 left-1/2 z-[60] flex items-center gap-3 bg-[#111] px-5 py-4 cursor-pointer"
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
  return (
    <main className="bg-black min-h-screen">
      <Navbar />
      <CartDrawer />
      <AddedToast />
      <HeroSection />
      <OrderBanner />
      <PromoBanner />
      <MenuSection />
      <MarqueeStrip />
      <StatementSection />
      <Footer />
    </main>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Inner />
    </CartProvider>
  )
}
