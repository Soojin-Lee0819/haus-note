// src/components/ApartmentDetail.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, MapPin, DollarSign, Bed, Bath, Square, Calendar, ExternalLink,
  ChevronLeft, ChevronRight, Trash2, Play, Edit2, Loader2, Check
} from 'lucide-react'
import { Apartment, ApartmentMedia, ApartmentComment, ApartmentCommute, Amenity } from '../types/database'
import { apartmentService, mediaService } from '../services'
import { MediaUploader } from './MediaUploader'
import { CommentSection } from './CommentSection'
import { CommuteTimes } from './CommuteTimes'
import { AmenityPicker } from './AmenityPicker'
import { format } from 'date-fns'
import { loadGoogleMaps } from '../lib/googleMaps'

interface ApartmentDetailProps {
  apartment: Apartment
  commutes?: ApartmentCommute[]
  currentUserId: string
  canEdit: boolean
  onClose: () => void
  onUpdate: (apartment: Apartment) => void
  onDelete: () => void
}

const statusOptions = [
  { value: 'interested', label: 'Interested', color: 'bg-blue-100 text-blue-800' },
  { value: 'visited', label: 'Visited', color: 'bg-purple-100 text-purple-800' },
  { value: 'applied', label: 'Applied', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' },
]

export function ApartmentDetail({
  apartment: initialApartment,
  commutes,
  currentUserId,
  canEdit,
  onClose,
  onUpdate,
  onDelete,
}: ApartmentDetailProps) {
  const [apartment, setApartment] = useState(initialApartment)
  const [media, setMedia] = useState<ApartmentMedia[]>(initialApartment.media || [])
  const [comments, setComments] = useState<ApartmentComment[]>(initialApartment.comments || [])
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [showUploader, setShowUploader] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: initialApartment.title,
    address: initialApartment.address,
    price: initialApartment.price.toString(),
    bedrooms: initialApartment.bedrooms?.toString() || '',
    bathrooms: initialApartment.bathrooms?.toString() || '',
    square_feet: initialApartment.square_feet?.toString() || '',
    neighborhood: initialApartment.neighborhood || '',
    move_in_date: initialApartment.move_in_date || '',
    listing_url: initialApartment.listing_url || '',
    notes: initialApartment.notes || '',
    latitude: initialApartment.latitude?.toString() || '',
    longitude: initialApartment.longitude?.toString() || '',
  })

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [addressSelected, setAddressSelected] = useState(true) // Initially true since we have existing address
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Refresh data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mediaData, commentsData, amenitiesData] = await Promise.all([
          mediaService.getByApartment(apartment.id),
          apartmentService.getComments(apartment.id),
          apartmentService.getAmenities(apartment.id),
        ])
        setMedia(mediaData)
        setComments(commentsData)
        setAmenities(amenitiesData)
      } catch (err) {
        console.error('Failed to load apartment data:', err)
      }
    }
    loadData()
  }, [apartment.id])

  // Load Google Places API when editing
  useEffect(() => {
    if (!isEditing) return
    loadGoogleMaps().then(() => setIsGoogleLoaded(true)).catch(console.error)
  }, [isEditing])

  // Initialize Google services
  useEffect(() => {
    try {
      if (isGoogleLoaded && window.google?.maps?.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        const dummyDiv = document.createElement('div')
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
      }
    } catch (err) {
      console.error('Error initializing Google services:', err)
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
        { input },
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

  // Debounced address input
  useEffect(() => {
    if (!isEditing || addressSelected) return

    const timer = setTimeout(() => {
      try {
        if (editForm.address) {
          fetchAddressSuggestions(editForm.address)
        }
      } catch (err) {
        console.error('Error in address suggestion effect:', err)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [editForm.address, fetchAddressSuggestions, isEditing, addressSelected])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      try {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(e.target as Node) &&
          addressInputRef.current &&
          !addressInputRef.current.contains(e.target as Node)
        ) {
          setShowAddressSuggestions(false)
        }
      } catch (err) {
        console.error('Error in click outside handler:', err)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

            place.address_components?.forEach((component) => {
              if (component.types.includes('neighborhood') || component.types.includes('sublocality_level_1')) {
                neighborhood = component.long_name
              }
            })

            setEditForm(prev => ({
              ...prev,
              address,
              neighborhood: neighborhood || prev.neighborhood,
              latitude: place.geometry?.location?.lat().toString() || '',
              longitude: place.geometry?.location?.lng().toString() || '',
            }))
            setAddressSelected(true)
            setAddressSuggestions([])
            setShowAddressSuggestions(false)
          }
        }
      )
    } catch (err) {
      console.error('Error getting place details:', err)
    }
  }

  const handleAddressChange = (value: string) => {
    setEditForm(prev => ({
      ...prev,
      address: value,
      latitude: '',
      longitude: '',
    }))
    setAddressSelected(false)
    setShowAddressSuggestions(true)
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await apartmentService.updateStatus(
        apartment.id,
        newStatus as Apartment['status']
      )
      setApartment({ ...apartment, status: updated.status })
      onUpdate({ ...apartment, status: updated.status })
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const updateData: Partial<Apartment> = {
        title: editForm.title,
        address: editForm.address,
        price: parseFloat(editForm.price),
      }

      // Only include optional fields if they have values
      if (editForm.bedrooms) updateData.bedrooms = parseFloat(editForm.bedrooms)
      if (editForm.bathrooms) updateData.bathrooms = parseFloat(editForm.bathrooms)
      if (editForm.square_feet) updateData.square_feet = parseInt(editForm.square_feet)
      if (editForm.neighborhood) updateData.neighborhood = editForm.neighborhood
      if (editForm.move_in_date) updateData.move_in_date = editForm.move_in_date
      if (editForm.listing_url) updateData.listing_url = editForm.listing_url
      if (editForm.notes) updateData.notes = editForm.notes

      // Include coordinates if we have them
      if (editForm.latitude && editForm.longitude) {
        updateData.latitude = parseFloat(editForm.latitude)
        updateData.longitude = parseFloat(editForm.longitude)
      }

      console.log('Updating apartment with:', updateData)
      const updated = await apartmentService.update(apartment.id, updateData)
      console.log('Update response:', updated)

      if (updated) {
        const merged = { ...apartment, ...updated }
        setApartment(merged)
        onUpdate(merged)
        setIsEditing(false)
        setAddressSelected(true)
      }
    } catch (err: any) {
      console.error('Failed to update apartment:', err)
      console.error('Error details:', err?.message, err?.stack)
      alert('Failed to save changes: ' + (err?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleMediaUpload = (newMedia: ApartmentMedia[]) => {
    setMedia([...media, ...newMedia])
    setShowUploader(false)
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!window.confirm('Delete this media?')) return
    try {
      await mediaService.delete(mediaId)
      setMedia(media.filter(m => m.id !== mediaId))
      if (selectedMediaIndex >= media.length - 1) {
        setSelectedMediaIndex(Math.max(0, media.length - 2))
      }
    } catch (err) {
      console.error('Failed to delete media:', err)
    }
  }

  const handleDelete = async () => {
    try {
      await apartmentService.delete(apartment.id)
      onDelete()
      onClose()
    } catch (err) {
      console.error('Failed to delete apartment:', err)
    }
  }

  const handleAddAmenity = async (name: string) => {
    try {
      const newAmenity = await apartmentService.addAmenity(apartment.id, name)
      setAmenities([...amenities, newAmenity])
    } catch (err) {
      console.error('Failed to add amenity:', err)
    }
  }

  const handleRemoveAmenity = async (amenityId: string) => {
    try {
      await apartmentService.deleteAmenity(amenityId)
      setAmenities(amenities.filter(a => a.id !== amenityId))
    } catch (err) {
      console.error('Failed to remove amenity:', err)
    }
  }

  const handleAddManyAmenities = async (names: string[]) => {
    try {
      const results = await Promise.all(
        names.map(name => apartmentService.addAmenity(apartment.id, name))
      )
      setAmenities(prev => [...prev, ...results])
    } catch (err) {
      console.error('Failed to add amenities:', err)
    }
  }

  const handleRemoveManyAmenities = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => apartmentService.deleteAmenity(id)))
      setAmenities(prev => prev.filter(a => !ids.includes(a.id)))
    } catch (err) {
      console.error('Failed to remove amenities:', err)
    }
  }

  const selectedMedia = media[selectedMediaIndex]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold truncate pr-4">{apartment.title}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="Edit apartment"
              >
                <Edit2 className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left: Media Gallery */}
            <div className="space-y-4">
              {/* Main Media Display */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                {selectedMedia ? (
                  selectedMedia.media_type === 'video' ? (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedMedia.url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <MapPin className="w-16 h-16" />
                  </div>
                )}

                {/* Navigation arrows */}
                {media.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedMediaIndex(i => (i - 1 + media.length) % media.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedMediaIndex(i => (i + 1) % media.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Delete media button */}
                {canEdit && selectedMedia && (
                  <button
                    onClick={() => handleDeleteMedia(selectedMedia.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {media.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {media.map((m, index) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMediaIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        index === selectedMediaIndex ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      {m.media_type === 'video' ? (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-500" />
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {canEdit && (
                <button
                  onClick={() => setShowUploader(!showUploader)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  + Add Photos/Videos
                </button>
              )}

              {/* Uploader */}
              {showUploader && (
                <MediaUploader
                  apartmentId={apartment.id}
                  onUploadComplete={handleMediaUpload}
                />
              )}

              {/* Amenities */}
              <AmenityPicker
                amenities={amenities}
                canEdit={canEdit}
                onAdd={handleAddAmenity}
                onRemove={handleRemoveAmenity}
                onAddMany={handleAddManyAmenities}
                onRemoveMany={handleRemoveManyAmenities}
              />
            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <div className="relative">
                      <input
                        ref={addressInputRef}
                        type="text"
                        required
                        value={editForm.address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        onFocus={() => setShowAddressSuggestions(true)}
                        placeholder="Search for an address..."
                        autoComplete="off"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {editForm.address && !addressSelected && (
                          <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                        )}
                        {addressSelected && editForm.address && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
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

                    {addressSelected && editForm.latitude && editForm.longitude && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Location updated on map
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent ($) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editForm.bedrooms}
                        onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editForm.bathrooms}
                        onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.square_feet}
                        onChange={(e) => setEditForm({ ...editForm, square_feet: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                      <input
                        type="text"
                        value={editForm.neighborhood}
                        onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date</label>
                    <input
                      type="date"
                      value={editForm.move_in_date}
                      onChange={(e) => setEditForm({ ...editForm, move_in_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Listing URL</label>
                    <input
                      type="url"
                      value={editForm.listing_url}
                      onChange={(e) => setEditForm({ ...editForm, listing_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setEditForm({
                          title: apartment.title,
                          address: apartment.address,
                          price: apartment.price.toString(),
                          bedrooms: apartment.bedrooms?.toString() || '',
                          bathrooms: apartment.bathrooms?.toString() || '',
                          square_feet: apartment.square_feet?.toString() || '',
                          neighborhood: apartment.neighborhood || '',
                          move_in_date: apartment.move_in_date || '',
                          listing_url: apartment.listing_url || '',
                          notes: apartment.notes || '',
                          latitude: apartment.latitude?.toString() || '',
                          longitude: apartment.longitude?.toString() || '',
                        })
                        setAddressSelected(true)
                        setAddressSuggestions([])
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving || !editForm.title || !editForm.address || !editForm.price}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Read-only Details */
                <>
                  {/* Status */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {canEdit ? (
                      <select
                        value={apartment.status || 'interested'}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border focus:ring-2 focus:ring-blue-500"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        statusOptions.find(s => s.value === apartment.status)?.color || 'bg-gray-100'
                      }`}>
                        {apartment.status}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-3xl font-bold text-gray-900 flex items-center">
                    <DollarSign className="w-8 h-8" />
                    {apartment.price.toLocaleString()}/mo
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{apartment.address}</span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {apartment.bedrooms !== undefined && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Bed className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <div className="font-semibold">{apartment.bedrooms}</div>
                        <div className="text-xs text-gray-500">Beds</div>
                      </div>
                    )}
                    {apartment.bathrooms !== undefined && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Bath className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <div className="font-semibold">{apartment.bathrooms}</div>
                        <div className="text-xs text-gray-500">Baths</div>
                      </div>
                    )}
                    {apartment.square_feet && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Square className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <div className="font-semibold">{apartment.square_feet.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Sq Ft</div>
                      </div>
                    )}
                  </div>

                  {/* Neighborhood */}
                  {apartment.neighborhood && (
                    <div className="text-sm text-gray-600">
                      Neighborhood: {apartment.neighborhood}
                    </div>
                  )}

                  {/* Move-in date */}
                  {apartment.move_in_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-5 h-5" />
                      Available {format(new Date(apartment.move_in_date), 'MMMM d, yyyy')}
                    </div>
                  )}

                  {/* Listing URL */}
                  {apartment.listing_url && (
                    <a
                      href={apartment.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Original Listing
                    </a>
                  )}

                  {/* Notes */}
                  {apartment.notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{apartment.notes}</p>
                    </div>
                  )}

                  {/* Commute Times */}
                  {commutes && commutes.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Commute Times</h4>
                      <CommuteTimes commutes={commutes} mode="full" apartmentLat={apartment.latitude} apartmentLng={apartment.longitude} />
                    </div>
                  )}

                  {/* Comments */}
                  <div className="border-t pt-4">
                    <CommentSection
                      apartmentId={apartment.id}
                      comments={comments}
                      currentUserId={currentUserId}
                      onCommentAdded={(comment) => setComments([...comments, comment])}
                      onCommentUpdated={(comment) => setComments(comments.map(c => c.id === comment.id ? comment : c))}
                      onCommentDeleted={(id) => setComments(comments.filter(c => c.id !== id))}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="border-t p-4 flex justify-between">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Apartment
            </button>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="font-semibold text-lg mb-2">Delete Apartment?</h3>
              <p className="text-gray-600 mb-4">
                This will permanently delete this apartment and all its photos, videos, and comments.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
