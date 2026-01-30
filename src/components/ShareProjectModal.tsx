import React, { useState, useEffect } from 'react'
import { X, Copy, Check, Trash2 } from 'lucide-react'
import { projectService } from '../services/projectService'
import { ProjectMember, ProjectInvitation } from '../types/database'

interface ShareProjectModalProps {
  projectId: string
  currentUserId: string
  userRole: string
  onClose: () => void
}

export function ShareProjectModal({ projectId, currentUserId, userRole, onClose }: ShareProjectModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const isOwner = userRole === 'owner'

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoadingMembers(true)
    try {
      const [membersData, invitationsData] = await Promise.all([
        projectService.getMembers(projectId),
        projectService.getInvitations(projectId)
      ])
      setMembers(membersData)
      setInvitations(invitationsData)
    } catch (err) {
      console.error('Failed to load share data:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteLink('')

    try {
      const result = await projectService.inviteUser(projectId, email, role)
      setInviteLink(result.inviteUrl)
      setEmail('')
      // Refresh invitations list
      const updated = await projectService.getInvitations(projectId)
      setInvitations(updated)
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRoleChange = async (userId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    try {
      await projectService.updateMemberRole(projectId, userId, newRole)
      setMembers(members.map(m =>
        m.user_id === userId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the project?')) return
    try {
      await projectService.removeMember(projectId, userId)
      setMembers(members.filter(m => m.user_id !== userId))
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await projectService.cancelInvitation(invitationId)
      setInvitations(invitations.filter(i => i.id !== invitationId))
    } catch (err) {
      console.error('Failed to cancel invitation:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Share Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite section */}
          <div>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>

            {inviteError && (
              <p className="mt-2 text-sm text-red-600">{inviteError}</p>
            )}

            {inviteLink && (
              <div className="mt-3 flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Members ({members.length})
            </h3>
            {loadingMembers ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {member.user_profile?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.user_profile?.name || 'Unknown'}
                          {member.user_id === currentUserId && (
                            <span className="text-gray-400 ml-1">(you)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && member.user_id !== currentUserId ? (
                        <>
                          <select
                            value={member.role || 'viewer'}
                            onChange={(e) => handleRoleChange(member.user_id!, e.target.value as any)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="owner">Owner</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.user_id!)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                            title="Remove member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 capitalize">{member.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Pending Invitations
              </h3>
              <div className="space-y-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">{inv.email}</p>
                      <p className="text-xs text-gray-500">
                        {inv.role} &middot; expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
