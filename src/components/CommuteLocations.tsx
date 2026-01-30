// src/components/CommuteLocations.tsx
import React, { useState } from 'react'
import { Plus, X, MapPin, Briefcase, GraduationCap, Dumbbell, Home, Loader2 } from 'lucide-react'
import { CommuteLocation } from '../types/database'
import { commuteService } from '../services/commuteService'

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

  const handleAdd = async () => {
    if (!newName.trim() || !newAddress.trim()) return

    setAdding(true)
    try {
      const location = await commuteService.addLocation({
        project_id: projectId,
        name: newName.trim(),
        address: newAddress.trim(),
        icon: newIcon
      })

      onLocationsChange([...locations, location])
      setNewName('')
      setNewAddress('')
      setNewIcon('work')
      setShowAddForm(false)

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

  const handleDelete = async (locationId: string) => {
    if (!window.confirm('Remove this commute location?')) return

    setDeleting(locationId)
    try {
      await commuteService.deleteLocation(locationId)
      onLocationsChange(locations.filter(l => l.id !== locationId))
    } catch (err) {
      console.error('Failed to delete location:', err)
    } finally {
      setDeleting(null)
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
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(location.id) }}
                  disabled={deleting === location.id}
                  className="ml-1 p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {deleting === location.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
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
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g., Work)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {iconOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Address (e.g., 350 5th Ave, New York, NY)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
                setNewAddress('')
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim() || !newAddress.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
