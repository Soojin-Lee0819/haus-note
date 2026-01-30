// src/components/AmenityPicker.tsx
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Amenity } from '../types/database'

const PRESET_AMENITIES: { name: string; emoji: string }[] = [
  { name: 'Gym', emoji: '\u{1F3CB}\u{FE0F}' },
  { name: 'Parking', emoji: '\u{1F17F}\u{FE0F}' },
  { name: 'Balcony', emoji: '\u{1F307}' },
  { name: 'Elevator', emoji: '\u{1F6D7}' },
  { name: 'Doorman', emoji: '\u{1F6AA}' },
  { name: 'Laundry in Building', emoji: '\u{1F455}' },
  { name: 'Dishwasher', emoji: '\u{1F37D}\u{FE0F}' },
  { name: 'Concierge', emoji: '\u{1F514}' },
  { name: 'Bike Room', emoji: '\u{1F6B2}' },
  { name: 'Package Room', emoji: '\u{1F4E6}' },
  { name: 'Swimming Pool', emoji: '\u{1F3CA}' },
  { name: "Children's Playroom", emoji: '\u{1F9D2}' },
]

interface AmenityPickerProps {
  amenities: Amenity[]
  canEdit: boolean
  onAdd: (name: string) => void
  onRemove: (amenityId: string) => void
}

export function AmenityPicker({ amenities, canEdit, onAdd, onRemove }: AmenityPickerProps) {
  const [customInput, setCustomInput] = useState('')

  const activeNames = new Set(amenities.map(a => a.name))

  const customAmenities = amenities.filter(
    a => !PRESET_AMENITIES.some(p => p.name === a.name)
  )

  const handleAddCustom = () => {
    const name = customInput.trim()
    if (!name) return
    if (activeNames.has(name)) return
    onAdd(name)
    setCustomInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    }
  }

  if (!canEdit) {
    const activeAmenities = amenities.filter(a => a.has_amenity !== false)
    if (activeAmenities.length === 0) return null

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>
        <div className="flex flex-wrap gap-2">
          {activeAmenities.map(a => {
            const preset = PRESET_AMENITIES.find(p => p.name === a.name)
            return (
              <span
                key={a.id}
                className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {preset ? `${preset.emoji} ` : ''}{a.name}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>

      {/* Preset amenity pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_AMENITIES.map(preset => {
          const existing = amenities.find(a => a.name === preset.name)
          const isActive = !!existing

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                if (isActive) {
                  onRemove(existing!.id)
                } else {
                  onAdd(preset.name)
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {preset.emoji} {preset.name}
            </button>
          )
        })}
      </div>

      {/* Custom amenity input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add custom amenity..."
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>

      {/* Custom amenity pills */}
      {customAmenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customAmenities.map(a => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {a.name}
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                className="hover:text-blue-950 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
