// src/services/geocodeService.ts

interface GeocodeResult {
  latitude: number
  longitude: number
  formattedAddress: string
}

export const geocodeService = {
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const encodedAddress = encodeURIComponent(address)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
      )

      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0]
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        }
      }

      if (data.status === 'ZERO_RESULTS') {
        console.warn('No results found for address:', address)
        return null
      }

      console.error('Geocoding error:', data.status, data.error_message)
      return null
    } catch (error) {
      console.error('Geocoding request failed:', error)
      return null
    }
  },

  // Reverse geocode: get address from coordinates
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      )

      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address
      }

      return null
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
      return null
    }
  }
}
