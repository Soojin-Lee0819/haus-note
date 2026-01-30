// src/services/projectService.ts
import { supabase } from '../lib/supabase'
import { Project, ProjectMember, ProjectInvitation } from '../types/database'

export const projectService = {
  // Get all user's projects
  async getUserProjects() {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        members:project_members(*)
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error
    if (!projects) return []

    // Get all unique user IDs from members
    const userIds = Array.from(new Set(
      projects.flatMap(p => p.members?.map((m: any) => m.user_id) || []).filter(Boolean)
    ))

    // Fetch user profiles
    let profileMap = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds)
      profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
    }

    // Map profiles to members
    return projects.map(project => ({
      ...project,
      members: project.members?.map((member: any) => ({
        ...member,
        user_profile: member.user_id ? profileMap.get(member.user_id) : undefined
      }))
    })) as Project[]
  },

  // Create new project
  async create(project: {
    name: string
    description?: string
    city?: string
    state?: string
    budget_min?: number
    budget_max?: number
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Project
  },

  // Get single project with all details
  async getById(projectId: string) {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        members:project_members(*)
      `)
      .eq('id', projectId)
      .single()

    if (error) throw error
    if (!project) throw new Error('Project not found')

    // Get user IDs from members
    const userIds = project.members?.map((m: any) => m.user_id).filter(Boolean) || []

    // Fetch user profiles
    let profileMap = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds)
      profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
    }

    // Map profiles to members
    return {
      ...project,
      members: project.members?.map((member: any) => ({
        ...member,
        user_profile: member.user_id ? profileMap.get(member.user_id) : undefined
      }))
    } as Project
  },

  // Update project
  async update(projectId: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) throw error
    return data as Project
  },

  // Delete project
  async delete(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) throw error
  },

  // Invite user to project
  async inviteUser(projectId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    const { data, error } = await supabase
      .from('project_invitations')
      .insert({
        project_id: projectId,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Return invitation link
    const inviteUrl = `${window.location.origin}/invite/${token}`
    return { ...data, inviteUrl }
  },

  // Get project members
  async getMembers(projectId: string) {
    const { data: members, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error
    if (!members || members.length === 0) return []

    // Get user IDs
    const userIds = members.map(m => m.user_id).filter(Boolean)

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return members.map(member => ({
      ...member,
      user_profile: member.user_id ? profileMap.get(member.user_id) : undefined
    })) as ProjectMember[]
  },

  // Remove member
  async removeMember(projectId: string, userId: string) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
    
    if (error) throw error
  },

  // Update member role
  async updateMemberRole(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer') {
    const { data, error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data as ProjectMember
  },

  // Get pending invitations for a project
  async getInvitations(projectId: string) {
    const { data, error } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('project_id', projectId)
      .or('accepted.eq.false,accepted.is.null')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as ProjectInvitation[]
  },

  // Cancel (delete) a pending invitation
  async cancelInvitation(invitationId: string) {
    const { error } = await supabase
      .from('project_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw error
  },

  // Accept an invitation using direct table operations (no RPC needed)
  async acceptInvite(token: string) {
    // 1. Look up the invitation by token
    const { data: invitation, error: fetchError } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !invitation) throw new Error('Invitation not found')
    if (invitation.accepted) throw new Error('Invitation has already been accepted')
    if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation has expired')

    // 2. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 3. Check if already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', invitation.project_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingMember) {
      // 4. Insert as new member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: invitation.project_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString()
        })

      if (insertError) throw insertError
    }

    // 5. Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('project_invitations')
      .update({ accepted: true })
      .eq('id', invitation.id)

    if (updateError) throw updateError

    return {
      project_id: invitation.project_id,
      role: existingMember?.role || invitation.role,
      already_member: !!existingMember
    }
  }
}