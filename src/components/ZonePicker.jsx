import { useRef, useEffect, useState } from 'react'
import { Check, Package, Map as MapIcon, ChevronDown, MapPin } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCart } from '../context/CartContext'
import { ZONES, PICKUP, OTHER, LOCAL, formatZonePrice, zonePrice, zonaDeCalles } from '../lib/zones'
import { useConfig, todayOverride } from '../lib/config'

// Mapas base. Los tiles de CARTO (el que usábamos) ahora piden API key y
// devuelven un cartel "API KEY REQUIRED" en cada cuadro, así que usamos los de
// OpenStreetMap (sin clave), oscurecidos por CSS para que combinen con el sitio.
// Si por algún motivo fallan, se pasa solo al de Esri.
const BASES = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
    className: 'mw-tiles-dark',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
    maxZoom: 19,
    maxNativeZoom: 18,
    className: 'mw-tiles-dark',
  },
]

// Mapa con las zonas dibujadas con su forma real (rectángulos de la grilla de
// calles, coloreados según la zona). Se monta solo cuando se abre (dentro del
// carrito), con el cajón todavía deslizándose: el contenedor puede medir 0px al
// arrancar. Por eso se vuelve a encuadrar cada vez que cambia de tamaño, hasta
// que la persona toca el mapa.
function ZoneMap({ selected, onSelect, precios }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return

    const tactil = L.Browser.mobile
    const map = L.map(boxRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      // En el celu un dedo tiene que seguir moviendo el carrito, no el mapa:
      // recién se puede arrastrar cuando ya se hizo zoom (ver más abajo).
      dragging: !tactil,
      attributionControl: true,
    })
    mapRef.current = map
    map.attributionControl.setPrefix(false)
    L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map)

    // Mapa base con respaldo: si fallan muchos cuadros, cambia al siguiente
    let base = 0
    let errores = 0
    let capa = null
    const ponerBase = () => {
      if (capa) map.removeLayer(capa)
      errores = 0
      capa = L.tileLayer(BASES[base].url, BASES[base]).addTo(map)
      capa.on('tileerror', () => {
        errores += 1
        if (errores === 4 && base < BASES.length - 1) {
          base += 1
          ponerBase()
        }
      })
    }
    ponerBase()

    // Un rectángulo por sector; los de una misma zona comparten color
    const all = []
    ZONES.forEach((z) => {
      layersRef.current[z.id] = z.sectores.map((s) => {
        const poly = L.polygon(s.polygon, {
          color: z.color,
          weight: 1,
          opacity: 0.6,
          fillColor: z.color,
          fillOpacity: 0.2,
        }).addTo(map)
        poly.on('click', () => onSelect(z.id))
        poly.bindTooltip(z.name, { sticky: true, className: 'mw-zone-label' })
        all.push(poly)
        return poly
      })
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
      keyboard: false,
      zIndexOffset: 1000,
    })
      .bindTooltip('Mr. White · 27 esq. 80', { direction: 'top', offset: [0, -8] })
      .addTo(map)

    // Encuadre: todas las zonas, y se repite mientras el mapa cambie de tamaño
    const limites = L.featureGroup(all).getBounds()
    let tocado = false
    let porCodigo = false
    let zoomBase = null
    const encuadrar = () => {
      map.invalidateSize()
      if (tocado) return
      porCodigo = true
      map.fitBounds(limites, { padding: [8, 8], animate: false })
      zoomBase = map.getZoom()
      porCodigo = false
    }
    encuadrar()
    map.on('dragstart zoomstart', () => { if (!porCodigo) tocado = true })
    // En pantallas táctiles el arrastre con un dedo se habilita al acercar
    if (tactil) {
      map.on('zoomend', () => {
        if (zoomBase != null && map.getZoom() > zoomBase) map.dragging.enable()
        else map.dragging.disable()
      })
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(encuadrar) : null
    ro?.observe(boxRef.current)

    return () => {
      ro?.disconnect()
      map.remove()
      mapRef.current = null
      layersRef.current = {}
    }
  }, [onSelect])

  useEffect(() => {
    Object.entries(layersRef.current).forEach(([id, polys]) => {
      const on = id === selected
      polys.forEach((p) => {
        p.setStyle({ fillOpacity: on ? 0.55 : 0.2, weight: on ? 2.5 : 1, opacity: on ? 1 : 0.6 })
        if (on) p.bringToFront()
      })
    })
  }, [selected])

  return (
    <div className="relative">
      <div
        ref={boxRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height: 240, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#111' }}
      />
      {/* Referencia de colores → precio */}
      <div
        className="absolute left-2 top-2 z-[500] flex flex-wrap gap-x-2.5 gap-y-1 max-w-[70%] px-2 py-1.5 rounded-lg pointer-events-none"
        style={{ backgroundColor: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {precios.map((z) => (
          <span
            key={z.id}
            className="flex items-center gap-1 text-[10px] text-white/80"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
            {formatZonePrice(z)}
          </span>
        ))}
      </div>
    </div>
  )
}

// "¿En qué zona estoy?": se escriben las dos calles de la esquina (12 y 60) y
// se elige sola la zona que corresponde.
function BuscaZona({ zona, setZone, cfg }) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')

  const nx = Number(x)
  const ny = Number(y)
  const completo = x !== '' && y !== ''
  const r = completo ? zonaDeCalles(nx, ny) : null
  const zonaR = r?.zona ? { ...r.zona, price: zonePrice(r.zona, cfg) } : null

  const cambiar = (set) => (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 3)
    set(v)
    // Si con este valor la esquina ya está completa, se elige la zona
    const otro = set === setX ? y : x
    if (v !== '' && otro !== '') {
      const res = set === setX ? zonaDeCalles(Number(v), Number(otro)) : zonaDeCalles(Number(otro), Number(v))
      if (res.zona) setZone(res.zona.id)
      else if (res.fuera) setZone(OTHER.id) // fuera de las zonas: el envío se coordina
    }
  }

  const campo =
    'w-full min-w-0 text-center text-white text-base rounded-lg py-2 outline-none placeholder:text-white/25 focus:border-[#F0C832]/60'

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="flex items-center gap-1.5 text-white text-[13px] uppercase" style={{ fontFamily: 'Anton, sans-serif', letterSpacing: '0.02em' }}>
        <MapPin size={13} className="text-[#F0C832]" />
        ¿En qué zona estás?
      </p>
      <p className="text-white/40 text-[11px] mt-0.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        Poné las dos calles de tu esquina, por ejemplo 12 y 60.
      </p>
      <div className="flex items-center gap-2 mt-2.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <input
          value={x}
          onChange={cambiar(setX)}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Calle"
          aria-label="Primera calle de tu esquina"
          className={campo}
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <span className="text-white/45 text-sm">y</span>
        <input
          value={y}
          onChange={cambiar(setY)}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Calle"
          aria-label="Segunda calle de tu esquina"
          className={campo}
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </div>

      {completo && (
        <p
          className="text-[12px] mt-2.5 leading-snug"
          style={{ fontFamily: 'DM Sans, sans-serif', color: zonaR ? zonaR.color : 'rgba(255,255,255,0.55)' }}
          role="status"
        >
          {zonaR && (
            <>
              <strong className="font-semibold">Estás en {zonaR.name}</strong> · {formatZonePrice(zonaR)} de envío
              {zona?.id === zonaR.id ? ' ✓' : ''}
            </>
          )}
          {r?.fuera && 'Esa esquina queda fuera de nuestras zonas: el envío lo coordinamos por WhatsApp.'}
          {r?.error === 'misma' && 'Poné una calle de cada numeración, por ejemplo 12 y 60.'}
          {r?.error === 'numero' && 'No reconozco esas calles. Probá con otra esquina o elegí la zona en la lista.'}
        </p>
      )}
    </div>
  )
}

export default function ZonePicker() {
  const { zone, setZone } = useCart()
  const cfg = useConfig()
  const [showMap, setShowMap] = useState(false)
  // "Hoy sin envíos" desde el panel: queda solo el retiro en el local
  const sinEnvios = !!todayOverride(cfg)?.deliveryOff
  // Mostramos el precio que realmente se cobra (el del panel si fue cambiado)
  const zonasConPrecio = ZONES.map((z) => ({ ...z, price: zonePrice(z, cfg) }))
  const opciones = sinEnvios ? [PICKUP] : [PICKUP, ...zonasConPrecio, OTHER]

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

      {showMap && !sinEnvios && <ZoneMap selected={zone?.id} onSelect={setZone} precios={zonasConPrecio} />}

      {!sinEnvios && <BuscaZona zona={zone} setZone={setZone} cfg={cfg} />}

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
