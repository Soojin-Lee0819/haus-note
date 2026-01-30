// src/components/ApartmentCard.tsx
import React from 'react'
import { MapPin, DollarSign, Bed, Bath, Calendar } from 'lucide-react'
import { Apartment } from '../types/database'
import { format } from 'date-fns'

interface ApartmentCardProps {
  apartment: Apartment
  onClick: () => void
}

const statusColors: Record<string, string> = {
  interested: 'bg-blue-100 text-blue-800',
  visited: 'bg-purple-100 text-purple-800',
  applied: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  accepted: 'bg-green-100 text-green-800',
}

export function ApartmentCard({ apartment, onClick }: ApartmentCardProps) {
  const firstPhoto = apartment.media?.find(m => m.media_type === 'photo')

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="h-48 bg-gray-200 relative">
        {firstPhoto?.url ? (
          <img
            src={firstPhoto.url}
            alt={apartment.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <MapPin className="w-12 h-12" />
          </div>
        )}

        {/* Status badge */}
        {apartment.status && (
          <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[apartment.status] || 'bg-gray-100 text-gray-800'}`}>
            {apartment.status}
          </span>
        )}

      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 truncate">
          {apartment.title}
        </h3>

        <p className="text-gray-500 text-sm flex items-center gap-1 mt-1 truncate">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          {apartment.address}
        </p>

        {/* Price */}
        <p className="text-xl font-bold text-gray-900 mt-2 flex items-center">
          <DollarSign className="w-5 h-5" />
          {apartment.price.toLocaleString()}/mo
        </p>

        {/* Details */}
        <div className="flex items-center gap-4 mt-3 text-gray-600 text-sm">
          {apartment.bedrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {apartment.bedrooms} bed
            </span>
          )}
          {apartment.bathrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {apartment.bathrooms} bath
            </span>
          )}
          {apartment.square_feet && (
            <span>{apartment.square_feet.toLocaleString()} sqft</span>
          )}
        </div>

        {/* Move-in date */}
        {apartment.move_in_date && (
          <p className="text-gray-500 text-sm mt-2 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Available {format(new Date(apartment.move_in_date), 'MMM d, yyyy')}
          </p>
        )}

        {/* Neighborhood */}
        {apartment.neighborhood && (
          <p className="text-gray-400 text-xs mt-2">
            {apartment.neighborhood}
          </p>
        )}
      </div>
    </div>
  )
}
