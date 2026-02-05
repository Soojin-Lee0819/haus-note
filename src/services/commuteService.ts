// src/services/commuteService.ts
import { supabase } from '../lib/supabase'
import { CommuteLocation, ApartmentCommute } from '../types/database'
import { geocodeService } from './geocodeService'

type TravelMode = 'driving' | 'transit' | 'walking' | 'bicycling'

interface DistanceMatrixResult {
  duration: number  // seconds
  distance: number  // meters
}

export const commuteService = {
  // ==================
  // Commute Locations
  // ==================

  // Get all commute locations for a project
  async getLocationsByProject(projectId: string): Promise<CommuteLocation[]> {
    const { data, error } = await supabase
      .from('commute_locations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Add a new commute location
  async addLocation(location: {
    project_id: string
    name: string
    address: string
    icon?: string
    latitude?: number
    longitude?: number
  }): Promise<CommuteLocation> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Use provided coordinates or geocode the address
    let latitude = location.latitude
    let longitude = location.longitude

    if (!latitude || !longitude) {
      const geocoded = await geocodeService.geocodeAddress(location.address)
      if (geocoded) {
        latitude = geocoded.latitude
        longitude = geocoded.longitude
      }
    }

    const { data, error } = await supabase
      .from('commute_locations')
      .insert({
        project_id: location.project_id,
        name: location.name,
        address: location.address,
        icon: location.icon,
        latitude,
        longitude,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a commute location
  async updateLocation(locationId: string, updates: Partial<CommuteLocation>): Promise<CommuteLocation> {
    // Only re-geocode if address changed AND no coordinates were provided
    if (updates.address && updates.latitude == null && updates.longitude == null) {
      const geocoded = await geocodeService.geocodeAddress(updates.address)
      if (geocoded) {
        updates.latitude = geocoded.latitude
        updates.longitude = geocoded.longitude
      }
    }

    const { data, error } = await supabase
      .from('commute_locations')
      .update(updates)
      .eq('id', locationId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a commute location
  async deleteLocation(locationId: string): Promise<void> {
    const { error } = await supabase
      .from('commute_locations')
      .delete()
      .eq('id', locationId)

    if (error) throw error
  },

  // ==================
  // Commute Times
  // ==================

  // Ensure the Google Maps routes library is loaded (contains DistanceMatrixService)
  async _ensureRoutesLibrary(): Promise<boolean> {
    const g = (window as any).google
    if (!g?.maps) {
      console.log('[commute] google.maps not available yet')
      return false
    }

    // Classic script loading: DistanceMatrixService is already on google.maps
    if (g.maps.DistanceMatrixService) {
      return true
    }

    // New dynamic loading: need to importLibrary('routes')
    if (typeof g.maps.importLibrary === 'function') {
      try {
        await g.maps.importLibrary('routes')
        if (g.maps.DistanceMatrixService) {
          return true
        }
        console.log('[commute] importLibrary("routes") resolved but DistanceMatrixService still missing')
        return false
      } catch (err) {
        console.error('[commute] importLibrary("routes") failed:', err)
        return false
      }
    }

    console.log('[commute] DistanceMatrixService not found and importLibrary not available')
    return false
  },

  // Calculate commute time using the Google Maps JS API DistanceMatrixService
  async calculateCommute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    mode: TravelMode = 'transit'
  ): Promise<DistanceMatrixResult | null> {
    const ready = await this._ensureRoutesLibrary()
    if (!ready) return null

    const g = (window as any).google

    const travelModeMap: Record<string, string> = {
      driving: 'DRIVING',
      transit: 'TRANSIT',
      walking: 'WALKING',
      bicycling: 'BICYCLING',
    }

    const service = new g.maps.DistanceMatrixService()

    return new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [{ lat: originLat, lng: originLng }],
          destinations: [{ lat: destLat, lng: destLng }],
          travelMode: travelModeMap[mode],
        },
        (response: any, status: string) => {
          if (
            status === 'OK' &&
            response?.rows[0]?.elements[0]?.status === 'OK'
          ) {
            const element = response.rows[0].elements[0]
            resolve({
              duration: element.duration.value,
              distance: element.distance.value,
            })
          } else {
            console.warn(`Distance Matrix ${mode}:`, status, response?.rows[0]?.elements[0]?.status)
            resolve(null)
          }
        }
      )
    })
  },

  // Calculate and store commute times for an apartment to all project locations
  async calculateCommutesForApartment(
    apartmentId: string,
    apartmentLat: number,
    apartmentLng: number,
    projectId: string
  ): Promise<ApartmentCommute[]> {
    // Get all locations for this project
    const locations = await this.getLocationsByProject(projectId)
    const results: ApartmentCommute[] = []

    for (const location of locations) {
      if (!location.latitude || !location.longitude) continue

      // Calculate for different modes
      const [driving, transit, walking, bicycling] = await Promise.all([
        this.calculateCommute(apartmentLat, apartmentLng, location.latitude, location.longitude, 'driving'),
        this.calculateCommute(apartmentLat, apartmentLng, location.latitude, location.longitude, 'transit'),
        this.calculateCommute(apartmentLat, apartmentLng, location.latitude, location.longitude, 'walking'),
        this.calculateCommute(apartmentLat, apartmentLng, location.latitude, location.longitude, 'bicycling'),
      ])

      // Upsert the commute record
      const { data, error } = await supabase
        .from('apartment_commutes')
        .upsert({
          apartment_id: apartmentId,
          location_id: location.id,
          duration_driving: driving?.duration,
          duration_transit: transit?.duration,
          duration_walking: walking?.duration,
          duration_bicycling: bicycling?.duration,
          distance_meters: driving?.distance || transit?.distance,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'apartment_id,location_id'
        })
        .select()
        .single()

      if (!error && data) {
        results.push({ ...data, location })
      }
    }

    return results
  },

  // Get commute times for an apartment
  async getCommutesForApartment(apartmentId: string): Promise<ApartmentCommute[]> {
    const { data: commutes, error } = await supabase
      .from('apartment_commutes')
      .select('*')
      .eq('apartment_id', apartmentId)

    if (error) throw error
    if (!commutes || commutes.length === 0) return []

    // Get location details
    const locationIds = commutes.map(c => c.location_id).filter(Boolean)
    const { data: locations } = await supabase
      .from('commute_locations')
      .select('*')
      .in('id', locationIds)

    const locationMap = new Map(locations?.map(l => [l.id, l]) || [])

    return commutes.map(commute => ({
      ...commute,
      location: commute.location_id ? locationMap.get(commute.location_id) : undefined
    }))
  },

  // Recalculate commutes for all apartments when a new location is added
  async recalculateCommutesForProject(projectId: string): Promise<void> {
    // Get all apartments with coordinates
    const { data: apartments } = await supabase
      .from('apartments')
      .select('id, latitude, longitude')
      .eq('project_id', projectId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (!apartments || apartments.length === 0) return

    // Calculate commutes for each apartment
    for (const apt of apartments) {
      if (apt.latitude && apt.longitude) {
        await this.calculateCommutesForApartment(
          apt.id,
          Number(apt.latitude),
          Number(apt.longitude),
          projectId
        )
      }
    }
  },

  // Build a Google Maps directions URL
  getGoogleMapsDirectionsUrl(
    destination: { lat?: number; lng?: number; address?: string },
    travelMode: TravelMode,
    origin?: { lat?: number; lng?: number; address?: string }
  ): string {
    const params = new URLSearchParams({ api: '1' })

    if (origin?.lat != null && origin?.lng != null) {
      params.set('origin', `${origin.lat},${origin.lng}`)
    } else if (origin?.address) {
      params.set('origin', origin.address)
    }

    if (destination.lat != null && destination.lng != null) {
      params.set('destination', `${destination.lat},${destination.lng}`)
    } else if (destination.address) {
      params.set('destination', destination.address)
    }

    const modeMap: Record<TravelMode, string> = {
      driving: 'driving',
      transit: 'transit',
      walking: 'walking',
      bicycling: 'bicycling',
    }
    params.set('travelmode', modeMap[travelMode])

    return `https://www.google.com/maps/dir/?${params.toString()}`
  },

  // Format duration for display
  formatDuration(seconds: number | undefined | null): string {
    if (!seconds) return '-'
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }
}
