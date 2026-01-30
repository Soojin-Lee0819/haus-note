// src/components/ApartmentMap.tsx
import React, { useEffect, useRef, useState } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { Apartment, ApartmentCommute } from '../types/database'

interface MapProps {
  apartments: Apartment[]
  selectedId?: string
  onMarkerClick: (apartment: Apartment) => void
  center?: { lat: number; lng: number }
  apartmentCommutes?: Record<string, ApartmentCommute[]>
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '-'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

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

      // Arrows
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

      // Dots
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
    // No photo placeholder
    const placeholder = document.createElement('div')
    placeholder.style.cssText = 'width:280px;height:100px;background:#f3f4f6;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;'
    placeholder.textContent = 'No photos'
    card.appendChild(placeholder)
  }

  // --- Info section ---
  const info = document.createElement('div')
  info.style.cssText = 'padding:12px;'

  // Title
  const title = document.createElement('div')
  title.textContent = apartment.title
  title.style.cssText = 'font-weight:600;font-size:15px;color:#111827;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
  info.appendChild(title)

  // Price + bed/bath
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

      // Find best duration
      const durations = [c.duration_driving, c.duration_transit, c.duration_walking, c.duration_bicycling].filter(Boolean) as number[]
      const best = durations.length > 0 ? Math.min(...durations) : null

      if (best === null) return

      const pill = document.createElement('span')
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#eff6ff;border-radius:4px;font-size:11px;color:#1d4ed8;font-weight:500;'
      pill.textContent = `${truncName} ${formatDuration(best)}`
      commuteWrap.appendChild(pill)
    })

    if (commuteWrap.childNodes.length > 0) {
      info.appendChild(commuteWrap)
    }
  }

  card.appendChild(info)
  return card
}

function MapComponent({ apartments, selectedId, onMarkerClick, center, apartmentCommutes }: MapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Initialize map
  useEffect(() => {
    if (!ref.current || map) return

    const newMap = new google.maps.Map(ref.current, {
      center: center || { lat: 40.7128, lng: -74.006 }, // Default NYC
      zoom: 12,
      mapId: 'apartment-map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    infoWindowRef.current = new google.maps.InfoWindow()

    setMap(newMap)
  }, [center, map])

  // Update markers when apartments change
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null)
    markersRef.current = []

    // Filter apartments with valid coordinates
    const apartmentsWithCoords = apartments.filter(
      apt => apt.latitude && apt.longitude
    )

    if (apartmentsWithCoords.length === 0) return

    // Create bounds
    const bounds = new google.maps.LatLngBounds()

    // Create markers
    apartmentsWithCoords.forEach(apartment => {
      const position = {
        lat: Number(apartment.latitude),
        lng: Number(apartment.longitude),
      }
      bounds.extend(position)

      // Create price label element
      const priceElement = document.createElement('div')
      const isSelected = apartment.id === selectedId
      priceElement.className = `
        px-2 py-1 rounded-full text-sm font-medium shadow-md cursor-pointer
        transition-all transform
        ${isSelected
          ? 'bg-gray-900 text-white scale-110'
          : 'bg-white text-gray-900 hover:scale-105'
        }
      `
      priceElement.textContent = `$${Math.round(apartment.price / 10) / 100}k` // Format as $X.Xk

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: priceElement,
        title: apartment.title,
      })

      marker.addListener('click', () => {
        onMarkerClick(apartment)

        // Show info card
        if (infoWindowRef.current) {
          const commutes = apartmentCommutes?.[apartment.id]
          const content = buildInfoCardContent(apartment, commutes)
          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open({
            anchor: marker,
            map,
          })
        }
      })

      markersRef.current.push(marker)
    })

    // Fit bounds if we have apartments
    if (apartmentsWithCoords.length > 0) {
      map.fitBounds(bounds, 50)

      // Don't zoom in too much for single marker
      const listener = google.maps.event.addListener(map, 'idle', () => {
        const zoom = map.getZoom()
        if (zoom && zoom > 15) map.setZoom(15)
        google.maps.event.removeListener(listener)
      })
    }
  }, [map, apartments, selectedId, onMarkerClick, apartmentCommutes])

  return <div ref={ref} className="w-full h-full" />
}

// Fallback when no API key or loading
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

export function ApartmentMap({ apartments, selectedId, onMarkerClick, center, apartmentCommutes }: MapProps) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY

  // Check if any apartments have coordinates
  const hasCoordinates = apartments.some(apt => apt.latitude && apt.longitude)

  if (!apiKey || !hasCoordinates) {
    return <MapFallback apartments={apartments} />
  }

  return (
    <Wrapper apiKey={apiKey} libraries={['marker']}>
      <MapComponent
        apartments={apartments}
        selectedId={selectedId}
        onMarkerClick={onMarkerClick}
        center={center}
        apartmentCommutes={apartmentCommutes}
      />
    </Wrapper>
  )
}
