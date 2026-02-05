// src/components/ClusterCarousel.tsx
import React from 'react'
import { X } from 'lucide-react'
import { Apartment } from '../types/database'

interface ClusterCarouselProps {
  apartments: Apartment[]
  onSelect: (apartment: Apartment) => void
  onClose: () => void
}

export function ClusterCarousel({ apartments, onSelect, onClose }: ClusterCarouselProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)] animate-slide-up z-10"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm font-semibold text-gray-700">
          {apartments.length} apartments at this location
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable cards */}
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {apartments.map(apt => {
          const photo = (apt.media || []).find(m => m.media_type === 'photo' && m.url)
          return (
            <button
              key={apt.id}
              onClick={() => onSelect(apt)}
              className="flex-shrink-0 w-[200px] sm:w-[220px] bg-gray-50 rounded-lg overflow-hidden text-left hover:bg-gray-100 transition-colors border border-gray-200"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="flex p-3 gap-3">
                {/* Thumbnail */}
                <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                  {photo ? (
                    <img
                      src={photo.url!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No photo
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {apt.title}
                  </div>
                  <div className="text-sm font-bold text-gray-800 mt-0.5">
                    ${apt.price.toLocaleString()}<span className="text-xs font-normal text-gray-500">/mo</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {[
                      apt.bedrooms !== undefined ? `${apt.bedrooms}bd` : null,
                      apt.bathrooms !== undefined ? `${apt.bathrooms}ba` : null,
                    ].filter(Boolean).join(' / ')}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
