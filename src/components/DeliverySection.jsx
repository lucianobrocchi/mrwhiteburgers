import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { MapPin, Bike, Package, Check, Clock } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCart } from '../context/CartContext'
import { ZONES, PICKUP, LOCAL, blocksToMeters, formatZonePrice } from '../lib/zones'
import { ADDRESS, scheduleSummary, getStatus } from '../lib/schedule'

const ease = [0.16, 1, 0.3, 1]

function ZoneMap({ selected, onSelect }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return

    const map = L.map(boxRef.current, {
      center: [LOCAL.lat, LOCAL.lng],
      zoom: 13,
      scrollWheelZoom: false,   // no secuestra el scroll de la página
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    // Las zonas más grandes van abajo para que las chicas queden clickeables arriba
    ;[...ZONES].reverse().forEach((z) => {
      const circle = L.circle([LOCAL.lat, LOCAL.lng], {
        radius: blocksToMeters(z.blocks),
        color: z.color,
        weight: 2,
        fillColor: z.color,
        fillOpacity: 0.12,
        className: 'zona-' + z.id,
      }).addTo(map)
      circle.on('click', () => onSelect(z.id))
      circle.bindTooltip(`${z.name} — ${formatZonePrice(z)}`, { sticky: true })
      layersRef.current[z.id] = circle
    })

    // El local
    L.marker([LOCAL.lat, LOCAL.lng], {
      icon: L.divIcon({
        className: '',
        html:
          '<div style="width:16px;height:16px;border-radius:50%;background:#F0C832;' +
          'border:3px solid #000;box-shadow:0 0 0 3px rgba(240,200,50,.45)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    })
      .addTo(map)
      .bindTooltip(`Mr. White · ${ADDRESS.label}`, { permanent: false })

    map.fitBounds(
      L.latLng(LOCAL.lat, LOCAL.lng).toBounds(blocksToMeters(ZONES[ZONES.length - 1].blocks) * 2.2),
    )

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = {}
    }
  }, [onSelect])

  // Resalta la zona elegida
  useEffect(() => {
    Object.entries(layersRef.current).forEach(([id, layer]) => {
      const on = id === selected
      layer.setStyle({ fillOpacity: on ? 0.38 : 0.12, weight: on ? 4 : 2 })
    })
  }, [selected])

  return (
    <div
      ref={boxRef}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: 340, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#111' }}
    />
  )
}

export default function DeliverySection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { zone, setZone } = useCart()
  const [status] = useState(() => getStatus())
  const horarios = scheduleSummary()

  const opciones = [PICKUP, ...ZONES]

  return (
    <section
      id="envios"
      ref={ref}
      className="relative px-5 md:px-12 lg:px-24 py-16 md:py-24"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-3">
          <Bike size={15} className="text-[#F0C832]" />
          <p
            className="text-[#F0C832] text-[11px] tracking-[0.22em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Envíos y horarios
          </p>
        </div>
        <h2
          className="text-3xl md:text-5xl text-white uppercase leading-[0.95] mb-8"
          style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.01em' }}
        >
          ¿A dónde te la llevamos?
        </h2>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-10">
          {/* Mapa */}
          <div>
            <ZoneMap selected={zone?.id} onSelect={setZone} />
            <p
              className="text-white/40 text-xs mt-2.5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Tocá tu zona en el mapa o elegila de la lista. El costo se suma a tu pedido.
            </p>
          </div>

          {/* Lista de zonas */}
          <div className="flex flex-col gap-2.5">
            {opciones.map((z) => {
              const on = zone?.id === z.id
              const isPickup = z.id === PICKUP.id
              return (
                <button
                  key={z.id}
                  onClick={() => setZone(z.id)}
                  className="text-left rounded-2xl px-4 py-3.5 transition-colors"
                  style={{
                    backgroundColor: on ? 'rgba(240,200,50,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? 'rgba(240,200,50,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isPickup ? (
                        <Package size={16} className="text-white/60 shrink-0" />
                      ) : (
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: z.color }}
                        />
                      )}
                      <span
                        className="text-white text-sm uppercase truncate"
                        style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}
                      >
                        {z.name}
                      </span>
                    </div>
                    <span className="flex items-center gap-2 shrink-0">
                      <span
                        className={on ? 'text-[#F0C832]' : 'text-white/70'}
                        style={{ fontFamily: 'Anton, sans-serif' }}
                      >
                        {formatZonePrice(z)}
                      </span>
                      {on && (
                        <span className="w-5 h-5 rounded-full bg-[#F0C832] flex items-center justify-center">
                          <Check size={12} strokeWidth={3} className="text-black" />
                        </span>
                      )}
                    </span>
                  </div>
                  {(z.hint || z.areas) && (
                    <p
                      className="text-white/45 text-xs mt-1.5 pl-[26px]"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {isPickup ? `${ADDRESS.label}, ${ADDRESS.city}` : z.areas.join(' · ')}
                    </p>
                  )}
                </button>
              )
            })}

            {/* Horarios */}
            <div
              className="rounded-2xl px-4 py-4 mt-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[#F0C832]" />
                <span
                  className="text-white text-xs tracking-[0.18em] uppercase"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  Horarios
                </span>
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    backgroundColor: status.open ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                    color: status.open ? '#4ADE80' : '#F87171',
                  }}
                >
                  {status.open ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              {horarios.map((h) => (
                <div key={h.label} className="flex items-baseline justify-between py-0.5">
                  <span
                    className="text-white/60 text-sm capitalize"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {h.label}
                  </span>
                  <span
                    className={h.closed ? 'text-white/30 text-sm' : 'text-white/85 text-sm'}
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {h.hours}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center gap-2 mt-3 pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <MapPin size={14} className="text-[#F0C832] shrink-0" />
                <span
                  className="text-white/70 text-sm"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {ADDRESS.label} · {ADDRESS.city}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
