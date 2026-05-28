import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { useCart, formatPrice } from '../context/CartContext'

const ease = [0.16, 1, 0.3, 1]

export default function CartFab() {
  const { totalItems, totalPrice, isOpen, setIsOpen } = useCart()

  const show = totalItems > 0 && !isOpen

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="cart-fab"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-3 pl-4 pr-5 py-3 rounded-full"
          style={{
            fontFamily: 'Anton, sans-serif',
            backgroundColor: '#F0C832',
            color: '#000',
            boxShadow:
              '0 18px 44px -12px rgba(240, 200, 50, 0.7), 0 8px 20px -8px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.35)',
          }}
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          whileHover={{
            y: -3,
            boxShadow:
              '0 24px 52px -12px rgba(240, 200, 50, 0.85), 0 10px 24px -8px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.45)',
          }}
          whileTap={{ scale: 0.96 }}
          aria-label={`Abrir carrito (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`}
        >
          <span className="relative flex items-center justify-center">
            <ShoppingBag size={20} strokeWidth={2.5} />
            <span
              className="absolute -top-2 -right-2 bg-black text-[#F0C832] text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}
            >
              {totalItems}
            </span>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] tracking-[0.18em] uppercase opacity-75" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Ver pedido
            </span>
            <span className="text-base tracking-wide" style={{ letterSpacing: '-0.01em' }}>
              {formatPrice(totalPrice)}
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
