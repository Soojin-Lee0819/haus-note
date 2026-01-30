// src/services/activityService.ts
import { supabase } from '../lib/supabase'
import { ActivityLog } from '../types/database'

export const activityService = {
  // Log an activity
  async log(activity: {
    project_id: string
    action: string
    entity_type?: string
    entity_id?: string
    details?: Record<string, unknown>
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        ...activity,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data as ActivityLog
  },

  // Get activity log for a project
  async getByProject(projectId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as (ActivityLog & { user_profile?: { name?: string; avatar_url?: string } })[]
  },

  // Get activity for a specific entity
  async getByEntity(entityType: string, entityId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as (ActivityLog & { user_profile?: { name?: string; avatar_url?: string } })[]
  },

  // Get recent activity for a user across all projects
  async getByUser(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as ActivityLog[]
  },

  // Helper methods for common actions
  async logApartmentCreated(projectId: string, apartmentId: string, apartmentTitle: string) {
    return this.log({
      project_id: projectId,
      action: 'apartment_created',
      entity_type: 'apartment',
      entity_id: apartmentId,
      details: { title: apartmentTitle }
    })
  },

  async logApartmentUpdated(projectId: string, apartmentId: string, changes: Record<string, unknown>) {
    return this.log({
      project_id: projectId,
      action: 'apartment_updated',
      entity_type: 'apartment',
      entity_id: apartmentId,
      details: changes
    })
  },

  async logApartmentStatusChanged(projectId: string, apartmentId: string, oldStatus: string, newStatus: string) {
    return this.log({
      project_id: projectId,
      action: 'status_changed',
      entity_type: 'apartment',
      entity_id: apartmentId,
      details: { old_status: oldStatus, new_status: newStatus }
    })
  },

  async logCommentAdded(projectId: string, apartmentId: string, commentId: string) {
    return this.log({
      project_id: projectId,
      action: 'comment_added',
      entity_type: 'apartment',
      entity_id: apartmentId,
      details: { comment_id: commentId }
    })
  },

  async logMediaUploaded(projectId: string, apartmentId: string, mediaCount: number) {
    return this.log({
      project_id: projectId,
      action: 'media_uploaded',
      entity_type: 'apartment',
      entity_id: apartmentId,
      details: { count: mediaCount }
    })
  },

  async logMemberInvited(projectId: string, email: string, role: string) {
    return this.log({
      project_id: projectId,
      action: 'member_invited',
      entity_type: 'project',
      entity_id: projectId,
      details: { email, role }
    })
  },

  async logMemberJoined(projectId: string, userId: string, userName: string) {
    return this.log({
      project_id: projectId,
      action: 'member_joined',
      entity_type: 'project',
      entity_id: projectId,
      details: { user_id: userId, name: userName }
    })
  }
}
