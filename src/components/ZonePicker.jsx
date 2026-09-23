import { useRef, useEffect, useState } from 'react'
import { Check, Package, Map as MapIcon, ChevronDown } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCart } from '../context/CartContext'
import { ZONES, PICKUP, OTHER, LOCAL, formatZonePrice, zonePrice } from '../lib/zones'
import { useConfig, todayOverride } from '../lib/config'

// Mapa chico con las zonas dibujadas con su forma real. Se monta solo cuando
// se abre (dentro del carrito), por eso el invalidateSize: si Leaflet arranca
// con el contenedor en 0px, dibuja los tiles cortados.
function ZoneMap({ selected, onSelect }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return

    const map = L.map(boxRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    const all = []
    ZONES.forEach((z) => {
      const poly = L.polygon(z.polygon, {
        color: z.color,
        weight: 2,
        fillColor: z.color,
        fillOpacity: 0.15,
      }).addTo(map)
      poly.on('click', () => onSelect(z.id))
      poly.bindTooltip(`${z.name} — ${formatZonePrice(z)}`, { sticky: true })
      layersRef.current[z.id] = poly
      all.push(poly)
    })

    L.marker([LOCAL.lat, LOCAL.lng], {
      icon: L.divIcon({
        className: '',
        html:
          '<div style="width:14px;height:14px;border-radius:50%;background:#F0C832;' +
          'border:3px solid #000;box-shadow:0 0 0 3px rgba(240,200,50,.45)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    }).addTo(map)

    map.fitBounds(L.featureGroup(all).getBounds(), { padding: [12, 12] })
    setTimeout(() => map.invalidateSize(), 120)

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = {}
    }
  }, [onSelect])

  useEffect(() => {
    Object.entries(layersRef.current).forEach(([id, layer]) => {
      const on = id === selected
      layer.setStyle({ fillOpacity: on ? 0.45 : 0.15, weight: on ? 4 : 2 })
    })
  }, [selected])

  return (
    <div
      ref={boxRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: 180, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#111' }}
    />
  )
}

export default function ZonePicker() {
  const { zone, setZone } = useCart()
  const cfg = useConfig()
  const [showMap, setShowMap] = useState(false)
  // "Hoy sin envíos" desde el panel: queda solo el retiro en el local
  const sinEnvios = !!todayOverride(cfg)?.deliveryOff
  // Mostramos el precio que realmente se cobra (el del panel si fue cambiado)
  const opciones = sinEnvios
    ? [PICKUP]
    : [PICKUP, ...ZONES.map((z) => ({ ...z, price: zonePrice(z, cfg) })), OTHER]

  // Si se apagó el delivery con una zona ya elegida, la sacamos
  useEffect(() => {
    if (sinEnvios && zone && zone.id !== PICKUP.id) setZone(PICKUP.id)
  }, [sinEnvios, zone, setZone])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className="text-white/55 text-[11px] tracking-[0.18em] uppercase"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          ¿A dónde te la llevamos?
        </span>
        {!sinEnvios && (
        <button
          onClick={() => setShowMap((v) => !v)}
          className="flex items-center gap-1 text-[#F0C832]/80 hover:text-[#F0C832] text-[11px] transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          <MapIcon size={12} />
          {showMap ? 'Ocultar mapa' : 'Ver mapa'}
          <ChevronDown
            size={12}
            style={{ transform: showMap ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          />
        </button>
        )}
      </div>

      {sinEnvios && (
        <p
          className="text-[#F0C832] text-xs px-3 py-2.5 rounded-xl"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            backgroundColor: 'rgba(240,200,50,0.1)',
            border: '1px solid rgba(240,200,50,0.3)',
          }}
        >
          Hoy no estamos haciendo envíos — solo retiro en el local.
        </p>
      )}

      {showMap && !sinEnvios && <ZoneMap selected={zone?.id} onSelect={setZone} />}

      {opciones.map((z) => {
        const on = zone?.id === z.id
        const isPickup = z.id === PICKUP.id
        return (
          <button
            key={z.id}
            onClick={() => setZone(z.id)}
            className="text-left rounded-xl px-3 py-2.5 transition-colors"
            style={{
              backgroundColor: on ? 'rgba(240,200,50,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${on ? 'rgba(240,200,50,0.5)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                {isPickup ? (
                  <Package size={14} className="text-white/55 shrink-0" />
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: z.color || 'transparent',
                      border: z.color ? 'none' : '1px dashed rgba(255,255,255,0.45)',
                    }}
                  />
                )}
                <span
                  className="text-white text-[13px] uppercase truncate"
                  style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}
                >
                  {z.name}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span
                  className={on ? 'text-[#F0C832] text-sm' : 'text-white/65 text-sm'}
                  style={{ fontFamily: 'Anton, sans-serif' }}
                >
                  {formatZonePrice(z)}
                </span>
                {on && (
                  <span className="w-4 h-4 rounded-full bg-[#F0C832] flex items-center justify-center">
                    <Check size={10} strokeWidth={3} className="text-black" />
                  </span>
                )}
              </span>
            </div>
            <p
              className="text-white/40 text-[11px] mt-1 pl-[22px]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {isPickup ? '27 esq. 80 · Altos de San Lorenzo' : z.bounds}
            </p>
          </button>
        )
      })}
    </div>
  )
}
