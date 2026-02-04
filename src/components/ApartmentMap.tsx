// src/components/ApartmentMap.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Apartment, ApartmentCommute, CommuteLocation } from '../types/database'
import { ClusterCarousel } from './ClusterCarousel'
import { loadGoogleMaps } from '../lib/googleMaps'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapProps {
  apartments: Apartment[]
  selectedId?: string
  onMarkerClick: (apartment: Apartment) => void
  center?: { lat: number; lng: number }
  apartmentCommutes?: Record<string, ApartmentCommute[]>
  commuteLocations?: CommuteLocation[]
  cityName?: string
  stateName?: string
}

interface InternalMapProps extends MapProps {
  onClusterSelect: (apartments: Apartment[] | null) => void
}

interface ApartmentCluster {
  key: string
  lat: number
  lng: number
  apartments: Apartment[]
  minPrice: number
  maxPrice: number
}

// ---------------------------------------------------------------------------
// Clustering — groups apartments within ~10 m of each other
// ---------------------------------------------------------------------------

const CLUSTER_THRESHOLD = 0.0001 // ~10 m

function clusterApartments(apartments: Apartment[]): ApartmentCluster[] {
  const withCoords = apartments.filter(a => a.latitude && a.longitude)
  const used = new Set<string>()
  const clusters: ApartmentCluster[] = []

  for (const apt of withCoords) {
    if (used.has(apt.id)) continue
    const group: Apartment[] = [apt]
    used.add(apt.id)

    for (const other of withCoords) {
      if (used.has(other.id)) continue
      const dLat = Math.abs(Number(apt.latitude) - Number(other.latitude))
      const dLng = Math.abs(Number(apt.longitude) - Number(other.longitude))
      if (dLat <= CLUSTER_THRESHOLD && dLng <= CLUSTER_THRESHOLD) {
        group.push(other)
        used.add(other.id)
      }
    }

    const avgLat = group.reduce((s, a) => s + Number(a.latitude), 0) / group.length
    const avgLng = group.reduce((s, a) => s + Number(a.longitude), 0) / group.length
    const prices = group.map(a => a.price)

    clusters.push({
      key: group.map(a => a.id).sort().join('|'),
      lat: avgLat,
      lng: avgLng,
      apartments: group,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    })
  }

  return clusters
}

// ---------------------------------------------------------------------------
// Price formatting — e.g. 3200 → "$3.2k", 12500 → "$12.5k"
// ---------------------------------------------------------------------------

function fmtPrice(price: number): string {
  const k = price / 1000
  // Show one decimal if < 10k, otherwise round
  return k < 10 ? `$${k.toFixed(1)}k` : `$${Math.round(k)}k`
}

// ---------------------------------------------------------------------------
// Pin DOM builder
// ---------------------------------------------------------------------------

function createPinElement(
  cluster: ApartmentCluster,
  isSelected: boolean,
): HTMLElement {
  const isSingle = cluster.apartments.length === 1

  // Outer wrapper (relative, for badge positioning)
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;'

  // Pill
  const pill = document.createElement('div')
  const bg = isSelected ? '#1A1A1A' : '#E8553A'
  const fg = '#fff'
  const border = isSelected ? '#1A1A1A' : '#D4432A'
  const scale = isSelected ? 'transform:scale(1.08);' : ''
  pill.style.cssText = `
    padding:6px 12px;font-size:13px;font-weight:600;font-family:system-ui,-apple-system,sans-serif;
    color:${fg};background:${bg};border:1.5px solid ${border};border-radius:9999px;
    white-space:nowrap;box-shadow:0 2px 8px rgba(232,85,58,0.35);${scale}
    transition:transform 0.15s ease,background 0.15s ease;
  `

  if (isSingle) {
    pill.textContent = fmtPrice(cluster.minPrice)
  } else {
    pill.textContent = `${fmtPrice(cluster.minPrice)}\u2013${fmtPrice(cluster.maxPrice)}`
  }

  wrapper.appendChild(pill)

  // Badge for clusters
  if (!isSingle) {
    const badge = document.createElement('div')
    badge.style.cssText = `
      position:absolute;top:-6px;right:-8px;
      width:20px;height:20px;border-radius:50%;
      background:#ef4444;color:#fff;font-size:11px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);
      font-family:system-ui,-apple-system,sans-serif;
    `
    badge.textContent = String(cluster.apartments.length)
    wrapper.appendChild(badge)
  }

  // Caret (downward pointing triangle)
  const caret = document.createElement('div')
  caret.style.cssText = `
    width:10px;height:10px;margin-top:-1px;
    background:${bg};
    transform:rotate(45deg);box-shadow:2px 2px 3px rgba(0,0,0,0.1);
  `
  wrapper.appendChild(caret)

  return wrapper
}

// ---------------------------------------------------------------------------
// Commute location SVG icons (inline, since we can't use Lucide in DOM)
// ---------------------------------------------------------------------------

const COMMUTE_ICON_SVGS: Record<string, string> = {
  work: '<path d="M6 7V6a2 2 0 012-2h4a2 2 0 012 2v1h2a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1h2zm2-1h4v1H8V6z" fill="currentColor"/>',
  school: '<path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6zm0 12.55L6 12.8v3.35L12 19l6-2.85V12.8L12 15.55z" fill="currentColor"/>',
  gym: '<path d="M20.27 4.73a1 1 0 00-1.41 0L17 6.59l-1.29-1.3a1 1 0 00-1.42 1.42L15.59 8l-5.18 5.17L9 11.88a1 1 0 00-1.42 0L6.29 13.17 5 11.88a1 1 0 00-1.42 1.41L4.88 14.59l-1.3 1.29a1 1 0 001.42 1.42l1.29-1.3 1.3 1.3a1 1 0 001.41-1.42L7.71 14.59 12.88 9.41 14.17 10.71a1 1 0 001.42 0l1.29-1.3 1.3 1.3a1 1 0 001.41-1.42L18.29 8l1.3-1.29a1 1 0 00-.01-1.41l-.01-.01 1.42-1.42a1 1 0 00-1.42-1.42z" fill="currentColor"/>',
  home: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  other: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="currentColor"/>',
}

function createCommuteLocationPin(location: CommuteLocation): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:default;'

  const bubble = document.createElement('div')
  bubble.style.cssText = `
    display:flex;align-items:center;gap:6px;padding:6px 10px;
    background:#4F46E5;border-radius:9999px;
    box-shadow:0 2px 8px rgba(79,70,229,0.35);
    white-space:nowrap;
  `

  // Icon
  const iconId = location.icon || 'other'
  const svgMarkup = COMMUTE_ICON_SVGS[iconId] || COMMUTE_ICON_SVGS['other']
  const iconEl = document.createElement('div')
  iconEl.style.cssText = 'width:16px;height:16px;color:#fff;flex-shrink:0;'
  iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="color:#fff">${svgMarkup}</svg>`
  bubble.appendChild(iconEl)

  // Label
  const label = document.createElement('span')
  label.textContent = location.name
  label.style.cssText = 'font-size:12px;font-weight:600;color:#fff;font-family:system-ui,-apple-system,sans-serif;'
  bubble.appendChild(label)

  wrapper.appendChild(bubble)

  // Caret
  const caret = document.createElement('div')
  caret.style.cssText = `
    width:8px;height:8px;margin-top:-1px;
    background:#4F46E5;
    transform:rotate(45deg);
    box-shadow:2px 2px 3px rgba(79,70,229,0.15);
  `
  wrapper.appendChild(caret)

  return wrapper
}

// ---------------------------------------------------------------------------
// Duration formatter (for InfoWindow commutes)
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '-'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

// ---------------------------------------------------------------------------
// InfoWindow card builder (unchanged logic, kept for single-apartment clicks)
// ---------------------------------------------------------------------------

function buildInfoCardContent(apartment: Apartment, commutes?: ApartmentCommute[]): HTMLElement {
  const card = document.createElement('div')
  card.style.cssText = 'width:280px;font-family:system-ui,-apple-system,sans-serif;'

  // --- Photo carousel ---
  const photos = (apartment.media || []).filter(m => m.media_type === 'photo' && m.url)
  if (photos.length > 0) {
    const carousel = document.createElement('div')
    carousel.style.cssText = 'position:relative;width:280px;height:180px;overflow:hidden;border-radius:8px 8px 0 0;background:#f3f4f6;'

    const track = document.createElement('div')
    track.style.cssText = 'display:flex;width:100%;height:100%;transition:transform 0.3s ease;'

    photos.forEach(photo => {
      const img = document.createElement('img')
      img.src = photo.url!
      img.alt = ''
      img.style.cssText = 'width:280px;height:180px;object-fit:cover;flex-shrink:0;'
      track.appendChild(img)
    })
    carousel.appendChild(track)

    if (photos.length > 1) {
      let idx = 0
      const updateSlide = () => {
        track.style.transform = `translateX(-${idx * 280}px)`
        dots.forEach((d, i) => {
          d.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.5)'
        })
      }

      const makeArrow = (label: string, isLeft: boolean) => {
        const btn = document.createElement('button')
        btn.textContent = label
        btn.style.cssText = `position:absolute;top:50%;transform:translateY(-50%);${isLeft ? 'left:6px' : 'right:6px'};background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);`
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          idx = isLeft
            ? (idx - 1 + photos.length) % photos.length
            : (idx + 1) % photos.length
          updateSlide()
        })
        return btn
      }
      carousel.appendChild(makeArrow('\u2039', true))
      carousel.appendChild(makeArrow('\u203A', false))

      const dotsWrap = document.createElement('div')
      dotsWrap.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px;'
      const dots: HTMLElement[] = []
      photos.slice(0, 5).forEach((_, i) => {
        const dot = document.createElement('div')
        dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'};`
        dots.push(dot)
        dotsWrap.appendChild(dot)
      })
      carousel.appendChild(dotsWrap)
    }

    card.appendChild(carousel)
  } else {
    const placeholder = document.createElement('div')
    placeholder.style.cssText = 'width:280px;height:100px;background:#f3f4f6;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;'
    placeholder.textContent = 'No photos'
    card.appendChild(placeholder)
  }

  // --- Info section ---
  const info = document.createElement('div')
  info.style.cssText = 'padding:12px;'

  const title = document.createElement('div')
  title.textContent = apartment.title
  title.style.cssText = 'font-weight:600;font-size:15px;color:#111827;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
  info.appendChild(title)

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;color:#374151;'

  const price = document.createElement('span')
  price.textContent = `$${apartment.price.toLocaleString()}/mo`
  price.style.fontWeight = '700'
  row.appendChild(price)

  const details: string[] = []
  if (apartment.bedrooms !== undefined) details.push(`${apartment.bedrooms}B`)
  if (apartment.bathrooms !== undefined) details.push(`${apartment.bathrooms}B`)
  if (details.length > 0) {
    const sep = document.createElement('span')
    sep.textContent = '\u00B7'
    sep.style.color = '#9ca3af'
    row.appendChild(sep)

    const detailSpan = document.createElement('span')
    detailSpan.textContent = details.join(' ')
    detailSpan.style.color = '#6b7280'
    row.appendChild(detailSpan)
  }

  if (apartment.square_feet) {
    const sep2 = document.createElement('span')
    sep2.textContent = '\u00B7'
    sep2.style.color = '#9ca3af'
    row.appendChild(sep2)

    const sqft = document.createElement('span')
    sqft.textContent = `${apartment.square_feet.toLocaleString()} sqft`
    sqft.style.color = '#6b7280'
    row.appendChild(sqft)
  }

  info.appendChild(row)

  // Commute info
  if (commutes && commutes.length > 0) {
    const commuteWrap = document.createElement('div')
    commuteWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;'

    commutes.slice(0, 3).forEach(c => {
      const name = c.location?.name || ''
      const truncName = name.length > 5 ? name.slice(0, 5) + '.' : name

      const durations = [c.duration_driving, c.duration_transit, c.duration_walking, c.duration_bicycling].filter(Boolean) as number[]
      const best = durations.length > 0 ? Math.min(...durations) : null

      if (best === null) return

      const commutePill = document.createElement('span')
      commutePill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#eff6ff;border-radius:4px;font-size:11px;color:#1d4ed8;font-weight:500;'
      commutePill.textContent = `${truncName} ${formatDuration(best)}`
      commuteWrap.appendChild(commutePill)
    })

    if (commuteWrap.childNodes.length > 0) {
      info.appendChild(commuteWrap)
    }
  }

  card.appendChild(info)
  return card
}

// ---------------------------------------------------------------------------
// Inner map component
// ---------------------------------------------------------------------------

function MapComponent({ apartments, selectedId, onMarkerClick, center, apartmentCommutes, commuteLocations, cityName, stateName, onClusterSelect }: InternalMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const commuteMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Geocode city name to get coordinates
  useEffect(() => {
    if (!cityName || center) return

    const geocoder = new google.maps.Geocoder()
    const address = stateName ? `${cityName}, ${stateName}` : cityName

    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location
        setCityCenter({ lat: location.lat(), lng: location.lng() })
      }
    })
  }, [cityName, stateName, center])

  // Initialize map
  useEffect(() => {
    if (!ref.current || map) return

    const initialCenter = center || cityCenter || { lat: 40.7128, lng: -74.006 }

    const newMap = new google.maps.Map(ref.current, {
      center: initialCenter,
      zoom: 12,
      mapId: 'apartment-map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    infoWindowRef.current = new google.maps.InfoWindow()

    // Close carousel + info window on map background click
    newMap.addListener('click', () => {
      onClusterSelect(null)
      infoWindowRef.current?.close()
    })

    setMap(newMap)
  }, [center, cityCenter, map, onClusterSelect])

  // Update map center when cityCenter changes
  useEffect(() => {
    if (map && cityCenter && apartments.length === 0) {
      map.setCenter(cityCenter)
      map.setZoom(12)
    }
  }, [map, cityCenter, apartments.length])

  // Update all markers (apartments + commute locations) and fit bounds
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null)
    markersRef.current = []
    commuteMarkersRef.current.forEach(m => m.map = null)
    commuteMarkersRef.current = []

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    // --- Commute location markers ---
    if (commuteLocations && commuteLocations.length > 0) {
      commuteLocations.forEach(loc => {
        if (!loc.latitude || !loc.longitude) return

        const position = { lat: Number(loc.latitude), lng: Number(loc.longitude) }
        bounds.extend(position)
        hasPoints = true

        const pinEl = createCommuteLocationPin(loc)

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          content: pinEl,
          title: loc.name,
          zIndex: 1,
        })

        commuteMarkersRef.current.push(marker)
      })
    }

    // --- Apartment markers ---
    const clusters = clusterApartments(apartments)

    clusters.forEach(cluster => {
      const position = { lat: cluster.lat, lng: cluster.lng }
      bounds.extend(position)
      hasPoints = true

      const isSelected = cluster.apartments.some(a => a.id === selectedId)
      const pinEl = createPinElement(cluster, isSelected)

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: pinEl,
        title: cluster.apartments.length === 1
          ? cluster.apartments[0].title
          : `${cluster.apartments.length} apartments`,
        zIndex: 2,
      })

      marker.addEventListener('gmp-click', () => {
        if (cluster.apartments.length === 1) {
          const apt = cluster.apartments[0]
          onClusterSelect(null)
          onMarkerClick(apt)

          if (infoWindowRef.current) {
            const commutes = apartmentCommutes?.[apt.id]
            const content = buildInfoCardContent(apt, commutes)
            infoWindowRef.current.setContent(content)
            infoWindowRef.current.open({ anchor: marker, map })
          }
        } else {
          infoWindowRef.current?.close()
          onClusterSelect(cluster.apartments)
        }
      })

      markersRef.current.push(marker)
    })

    if (hasPoints && !bounds.isEmpty()) {
      map.fitBounds(bounds, 50)

      const listener = google.maps.event.addListener(map, 'idle', () => {
        const zoom = map.getZoom()
        if (zoom && zoom > 15) map.setZoom(15)
        google.maps.event.removeListener(listener)
      })
    }
  }, [map, apartments, selectedId, onMarkerClick, onClusterSelect, apartmentCommutes, commuteLocations])

  return <div ref={ref} className="w-full h-full" />
}

// ---------------------------------------------------------------------------
// Fallback when no API key / no coordinates
// ---------------------------------------------------------------------------

function MapFallback({ apartments }: { apartments: Apartment[] }) {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p>{apartments.length} apartments</p>
        <p className="text-sm mt-1">Add coordinates to see on map</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exported ApartmentMap — wraps map + carousel in a relative container
// ---------------------------------------------------------------------------

export function ApartmentMap({ apartments, selectedId, onMarkerClick, center, apartmentCommutes, commuteLocations, cityName, stateName }: MapProps) {
  const [activeCluster, setActiveCluster] = useState<Apartment[] | null>(null)
  const [mapsLoaded, setMapsLoaded] = useState(!!window.google?.maps)

  const handleClusterSelect = useCallback((apts: Apartment[] | null) => {
    setActiveCluster(apts)
  }, [])

  const handleCarouselSelect = useCallback((apt: Apartment) => {
    setActiveCluster(null)
    onMarkerClick(apt)
  }, [onMarkerClick])

  useEffect(() => {
    if (!mapsLoaded) {
      loadGoogleMaps().then(() => setMapsLoaded(true)).catch(console.error)
    }
  }, [mapsLoaded])

  const hasCoordinates = apartments.some(apt => apt.latitude && apt.longitude)

  if (!mapsLoaded || (!hasCoordinates && !cityName)) {
    return <MapFallback apartments={apartments} />
  }

  return (
    <div className="relative w-full h-full">
      <MapComponent
        apartments={apartments}
        selectedId={selectedId}
        onMarkerClick={onMarkerClick}
        center={center}
        apartmentCommutes={apartmentCommutes}
        commuteLocations={commuteLocations}
        cityName={cityName}
        stateName={stateName}
        onClusterSelect={handleClusterSelect}
      />

      {activeCluster && (
        <ClusterCarousel
          apartments={activeCluster}
          onSelect={handleCarouselSelect}
          onClose={() => setActiveCluster(null)}
        />
      )}
    </div>
  )
}
