// src/components/AddApartmentModal.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, MapPin, Loader2, Check, ImagePlus } from 'lucide-react'
import { apartmentService, mediaService } from '../services'
import { geocodeService } from '../services/geocodeService'
import { loadGoogleMaps } from '../lib/googleMaps'
import { AmenityPicker } from './AmenityPicker'
import { Amenity } from '../types/database'

interface AddApartmentModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddApartmentModal({ projectId, isOpen, onClose, onSuccess }: AddApartmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocoded, setGeocoded] = useState(false)
  const [error, setError] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([])
  const [amenityIdCounter, setAmenityIdCounter] = useState(0)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const geocodedRef = useRef(false)
  const formDataRef = useRef({ address: '', latitude: '', longitude: '' })

  const [formData, setFormData] = useState({
    title: '',
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    neighborhood: '',
    listing_url: '',
    move_in_date: '',
    notes: '',
    latitude: '',
    longitude: '',
  })

  // Keep formDataRef in sync for use in async callbacks
  formDataRef.current = { address: formData.address, latitude: formData.latitude, longitude: formData.longitude }

  // Load Google Places API
  useEffect(() => {
    if (!isOpen) return
    loadGoogleMaps().then(() => setIsGoogleLoaded(true)).catch(console.error)
  }, [isOpen])

  // Initialize services when Google is loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [isGoogleLoaded])

  // Fetch address suggestions
  const fetchAddressSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim() || input.length < 3) {
      setAddressSuggestions([])
      return
    }

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          // No types restriction - search addresses, places, establishments, etc.
        },
        (predictions, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setAddressSuggestions(predictions)
          } else {
            setAddressSuggestions([])
          }
        }
      )
    } catch (err) {
      console.error('Error fetching address suggestions:', err)
      setAddressSuggestions([])
    }
  }, [])

  // Debounced address input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (formData.address && !geocoded) {
          fetchAddressSuggestions(formData.address)
        }
      } catch (err) {
        console.error('Error in address suggestion effect:', err)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [formData.address, fetchAddressSuggestions, geocoded])

  // Handle selecting an address suggestion
  const handleSelectAddress = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['formatted_address', 'geometry', 'address_components'],
        },
        (place, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const address = place.formatted_address || prediction.description
            let neighborhood = ''

            // Try to extract neighborhood from address components
            place.address_components?.forEach((component) => {
              if (component.types.includes('neighborhood') || component.types.includes('sublocality_level_1')) {
                neighborhood = component.long_name
              }
            })

            setFormData(prev => ({
              ...prev,
              address,
              neighborhood: neighborhood || prev.neighborhood,
              latitude: place.geometry?.location?.lat().toString() || '',
              longitude: place.geometry?.location?.lng().toString() || '',
            }))
            setGeocoded(true)
            geocodedRef.current = true
            setAddressSuggestions([])
            setShowAddressSuggestions(false)
          }
        }
      )
    } catch (err) {
      console.error('Error getting place details:', err)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowAddressSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddressBlur = () => {
    // Delay to allow click on suggestion to fire first
    setTimeout(async () => {
      try {
        // Check ref to see if autocomplete already set coordinates
        if (geocodedRef.current) return

        const { address, latitude, longitude } = formDataRef.current
        if (!address || address.length < 5) return
        if (latitude && longitude) return // Already has coordinates

        setGeocoding(true)

        const result = await geocodeService.geocodeAddress(address)

        // Re-check ref in case autocomplete resolved while geocoding was in-flight
        if (geocodedRef.current) return

        if (result) {
          setFormData(prev => ({
            ...prev,
            latitude: result.latitude.toString(),
            longitude: result.longitude.toString(),
          }))
          setGeocoded(true)
          geocodedRef.current = true
        }
      } catch (err) {
        console.error('Geocoding failed:', err)
      } finally {
        setGeocoding(false)
      }
    }, 300)
  }

  const handleAddressChange = (value: string) => {
    setFormData({
      ...formData,
      address: value,
      latitude: '', // Clear coordinates when address changes
      longitude: '',
    })
    setGeocoded(false)
    geocodedRef.current = false
    setShowAddressSuggestions(true)
  }

  const handleLocalAddAmenity = (name: string) => {
    const tempId = `temp-${amenityIdCounter}`
    setAmenityIdCounter(c => c + 1)
    setSelectedAmenities(prev => [...prev, { id: tempId, name, has_amenity: true }])
  }

  const handleLocalRemoveAmenity = (amenityId: string) => {
    setSelectedAmenities(prev => prev.filter(a => a.id !== amenityId))
  }

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files
      if (!files || files.length === 0) return

      const newFiles: File[] = []
      const newPreviews: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file && file.type.startsWith('image/')) {
          newFiles.push(file)
          try {
            const preview = URL.createObjectURL(file)
            newPreviews.push(preview)
          } catch (err) {
            console.error('Error creating preview for file:', file.name, err)
          }
        }
      }

      if (newFiles.length > 0) {
        setSelectedPhotos(prev => [...prev, ...newFiles])
        setPhotoPreviews(prev => [...prev, ...newPreviews])
      }
    } catch (err) {
      console.error('Error handling photo selection:', err)
    } finally {
      // Reset input to allow re-selecting same file
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // If not geocoded yet, try one more time
      let latitude = formData.latitude ? parseFloat(formData.latitude) : undefined
      let longitude = formData.longitude ? parseFloat(formData.longitude) : undefined

      if (!latitude || !longitude) {
        const result = await geocodeService.geocodeAddress(formData.address)
        if (result) {
          latitude = result.latitude
          longitude = result.longitude
        }
      }

      const created = await apartmentService.create({
        project_id: projectId,
        title: formData.title,
        address: formData.address,
        price: parseFloat(formData.price),
        latitude,
        longitude,
        bedrooms: formData.bedrooms ? parseFloat(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
        neighborhood: formData.neighborhood || undefined,
        listing_url: formData.listing_url || undefined,
        move_in_date: formData.move_in_date || undefined,
        notes: formData.notes || undefined,
      })

      // Save selected amenities
      if (selectedAmenities.length > 0) {
        await Promise.all(
          selectedAmenities.map(a => apartmentService.addAmenity(created.id, a.name))
        )
      }

      // Upload selected photos
      if (selectedPhotos.length > 0) {
        await mediaService.uploadMultiple(created.id, selectedPhotos)
      }

      onSuccess()
      onClose()
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
      setSelectedPhotos([])
      setPhotoPreviews([])
      setSelectedAmenities([])
      setFormData({
        title: '',
        address: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        square_feet: '',
        neighborhood: '',
        listing_url: '',
        move_in_date: '',
        notes: '',
        latitude: '',
        longitude: '',
      })
      setGeocoded(false)
      geocodedRef.current = false
    } catch (err: any) {
      setError(err.message || 'Failed to add apartment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">Add New Apartment</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Sunny 2BR in Downtown"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Address with autocomplete - NOW BEFORE PHOTOS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <div className="relative">
              <input
                ref={addressInputRef}
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={handleAddressBlur}
                placeholder="Start typing an address..."
                autoComplete="off"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {geocoding && (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                )}
                {geocoded && !geocoding && (
                  <div className="flex items-center gap-1 text-green-600">
                    <MapPin className="w-4 h-4" />
                    <Check className="w-4 h-4" />
                  </div>
                )}
                {!geocoding && !geocoded && formData.address && formData.address.length >= 3 && (
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                )}
              </div>

              {/* Address Suggestions Dropdown */}
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                >
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleSelectAddress(suggestion)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {suggestion.structured_formatting.main_text}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {suggestion.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {geocoded && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Location found on map
              </p>
            )}
          </div>

          {/* Photos - Prominent Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>
            {photoPreviews.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                      <img
                        src={preview}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Error loading preview image:', index)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {/* Add more button inline */}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotosSelected}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">{photoPreviews.length} photo{photoPreviews.length !== 1 ? 's' : ''} added</p>
              </div>
            ) : (
              <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">Add photos of this apartment</p>
                <p className="text-xs text-gray-500">Click to browse or drag and drop</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotosSelected}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="2500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                placeholder="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Square Feet & Neighborhood */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Square Feet
              </label>
              <input
                type="number"
                min="0"
                value={formData.square_feet}
                onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
                placeholder="850"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neighborhood
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                placeholder="Midtown"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Amenities */}
          <AmenityPicker
            amenities={selectedAmenities}
            canEdit={true}
            onAdd={handleLocalAddAmenity}
            onRemove={handleLocalRemoveAmenity}
          />

          {/* Move-in Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Move-in Date
            </label>
            <input
              type="date"
              value={formData.move_in_date}
              onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Listing URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Listing URL
            </label>
            <input
              type="url"
              value={formData.listing_url}
              onChange={(e) => setFormData({ ...formData, listing_url: e.target.value })}
              placeholder="https://zillow.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this apartment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Apartment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
