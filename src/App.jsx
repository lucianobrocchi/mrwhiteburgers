import { lazy, Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { CartProvider, useCart, formatPrice } from './context/CartContext'
import { useConfig } from './lib/config'
import { DRINKS, drinkPrice, sizeOut, flavorOut, drinkImg } from './lib/catalog'
import { iniciarTracking, hito, gaVioMenu, registrar } from './lib/track'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import OrderBanner from './components/OrderBanner'
import PromoBanner from './components/PromoBanner'
import MenuSection from './components/MenuSection'
import DrinksSection from './components/DrinksSection'
import MarqueeStrip from './components/MarqueeStrip'
import HoursSection from './components/HoursSection'
import FaqSection from './components/FaqSection'
import StatementSection from './components/StatementSection'
import Footer from './components/Footer'
import CartFab from './components/CartFab'
import BackToTop from './components/BackToTop'
import DiscountTicker from './components/DiscountTicker'

// El carrito (con el mapa de zonas) es lo más pesado de la página y no se ve hasta que alguien pide:
// va en un archivo aparte que se baja cuando el navegador está libre, o antes si abren el carrito.
const cargarCarrito = () => import('./components/CartDrawer')
const CartDrawer = lazy(cargarCarrito)

// La bebida que se ofrece al agregar una burger: Coca lata (o Sprite lata si no hay Coca)
function bebidaSugerida(cfg) {
  const coca = DRINKS.find((d) => d.id === 'coca')
  const lata = coca?.sizes.find((s) => s.id === 'lata')
  if (!lata || sizeOut(coca, lata, cfg)) return null
  const flavor = coca.flavors.find((f) => !flavorOut(f, cfg))
  if (!flavor) return null
  return { drink: coca, size: lata, flavor, precio: drinkPrice(coca, lata, cfg), img: drinkImg(coca, 'lata', flavor.id) }
}

function AddedToast() {
  const { toast, setIsOpen, items, addDrink } = useCart()
  const cfg = useConfig()
  const sinBebida = !items.some((i) => i.kind === 'drink')
  const oferta = toast?.burger && sinBebida ? bebidaSugerida(cfg) : null
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
          {oferta && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                registrar('sugerencia_bebida_aviso', oferta.flavor.label)
                addDrink(oferta.drink, { ...oferta.size, price: oferta.precio }, oferta.flavor, 1)
              }}
              className="flex items-center gap-1.5 ml-1 pl-1 pr-2.5 py-1 rounded-xl shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}
              aria-label={`Sumar ${oferta.flavor.label} lata por ${formatPrice(oferta.precio)}`}
            >
              {oferta.img && <img src={oferta.img} alt="" width={34} height={34} className="w-[34px] h-[34px] rounded-lg bg-black object-contain" />}
              <span className="flex flex-col leading-tight text-left">
                <span className="text-white text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>+ {oferta.flavor.label}</span>
                <span className="text-white/55 text-[10px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>lata {formatPrice(oferta.precio)}</span>
              </span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Vive aparte de Inner a propósito: lee el carrito, y si Inner lo leyera, cada cambio del carrito
// redibujaría la página entera (portada, menú, bebidas…) y los botones responderían lento.
function CarritoDiferido() {
  const { isOpen } = useCart()
  const [carritoListo, setCarritoListo] = useState(false)
  if (isOpen && !carritoListo) setCarritoListo(true) // se abrió antes de que terminara de bajar: se monta ya
  useEffect(() => {
    const traer = () => { cargarCarrito(); setCarritoListo(true) }
    const arrancar = () => (window.requestIdleCallback ? window.requestIdleCallback(traer, { timeout: 4000 }) : window.setTimeout(traer, 2500))
    if (document.readyState === 'complete') arrancar()
    else window.addEventListener('load', arrancar, { once: true })
    return () => window.removeEventListener('load', arrancar)
  }, [])
  return carritoListo ? <Suspense fallback={null}><CartDrawer /></Suspense> : null
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
    }, { threshold: 0, rootMargin: '0px 0px -40% 0px' }) // cuenta cuando el borde de arriba de la sección llega a la mitad de la pantalla
    Object.keys(vistas).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return (
    <main className="bg-black min-h-screen pt-9">
      <DiscountTicker />
      <Navbar />
      <CarritoDiferido />
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
      <FaqSection />
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
