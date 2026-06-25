import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

export default function BackToTop() {
  const [show, setShow] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.on('change', (v) => setShow(v > 700))
  }, [scrollY])

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="back-to-top"
          onClick={toTop}
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(13,13,13,0.72)',
            border: '1px solid rgba(240,200,50,0.3)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            color: '#F0C832',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.05)',
          }}
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          whileHover={{ y: -3, backgroundColor: 'rgba(240,200,50,0.12)' }}
          whileTap={{ scale: 0.92 }}
          aria-label="Volver arriba"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
