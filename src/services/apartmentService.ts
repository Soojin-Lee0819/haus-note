// src/services/apartmentService.ts
import { supabase } from '../lib/supabase'
import { Apartment, ApartmentComment, Amenity, Broker } from '../types/database'
import { mediaService } from './mediaService'

function resolveMediaUrls(apartment: Apartment): Apartment {
  if (!apartment.media) return apartment
  return {
    ...apartment,
    media: apartment.media.map(m => mediaService.addPublicUrl(m)),
  }
}

export const apartmentService = {
  // Get all apartments for a project
  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('apartments')
      .select(`
        *,
        media:apartment_media(*),
        comments:apartment_comments(*),
        amenities(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as Apartment[]).map(resolveMediaUrls)
  },

  // Get single apartment with all details
  async getById(apartmentId: string) {
    const { data, error } = await supabase
      .from('apartments')
      .select(`
        *,
        media:apartment_media(*),
        comments:apartment_comments(*),
        amenities(*)
      `)
      .eq('id', apartmentId)
      .single()

    if (error) throw error
    return resolveMediaUrls(data as Apartment)
  },

  // Create new apartment
  async create(apartment: {
    project_id: string
    title: string
    address: string
    price: number
    latitude?: number
    longitude?: number
    bedrooms?: number
    bathrooms?: number
    square_feet?: number
    move_in_date?: string
    notes?: string
    neighborhood?: string
    listing_url?: string
    status?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('apartments')
      .insert({
        ...apartment,
        added_by: user.id,
        status: apartment.status || 'interested'
      })
      .select()
      .single()

    if (error) throw error
    return data as Apartment
  },

  // Update apartment
  async update(apartmentId: string, updates: Partial<Apartment>) {
    const { data, error } = await supabase
      .from('apartments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', apartmentId)
      .select()
      .single()

    if (error) throw error
    return data as Apartment
  },

  // Delete apartment
  async delete(apartmentId: string) {
    const { error } = await supabase
      .from('apartments')
      .delete()
      .eq('id', apartmentId)

    if (error) throw error
  },

  // Update apartment status
  async updateStatus(apartmentId: string, status: Apartment['status']) {
    return this.update(apartmentId, { status })
  },

  // Add comment to apartment
  async addComment(apartmentId: string, comment: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('apartment_comments')
      .insert({
        apartment_id: apartmentId,
        user_id: user.id,
        comment
      })
      .select('*')
      .single()

    if (error) throw error

    // Fetch user profile separately
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return { ...data, user_profile: profile } as ApartmentComment
  },

  // Update comment
  async updateComment(commentId: string, comment: string) {
    const { data, error } = await supabase
      .from('apartment_comments')
      .update({
        comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data as ApartmentComment
  },

  // Delete comment
  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from('apartment_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  },

  // Get comments for apartment
  async getComments(apartmentId: string) {
    const { data: comments, error } = await supabase
      .from('apartment_comments')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!comments || comments.length === 0) return []

    // Get unique user IDs
    const userIds = Array.from(new Set(comments.map(c => c.user_id).filter(Boolean)))

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds)

    // Map profiles to comments
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return comments.map(comment => ({
      ...comment,
      user_profile: comment.user_id ? profileMap.get(comment.user_id) : undefined
    })) as ApartmentComment[]
  },

  // Add amenity
  async addAmenity(apartmentId: string, name: string, hasAmenity: boolean = true) {
    const { data, error } = await supabase
      .from('amenities')
      .insert({
        apartment_id: apartmentId,
        name,
        has_amenity: hasAmenity
      })
      .select()
      .single()

    if (error) throw error
    return data as Amenity
  },

  // Update amenity
  async updateAmenity(amenityId: string, hasAmenity: boolean) {
    const { data, error } = await supabase
      .from('amenities')
      .update({ has_amenity: hasAmenity })
      .eq('id', amenityId)
      .select()
      .single()

    if (error) throw error
    return data as Amenity
  },

  // Delete amenity
  async deleteAmenity(amenityId: string) {
    const { error } = await supabase
      .from('amenities')
      .delete()
      .eq('id', amenityId)

    if (error) throw error
  },

  // Get amenities for apartment
  async getAmenities(apartmentId: string) {
    const { data, error } = await supabase
      .from('amenities')
      .select('*')
      .eq('apartment_id', apartmentId)

    if (error) throw error
    return data as Amenity[]
  },

  // Link broker to apartment
  async linkBroker(apartmentId: string, brokerId: string) {
    const { error } = await supabase
      .from('apartment_brokers')
      .insert({
        apartment_id: apartmentId,
        broker_id: brokerId
      })

    if (error) throw error
  },

  // Unlink broker from apartment
  async unlinkBroker(apartmentId: string, brokerId: string) {
    const { error } = await supabase
      .from('apartment_brokers')
      .delete()
      .eq('apartment_id', apartmentId)
      .eq('broker_id', brokerId)

    if (error) throw error
  },

  // Get brokers for apartment
  async getBrokers(apartmentId: string) {
    const { data, error } = await supabase
      .from('apartment_brokers')
      .select(`
        broker:brokers(*)
      `)
      .eq('apartment_id', apartmentId)

    if (error) throw error
    return (data || []).map(item => (item as any).broker).filter(Boolean) as Broker[]
  }
}
