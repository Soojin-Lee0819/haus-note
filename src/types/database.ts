// src/types/database.ts
// Auto-synced with Supabase schema

export interface UserProfile {
  id: string
  name?: string
  phone?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  city?: string
  state?: string
  country?: string
  budget_min?: number
  budget_max?: number
  target_move_in_date?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  // Relationships
  members?: ProjectMember[]
  apartments?: Apartment[]
}

export interface ProjectMember {
  id: string
  project_id?: string
  user_id?: string
  role?: 'owner' | 'editor' | 'viewer'
  invited_by?: string
  invited_at?: string
  accepted_at?: string
  // Relationships
  user_profile?: UserProfile
}

export interface ProjectInvitation {
  id: string
  project_id?: string
  email: string
  role?: 'owner' | 'editor' | 'viewer'
  invited_by?: string
  token: string
  expires_at: string
  accepted?: boolean
  created_at?: string
}

export interface Apartment {
  id: string
  project_id?: string
  added_by?: string
  title: string
  address: string
  latitude?: number
  longitude?: number
  price: number
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  move_in_date?: string
  viewed_date?: string
  notes?: string
  neighborhood?: string
  listing_url?: string
  status?: 'interested' | 'visited' | 'applied' | 'rejected' | 'accepted'
  rating?: number
  created_at?: string
  updated_at?: string
  // Relationships
  media?: ApartmentMedia[]
  comments?: ApartmentComment[]
  brokers?: Broker[]
  amenities?: Amenity[]
  added_by_profile?: UserProfile
}

export interface ApartmentMedia {
  id: string
  apartment_id?: string
  uploaded_by?: string
  media_type: 'photo' | 'video'
  storage_path: string
  file_name?: string
  file_size?: number
  mime_type?: string
  width?: number
  height?: number
  duration?: number // for videos
  caption?: string
  order_index?: number
  uploaded_at?: string
  // Computed (not in DB)
  url?: string
}

export interface ApartmentComment {
  id: string
  apartment_id?: string
  user_id?: string
  comment: string
  created_at?: string
  updated_at?: string
  // Relationships
  user_profile?: UserProfile
}

export interface Broker {
  id: string
  project_id?: string
  name: string
  email?: string
  phone?: string
  company?: string
  created_at?: string
}

export interface ApartmentBroker {
  apartment_id: string
  broker_id: string
}

export interface Amenity {
  id: string
  apartment_id?: string
  name: string
  has_amenity?: boolean
}

export interface ActivityLog {
  id: string
  project_id?: string
  user_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at?: string
}

// Helper types for forms and uploads
export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  mediaId?: string
}

export interface CommuteLocation {
  id: string
  project_id?: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  icon?: string
  created_at?: string
  created_by?: string
}

export interface ApartmentCommute {
  id: string
  apartment_id?: string
  location_id?: string
  duration_driving?: number  // seconds
  duration_transit?: number  // seconds
  duration_walking?: number  // seconds
  duration_bicycling?: number  // seconds
  distance_meters?: number
  calculated_at?: string
  // Joined data
  location?: CommuteLocation
}

export interface Feedback {
  id: string
  user_id?: string
  display_name?: string
  title: string
  description?: string
  category: 'bug' | 'feature' | 'general'
  status: 'open' | 'in_progress' | 'done'
  vote_count: number
  image_path?: string
  image_url?: string
  created_at?: string
  comment_count?: number
}

export interface FeedbackComment {
  id: string
  feedback_id: string
  user_id?: string
  comment: string
  created_at?: string
  updated_at?: string
  user_profile?: UserProfile
}

export interface FeedbackVote {
  feedback_id: string
  user_id: string
  created_at?: string
}

// Type aliases for backwards compatibility
export type Media = ApartmentMedia
export type Comment = ApartmentComment
