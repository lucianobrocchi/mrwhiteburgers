import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, ShoppingBag, Trash2, Clock } from 'lucide-react'
import { useCart, formatPrice, ACTIVE_PROMO } from '../context/CartContext'
import { getStatus } from '../lib/schedule'

const ease = [0.16, 1, 0.3, 1]

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQty, removeItem, totalItems, subtotal, discount, totalPrice, zone, sendToWhatsApp, clear } = useCart()
  const status = getStatus()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer — floating rounded */}
          <motion.div
            className="fixed top-4 right-4 bottom-4 w-full max-w-md z-50 flex flex-col rounded-3xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(13, 13, 13, 0.92)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)',
            }}
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ ease, duration: 0.5 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#F0C832]"
                  style={{
                    backgroundColor: 'rgba(240, 200, 50, 0.1)',
                    border: '1px solid rgba(240, 200, 50, 0.2)',
                  }}
                >
                  <ShoppingBag size={18} />
                </span>
                <span
                  className="text-white text-xl uppercase"
                  style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
                >
                  Tu pedido
                </span>
                {totalItems > 0 && (
                  <span
                    className="bg-[#F0C832] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      boxShadow: '0 4px 12px -2px rgba(240, 200, 50, 0.6)',
                    }}
                  >
                    {totalItems}
                  </span>
                )}
              </div>
              <motion.button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                transition={{ duration: 0.2 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <ShoppingBag size={32} className="text-white/30" />
                  </div>
                  <p
                    className="text-white/55 text-sm leading-relaxed"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Tu carrito está vacío.<br />Agregá una hamburguesa del menú.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map(item => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.3, ease }}
                      className="flex items-center gap-4 p-3 mb-2 rounded-2xl"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {/* Thumb */}
                      <div
                        className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl"
                        style={{ backgroundColor: '#0A0A0A' }}
                      >
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-white text-base uppercase truncate"
                          style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
                        >
                          {item.name}
                        </p>
                        <p
                          className="text-white/45 text-[11px] tracking-wide mt-0.5 uppercase"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {item.sizeLabel} · con papas
                        </p>
                        <p
                          className="text-[#F0C832] text-sm mt-1"
                          style={{ fontFamily: 'Anton, sans-serif' }}
                        >
                          {formatPrice(item.price * item.qty)}
                        </p>
                      </div>

                      {/* Qty controls */}
                      <div
                        className="flex items-center gap-1 p-1 rounded-full"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <motion.button
                          onClick={() => updateQty(item.key, -1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
                          whileTap={{ scale: 0.9 }}
                        >
                          <Minus size={12} />
                        </motion.button>
                        <span
                          className="text-white w-5 text-center text-sm"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {item.qty}
                        </span>
                        <motion.button
                          onClick={() => updateQty(item.key, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#F0C832] hover:bg-[#F0C832]/15"
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus size={12} />
                        </motion.button>
                      </div>

                      {/* Remove */}
                      <motion.button
                        onClick={() => removeItem(item.key)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div
                className="px-6 py-6 flex flex-col gap-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Subtotal + Discount + Total */}
                {discount > 0 && (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-white/45 text-[11px] tracking-[0.15em] uppercase"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        Subtotal
                      </span>
                      <span
                        className="text-white/60 text-base line-through"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div
                      className="flex items-baseline justify-between px-3 py-2 rounded-xl"
                      style={{
                        backgroundColor: 'rgba(240, 200, 50, 0.08)',
                        border: '1px solid rgba(240, 200, 50, 0.2)',
                      }}
                    >
                      <span
                        className="text-[#F0C832] text-[10px] tracking-[0.15em] uppercase"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        ★ {ACTIVE_PROMO?.short || 'Descuento'}
                      </span>
                      <span
                        className="text-[#F0C832] text-base"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        − {formatPrice(discount)}
                      </span>
                    </div>
                  </>
                )}
                {/* Zona de envío elegida */}
                <div className="flex items-baseline justify-between">
                  <a
                    href="#envios"
                    onClick={() => setIsOpen(false)}
                    className="text-white/45 text-[11px] tracking-[0.15em] uppercase hover:text-white/70 transition-colors"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {zone ? zone.name : 'Elegí tu zona de envío →'}
                  </a>
                  <span
                    className="text-white/70 text-base"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {zone ? (zone.price ? '+ ' + formatPrice(zone.price) : 'Sin cargo') : '—'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span
                    className="text-white/55 text-xs tracking-[0.18em] uppercase"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Total transferencia
                  </span>
                  <span
                    className="text-[#F0C832] text-3xl"
                    style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
                  >
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <p
                  className="text-white/40 text-[11px] text-center tracking-wide"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Precios por transferencia · Consultá precio en efectivo
                </p>
                <p
                  className="text-white/45 text-xs text-center tracking-wide"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Retiro en local · Envíos a domicilio
                </p>

                {/* Aviso de cerrado: no bloquea el pedido, solo avisa */}
                {!status.open && (
                  <div
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(248, 113, 113, 0.1)',
                      border: '1px solid rgba(248, 113, 113, 0.28)',
                    }}
                  >
                    <Clock size={15} className="text-[#F87171] mt-0.5 shrink-0" />
                    <p
                      className="text-[#F87171] text-xs leading-relaxed"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      <strong className="font-semibold">Ahora estamos cerrados.</strong>{' '}
                      {status.opensAt
                        ? `Abrimos ${status.opensLabel} a las ${status.opensAt}. `
                        : ''}
                      Podés mandar el pedido igual y queda anotado para cuando abramos.
                    </p>
                  </div>
                )}

                <motion.button
                  onClick={sendToWhatsApp}
                  className="w-full py-4 rounded-full text-sm tracking-widest uppercase flex items-center justify-center gap-3"
                  style={{
                    fontFamily: 'Anton, sans-serif',
                    backgroundColor: '#25D366',
                    color: '#fff',
                    boxShadow: '0 12px 32px -10px rgba(37, 211, 102, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.2)',
                  }}
                  whileHover={{
                    y: -2,
                    boxShadow: '0 16px 38px -10px rgba(37, 211, 102, 0.7), inset 0 1px 0 0 rgba(255,255,255,0.3)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {status.open ? 'Pedir por WhatsApp' : 'Dejar pedido para cuando abran'}
                </motion.button>
                <button
                  onClick={clear}
                  className="text-xs text-white/35 hover:text-white/60 text-center transition-colors py-1"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
