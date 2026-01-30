// src/components/ApartmentListItem.tsx
import React from 'react'
import { Apartment, ApartmentCommute } from '../types/database'
import { format } from 'date-fns'
import { CommuteTimes } from './CommuteTimes'

interface ApartmentListItemProps {
  apartment: Apartment
  commutes?: ApartmentCommute[]
  onClick: () => void
  isSelected?: boolean
}

export function ApartmentListItem({ apartment, commutes, onClick, isSelected }: ApartmentListItemProps) {
  const firstPhoto = apartment.media?.find(m => m.media_type === 'photo')

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}k`
    }
    return `$${price}`
  }

  return (
    <div
      onClick={onClick}
      className={`flex gap-4 p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      {/* Photo */}
      <div className="w-[200px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
        {firstPhoto?.url ? (
          <img
            src={firstPhoto.url}
            alt={apartment.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg text-gray-900">
            {apartment.title}
          </h3>
          {apartment.move_in_date && (
            <span className="text-sm text-gray-500 flex-shrink-0">
              move in: {format(new Date(apartment.move_in_date), 'd, MMM')}
            </span>
          )}
        </div>

        <div className="border-t border-gray-200 my-2 w-12"></div>

        {/* Neighborhood */}
        {apartment.neighborhood && (
          <p className="text-sm text-gray-600">
            Neighborhood: {apartment.neighborhood}
          </p>
        )}

        {/* Notes */}
        {apartment.notes && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            Note: {apartment.notes}
          </p>
        )}

        {/* Commute times */}
        {commutes && commutes.length > 0 && (
          <div className="mt-2">
            <CommuteTimes commutes={commutes} mode="compact" />
          </div>
        )}

        {/* Bottom row */}
        <div className="flex justify-between items-end mt-3">
          <div className="text-sm text-gray-600">
            {apartment.bedrooms !== undefined && apartment.bathrooms !== undefined && (
              <span>{apartment.bedrooms} Bed, {apartment.bathrooms} Bath</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl font-semibold text-gray-900">
              {formatPrice(apartment.price)}
            </span>
            <span className="text-gray-500 text-sm ml-1">/mo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
