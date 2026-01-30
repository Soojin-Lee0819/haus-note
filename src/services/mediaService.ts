// src/services/mediaService.ts
import { supabase } from '../lib/supabase'
import { ApartmentMedia } from '../types/database'

const PHOTO_BUCKET = 'apartment-photos'
const VIDEO_BUCKET = 'apartment-videos'

export const mediaService = {
  // Get the appropriate bucket based on media type
  getBucket(mediaType: 'photo' | 'video'): string {
    return mediaType === 'video' ? VIDEO_BUCKET : PHOTO_BUCKET
  },

  // Upload media file to Supabase Storage
  async upload(
    apartmentId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApartmentMedia> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Determine media type based on file MIME type
    const mediaType: 'photo' | 'video' = file.type.startsWith('video/') ? 'video' : 'photo'
    const bucket = this.getBucket(mediaType)

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${apartmentId}/${crypto.randomUUID()}.${fileExt}`

    // Upload to appropriate Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get next order index
    const { data: existingMedia } = await supabase
      .from('apartment_media')
      .select('order_index')
      .eq('apartment_id', apartmentId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingMedia && existingMedia.length > 0
      ? (existingMedia[0].order_index || 0) + 1
      : 0

    // Create media record in database
    const { data, error } = await supabase
      .from('apartment_media')
      .insert({
        apartment_id: apartmentId,
        uploaded_by: user.id,
        media_type: mediaType,
        storage_path: fileName,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        order_index: nextOrderIndex
      })
      .select()
      .single()

    if (error) throw error

    // Return with public URL
    return this.addPublicUrl(data)
  },

  // Upload multiple files
  async uploadMultiple(
    apartmentId: string,
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<ApartmentMedia[]> {
    const results: ApartmentMedia[] = []

    for (let i = 0; i < files.length; i++) {
      const media = await this.upload(
        apartmentId,
        files[i],
        (progress) => onProgress?.(i, progress)
      )
      results.push(media)
    }

    return results
  },

  // Get all media for an apartment
  async getByApartment(apartmentId: string) {
    const { data, error } = await supabase
      .from('apartment_media')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data.map(media => this.addPublicUrl(media)) as ApartmentMedia[]
  },

  // Get single media item
  async getById(mediaId: string) {
    const { data, error } = await supabase
      .from('apartment_media')
      .select('*')
      .eq('id', mediaId)
      .single()

    if (error) throw error
    return this.addPublicUrl(data)
  },

  // Update media caption
  async updateCaption(mediaId: string, caption: string) {
    const { data, error } = await supabase
      .from('apartment_media')
      .update({ caption })
      .eq('id', mediaId)
      .select()
      .single()

    if (error) throw error
    return this.addPublicUrl(data)
  },

  // Update media order
  async updateOrder(mediaId: string, orderIndex: number) {
    const { data, error } = await supabase
      .from('apartment_media')
      .update({ order_index: orderIndex })
      .eq('id', mediaId)
      .select()
      .single()

    if (error) throw error
    return this.addPublicUrl(data)
  },

  // Reorder all media for an apartment
  async reorderMedia(apartmentId: string, mediaIds: string[]) {
    const updates = mediaIds.map((id, index) => ({
      id,
      order_index: index
    }))

    for (const update of updates) {
      await supabase
        .from('apartment_media')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
    }

    return this.getByApartment(apartmentId)
  },

  // Delete media
  async delete(mediaId: string) {
    // Get media record first to get storage path and type
    const { data: media, error: fetchError } = await supabase
      .from('apartment_media')
      .select('storage_path, media_type')
      .eq('id', mediaId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage using correct bucket
    if (media?.storage_path) {
      const bucket = this.getBucket(media.media_type as 'photo' | 'video')
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([media.storage_path])

      if (storageError) console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error } = await supabase
      .from('apartment_media')
      .delete()
      .eq('id', mediaId)

    if (error) throw error
  },

  // Delete all media for an apartment
  async deleteAllForApartment(apartmentId: string) {
    // Get all media records with their types
    const { data: mediaList, error: fetchError } = await supabase
      .from('apartment_media')
      .select('storage_path, media_type')
      .eq('apartment_id', apartmentId)

    if (fetchError) throw fetchError

    // Group by media type and delete from respective buckets
    if (mediaList && mediaList.length > 0) {
      const photos = mediaList
        .filter(m => m.media_type === 'photo' && m.storage_path)
        .map(m => m.storage_path) as string[]

      const videos = mediaList
        .filter(m => m.media_type === 'video' && m.storage_path)
        .map(m => m.storage_path) as string[]

      if (photos.length > 0) {
        await supabase.storage.from(PHOTO_BUCKET).remove(photos)
      }
      if (videos.length > 0) {
        await supabase.storage.from(VIDEO_BUCKET).remove(videos)
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('apartment_media')
      .delete()
      .eq('apartment_id', apartmentId)

    if (error) throw error
  },

  // Generate public URL for media
  getPublicUrl(storagePath: string, mediaType: 'photo' | 'video'): string {
    const bucket = this.getBucket(mediaType)
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    return data.publicUrl
  },

  // Add public URL to media object
  addPublicUrl(media: ApartmentMedia): ApartmentMedia {
    const mediaType = media.media_type as 'photo' | 'video'
    return {
      ...media,
      url: media.storage_path
        ? this.getPublicUrl(media.storage_path, mediaType)
        : undefined
    }
  }
}
