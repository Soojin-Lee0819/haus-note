// src/components/CommuteTimes.tsx
import React from 'react'
import { Car, Train, Bike, Footprints, Briefcase, GraduationCap, Dumbbell, Home, MapPin, ExternalLink } from 'lucide-react'
import { ApartmentCommute } from '../types/database'
import { commuteService } from '../services/commuteService'

interface CommuteTimesProps {
  commutes: ApartmentCommute[]
  mode?: 'compact' | 'full'
  defaultTravelMode?: 'driving' | 'transit' | 'walking' | 'bicycling'
  apartmentLat?: number
  apartmentLng?: number
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  work: Briefcase,
  school: GraduationCap,
  gym: Dumbbell,
  home: Home,
  other: MapPin,
}

const travelIcons = {
  driving: Car,
  transit: Train,
  walking: Footprints,
  bicycling: Bike,
}

type TravelMode = 'driving' | 'transit' | 'walking' | 'bicycling'

function getBestMode(commute: ApartmentCommute): TravelMode | null {
  const modes: { key: TravelMode; value: number | undefined }[] = [
    { key: 'driving', value: commute.duration_driving },
    { key: 'transit', value: commute.duration_transit },
    { key: 'walking', value: commute.duration_walking },
    { key: 'bicycling', value: commute.duration_bicycling },
  ]
  let best: { key: TravelMode; value: number } | null = null
  for (const m of modes) {
    if (m.value != null && (best === null || m.value < best.value)) {
      best = { key: m.key, value: m.value }
    }
  }
  return best?.key ?? null
}

export function CommuteTimes({ commutes, mode = 'compact', defaultTravelMode = 'transit', apartmentLat, apartmentLng }: CommuteTimesProps) {
  if (!commutes || commutes.length === 0) return null

  const getDuration = (commute: ApartmentCommute, travelMode: string) => {
    switch (travelMode) {
      case 'driving': return commute.duration_driving
      case 'transit': return commute.duration_transit
      case 'walking': return commute.duration_walking
      case 'bicycling': return commute.duration_bicycling
      default: return commute.duration_transit
    }
  }

  const openDirections = (commute: ApartmentCommute, travelMode: TravelMode) => {
    const location = commute.location
    if (!location) return
    const url = commuteService.getGoogleMapsDirectionsUrl(
      { lat: location.latitude, lng: location.longitude, address: location.address },
      travelMode,
      apartmentLat != null && apartmentLng != null
        ? { lat: apartmentLat, lng: apartmentLng }
        : undefined
    )
    window.open(url, '_blank')
  }

  if (mode === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {commutes.slice(0, 3).map(commute => {
          const duration = getDuration(commute, defaultTravelMode)
          const TravelIcon = travelIcons[defaultTravelMode]
          const name = commute.location?.name || ''
          const truncatedName = name.length > 5 ? name.slice(0, 5) + '.' : name

          return (
            <div
              key={commute.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-xs"
              title={`${name}: ${commuteService.formatDuration(duration)} by ${defaultTravelMode}`}
            >
              <span className="font-medium text-blue-800">{truncatedName}</span>
              <TravelIcon className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-blue-700">
                {commuteService.formatDuration(duration)}
              </span>
            </div>
          )
        })}
        {commutes.length > 3 && (
          <span className="text-xs text-gray-400">+{commutes.length - 3}</span>
        )}
      </div>
    )
  }

  // Full mode - shows all commutes with all travel modes
  return (
    <div className="space-y-3">
      {commutes.map(commute => {
        const Icon = iconMap[commute.location?.icon || 'other'] || MapPin
        const bestMode = getBestMode(commute)

        return (
          <div key={commute.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">{commute.location?.name}</span>
              <span className="text-xs text-gray-400 truncate flex-1">
                {commute.location?.address}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <CommuteTimeItem
                icon={Car}
                label="Drive"
                duration={commute.duration_driving}
                isBest={bestMode === 'driving'}
                onClick={() => openDirections(commute, 'driving')}
              />
              <CommuteTimeItem
                icon={Train}
                label="Transit"
                duration={commute.duration_transit}
                isBest={bestMode === 'transit'}
                onClick={() => openDirections(commute, 'transit')}
              />
              <CommuteTimeItem
                icon={Bike}
                label="Bike"
                duration={commute.duration_bicycling}
                isBest={bestMode === 'bicycling'}
                onClick={() => openDirections(commute, 'bicycling')}
              />
              <CommuteTimeItem
                icon={Footprints}
                label="Walk"
                duration={commute.duration_walking}
                isBest={bestMode === 'walking'}
                onClick={() => openDirections(commute, 'walking')}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CommuteTimeItem({
  icon: Icon,
  label,
  duration,
  isBest,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  duration?: number | null
  isBest?: boolean
  onClick?: () => void
}) {
  const hasData = duration != null
  return (
    <div
      className={`text-center rounded-lg p-1.5 transition-colors ${
        isBest
          ? 'bg-blue-100 ring-1 ring-blue-300'
          : ''
      } ${hasData ? 'cursor-pointer hover:bg-gray-200' : ''}`}
      onClick={hasData ? onClick : undefined}
      title={hasData ? `View directions on Google Maps` : undefined}
    >
      <Icon className={`w-4 h-4 mx-auto mb-1 ${isBest ? 'text-blue-600' : 'text-gray-400'}`} />
      <div className={`text-sm font-medium ${isBest ? 'text-blue-700' : 'text-gray-900'}`}>
        {commuteService.formatDuration(duration)}
      </div>
      <div className={`text-xs ${isBest ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
        {hasData && <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 opacity-50" />}
      </div>
    </div>
  )
}
