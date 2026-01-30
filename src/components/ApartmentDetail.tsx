// src/components/ApartmentDetail.tsx
import React, { useState, useEffect } from 'react'
import {
  X, MapPin, DollarSign, Bed, Bath, Square, Calendar, ExternalLink,
  ChevronLeft, ChevronRight, Trash2, Play, Edit2
} from 'lucide-react'
import { Apartment, ApartmentMedia, ApartmentComment, ApartmentCommute, Amenity } from '../types/database'
import { apartmentService, mediaService } from '../services'
import { MediaUploader } from './MediaUploader'
import { CommentSection } from './CommentSection'
import { CommuteTimes } from './CommuteTimes'
import { AmenityPicker } from './AmenityPicker'
import { format } from 'date-fns'

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
  })

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
      const updated = await apartmentService.update(apartment.id, {
        title: editForm.title,
        address: editForm.address,
        price: parseFloat(editForm.price),
        bedrooms: editForm.bedrooms ? parseFloat(editForm.bedrooms) : undefined,
        bathrooms: editForm.bathrooms ? parseFloat(editForm.bathrooms) : undefined,
        square_feet: editForm.square_feet ? parseInt(editForm.square_feet) : undefined,
        neighborhood: editForm.neighborhood || undefined,
        move_in_date: editForm.move_in_date || undefined,
        listing_url: editForm.listing_url || undefined,
        notes: editForm.notes || undefined,
      })
      const merged = { ...apartment, ...updated }
      setApartment(merged)
      onUpdate(merged)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update apartment:', err)
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <input
                      type="text"
                      required
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                        })
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
