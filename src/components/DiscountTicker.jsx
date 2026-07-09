import { PROMO_PHASE } from '../context/CartContext'

const MESSAGES = {
  off:     '★  SMASH BURGERS PREMIUM  ·  PAN DE PAPA ARTESANAL  ·  CARNE FRESCA TODOS LOS DÍAS',
  preview: '★  MAÑANA  ·  2 SIMPLES X $15.000  ·  PEDÍ POR WHATSAPP',
  live:    '★  SOLO HOY  ·  2 SIMPLES X $15.000  ·  PEDÍ POR WHATSAPP',
}

export default function DiscountTicker() {
  const message = MESSAGES[PROMO_PHASE] || MESSAGES.off

  return (
    <div
      className="fixed top-0 inset-x-0 z-40 flex items-center overflow-hidden"
      style={{
        height: '36px',
        backgroundColor: '#5E1A18',
        borderBottom: '1px solid rgba(240, 200, 50, 0.35)',
      }}
      aria-label="Promo del día"
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none discount-ticker-shimmer"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(240,200,50,0.15) 50%, transparent 100%)',
          backgroundSize: '50% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Marquee track */}
      <div className="relative flex w-full overflow-hidden">
        <div className="flex shrink-0 items-center discount-ticker-track">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="text-[#F0C832] text-[11px] md:text-xs uppercase whitespace-nowrap px-8"
              style={{
                fontFamily: 'Anton, sans-serif',
                letterSpacing: '0.18em',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {message}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center discount-ticker-track" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={`b-${i}`}
              className="text-[#F0C832] text-[11px] md:text-xs uppercase whitespace-nowrap px-8"
              style={{
                fontFamily: 'Anton, sans-serif',
                letterSpacing: '0.18em',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {message}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes discount-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .discount-ticker-track {
          animation: discount-ticker-scroll 40s linear infinite;
        }
        @keyframes discount-ticker-shimmer-anim {
          0%   { background-position: -50% 0; }
          100% { background-position: 150% 0; }
        }
        .discount-ticker-shimmer {
          animation: discount-ticker-shimmer-anim 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
