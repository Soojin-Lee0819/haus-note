// src/components/AddApartmentModal.tsx
import React, { useState } from 'react'
import { X, MapPin, Loader2, Check, ImagePlus } from 'lucide-react'
import { apartmentService, mediaService } from '../services'
import { geocodeService } from '../services/geocodeService'
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

  const handleAddressBlur = async () => {
    if (!formData.address || formData.address.length < 5) return
    if (formData.latitude && formData.longitude) return // Already geocoded

    setGeocoding(true)
    setGeocoded(false)

    try {
      const result = await geocodeService.geocodeAddress(formData.address)
      if (result) {
        setFormData(prev => ({
          ...prev,
          latitude: result.latitude.toString(),
          longitude: result.longitude.toString(),
        }))
        setGeocoded(true)
      }
    } catch (err) {
      console.error('Geocoding failed:', err)
    } finally {
      setGeocoding(false)
    }
  }

  const handleAddressChange = (value: string) => {
    setFormData({
      ...formData,
      address: value,
      latitude: '', // Clear coordinates when address changes
      longitude: '',
    })
    setGeocoded(false)
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
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    setSelectedPhotos(prev => [...prev, ...newFiles])
    setPhotoPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
    e.target.value = '' // allow re-selecting same file
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

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos
            </label>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors text-sm text-gray-600">
              <ImagePlus className="w-4 h-4" />
              {photoPreviews.length === 0 ? 'Add Photos' : 'Add More'}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotosSelected}
                className="hidden"
              />
            </label>
          </div>

          {/* Address with geocoding indicator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={handleAddressBlur}
                placeholder="123 Main St, New York, NY"
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
                {!geocoding && !geocoded && formData.address && (
                  <MapPin className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
            {geocoded && (
              <p className="text-xs text-green-600 mt-1">
                Location found on map
              </p>
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
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Apartment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
