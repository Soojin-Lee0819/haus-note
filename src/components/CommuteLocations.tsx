// src/components/CommuteLocations.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, MapPin, Briefcase, GraduationCap, Dumbbell, Home, Loader2, Check, RefreshCw, Pencil, AlertTriangle } from 'lucide-react'
import { CommuteLocation } from '../types/database'
import { commuteService } from '../services/commuteService'
import { loadGoogleMaps } from '../lib/googleMaps'
import { geocodeService } from '../services/geocodeService'

interface CommuteLocationsProps {
  projectId: string
  locations: CommuteLocation[]
  canEdit: boolean
  onLocationsChange: (locations: CommuteLocation[]) => void
  onCommutesRecalculated?: () => void
}

const iconOptions = [
  { id: 'work', icon: Briefcase, label: 'Work' },
  { id: 'school', icon: GraduationCap, label: 'School' },
  { id: 'gym', icon: Dumbbell, label: 'Gym' },
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'other', icon: MapPin, label: 'Other' },
]

export function CommuteLocations({
  projectId,
  locations,
  canEdit,
  onLocationsChange,
  onCommutesRecalculated
}: CommuteLocationsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newIcon, setNewIcon] = useState('work')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CommuteLocation | null>(null)

  // Edit mode state
  const [editingLocation, setEditingLocation] = useState<CommuteLocation | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editIcon, setEditIcon] = useState('work')
  const [editAddressSelected, setEditAddressSelected] = useState(false)
  const [editCoordinates, setEditCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [updating, setUpdating] = useState(false)

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [addressSelected, setAddressSelected] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load Google Places API
  useEffect(() => {
    if (!showAddForm && !editingLocation) return

    loadGoogleMaps().then(() => setIsGoogleLoaded(true)).catch(console.error)
  }, [showAddForm, editingLocation])

  // Initialize services when Google is loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [isGoogleLoaded])

  // Fetch address suggestions
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim() || input.length < 2) {
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
      console.error('Error fetching suggestions:', err)
      setAddressSuggestions([])
    }
  }, [])

  // Debounced input handler
  useEffect(() => {
    if (addressSelected) return

    const timer = setTimeout(() => {
      if (newAddress) {
        fetchSuggestions(newAddress)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [newAddress, fetchSuggestions, addressSelected])

  // Handle selecting a suggestion
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['formatted_address', 'geometry', 'name'],
        },
        (place, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const address = place.formatted_address || prediction.description
            const name = place.name || ''

            setNewAddress(address)
            setAddressSelected(true)
            setAddressSuggestions([])
            setShowSuggestions(false)

            // Auto-fill name if empty
            if (!newName.trim() && name) {
              setNewName(name)
            }

            // Store coordinates
            if (place.geometry?.location) {
              setCoordinates({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              })
            }
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
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddressChange = (value: string) => {
    setNewAddress(value)
    setAddressSelected(false)
    setCoordinates(null)
    setShowSuggestions(true)
  }

  const handleAdd = async () => {
    if (!newName.trim() || !newAddress.trim()) return

    setAdding(true)
    try {
      const location = await commuteService.addLocation({
        project_id: projectId,
        name: newName.trim(),
        address: newAddress.trim(),
        icon: newIcon,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
      })

      onLocationsChange([...locations, location])
      setNewName('')
      setNewAddress('')
      setNewIcon('work')
      setShowAddForm(false)
      setAddressSelected(false)
      setCoordinates(null)

      // Recalculate commutes for all apartments in background
      commuteService.recalculateCommutesForProject(projectId)
        .then(() => onCommutesRecalculated?.())
        .catch(console.error)
    } catch (err) {
      console.error('Failed to add location:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (location: CommuteLocation) => {
    setConfirmDelete(location)
  }

  const confirmDeleteLocation = async () => {
    if (!confirmDelete) return

    setDeleting(confirmDelete.id)
    try {
      await commuteService.deleteLocation(confirmDelete.id)
      onLocationsChange(locations.filter(l => l.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      console.error('Failed to delete location:', err)
    } finally {
      setDeleting(null)
    }
  }

  // Re-geocode a location to fix incorrect coordinates
  const handleRefreshLocation = async (location: CommuteLocation) => {
    if (!location.address) return

    setRefreshing(location.id)
    try {
      const geocoded = await geocodeService.geocodeAddress(location.address)
      if (geocoded) {
        const updated = await commuteService.updateLocation(location.id, {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        })
        onLocationsChange(locations.map(l => l.id === location.id ? updated : l))

        // Recalculate commutes with new coordinates
        commuteService.recalculateCommutesForProject(projectId)
          .then(() => onCommutesRecalculated?.())
          .catch(console.error)
      }
    } catch (err) {
      console.error('Failed to refresh location:', err)
    } finally {
      setRefreshing(null)
    }
  }

  // Start editing a location
  const startEditing = (location: CommuteLocation) => {
    setEditingLocation(location)
    setEditName(location.name)
    setEditAddress(location.address || '')
    setEditIcon(location.icon || 'other')
    setEditAddressSelected(true) // Assume existing address is valid
    setEditCoordinates(
      location.latitude && location.longitude
        ? { lat: Number(location.latitude), lng: Number(location.longitude) }
        : null
    )
    setShowAddForm(false) // Close add form if open
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingLocation(null)
    setEditName('')
    setEditAddress('')
    setEditIcon('work')
    setEditAddressSelected(false)
    setEditCoordinates(null)
    setAddressSuggestions([])
  }

  // Handle edit address change
  const handleEditAddressChange = (value: string) => {
    setEditAddress(value)
    setEditAddressSelected(false)
    setEditCoordinates(null)
    setShowSuggestions(true)
    // Trigger suggestions fetch
    if (value.length >= 2) {
      fetchSuggestions(value)
    }
  }

  // Handle selecting a suggestion for edit
  const handleEditSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['formatted_address', 'geometry', 'name'],
        },
        (place, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const address = place.formatted_address || prediction.description

            setEditAddress(address)
            setEditAddressSelected(true)
            setAddressSuggestions([])
            setShowSuggestions(false)

            // Store coordinates
            if (place.geometry?.location) {
              setEditCoordinates({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              })
            }
          }
        }
      )
    } catch (err) {
      console.error('Error getting place details:', err)
    }
  }

  // Save the edited location
  const handleSaveEdit = async () => {
    if (!editingLocation || !editName.trim() || !editAddress.trim()) return

    setUpdating(true)
    try {
      const updates: Partial<CommuteLocation> = {
        name: editName.trim(),
        address: editAddress.trim(),
        icon: editIcon,
      }

      // Only update coordinates if we have new ones
      if (editCoordinates) {
        updates.latitude = editCoordinates.lat
        updates.longitude = editCoordinates.lng
      }

      const updated = await commuteService.updateLocation(editingLocation.id, updates)
      onLocationsChange(locations.map(l => l.id === editingLocation.id ? updated : l))
      cancelEditing()

      // Recalculate commutes with potentially new coordinates
      commuteService.recalculateCommutesForProject(projectId)
        .then(() => onCommutesRecalculated?.())
        .catch(console.error)
    } catch (err) {
      console.error('Failed to update location:', err)
    } finally {
      setUpdating(false)
    }
  }

  const getIcon = (iconId: string | undefined) => {
    const found = iconOptions.find(o => o.id === iconId)
    return found?.icon || MapPin
  }

  return (
    <div className="space-y-3">
      {/* Location Pills */}
      <div className="flex flex-wrap gap-2">
        {locations.map(location => {
          const Icon = getIcon(location.icon)
          return (
            <div
              key={location.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm group"
            >
              <Icon className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">{location.name}</span>
              {canEdit && (
                <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(location) }}
                    className="p-0.5 text-gray-400 hover:text-accent"
                    title="Edit location"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshLocation(location) }}
                    disabled={refreshing === location.id}
                    className="p-0.5 text-gray-400 hover:text-blue-500"
                    title="Refresh location coordinates"
                  >
                    {refreshing === location.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(location) }}
                    disabled={deleting === location.id}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                    title="Delete location"
                  >
                    {deleting === location.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Button */}
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-full text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          {/* Address Input with Autocomplete - First */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Search for a place</label>
            <div className="relative">
              <input
                ref={addressInputRef}
                type="text"
                value={newAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search places, addresses..."
                autoComplete="off"
                autoFocus
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {newAddress && !addressSelected && (
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                )}
                {addressSelected && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto"
              >
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
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

          {/* Selected location indicator */}
          {addressSelected && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 truncate flex-1">{newAddress}</span>
              <button
                type="button"
                onClick={() => {
                  setNewAddress('')
                  setAddressSelected(false)
                  setCoordinates(null)
                  addressInputRef.current?.focus()
                }}
                className="p-0.5 text-green-600 hover:text-green-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Name and Icon Row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Label</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Work, Gym, Mom's house"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Icon</label>
              <select
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
              >
                {iconOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
                setNewAddress('')
                setAddressSelected(false)
                setCoordinates(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim() || !addressSelected}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Location
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingLocation && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Edit Location</span>
            <button
              onClick={cancelEditing}
              className="p-1 text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Address Input with Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
            <div className="relative">
              <input
                type="text"
                value={editAddress}
                onChange={(e) => handleEditAddressChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search places, addresses..."
                autoComplete="off"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {editAddress && !editAddressSelected && (
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                )}
                {editAddressSelected && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            {/* Suggestions Dropdown for Edit */}
            {showSuggestions && addressSuggestions.length > 0 && editingLocation && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleEditSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
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

          {/* Selected location indicator */}
          {editAddressSelected && editAddress && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 truncate flex-1">{editAddress}</span>
              <button
                type="button"
                onClick={() => {
                  setEditAddress('')
                  setEditAddressSelected(false)
                  setEditCoordinates(null)
                }}
                className="p-0.5 text-green-600 hover:text-green-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Name and Icon Row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Label</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Work, Gym, Mom's house"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Icon</label>
              <select
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
              >
                {iconOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updating || !editName.trim() || !editAddressSelected}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Remove location?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to remove <strong>{confirmDelete.name}</strong> from your commute locations? This will also remove commute times calculated for this location.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLocation}
                disabled={deleting === confirmDelete.id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting === confirmDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
