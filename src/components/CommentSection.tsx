// src/components/CommentSection.tsx
import React, { useState } from 'react'
import { Send, Trash2, Edit2, X, Check } from 'lucide-react'
import { ApartmentComment } from '../types/database'
import { apartmentService } from '../services'
import { formatDistanceToNow } from 'date-fns'

interface CommentSectionProps {
  apartmentId: string
  comments: ApartmentComment[]
  currentUserId: string
  onCommentAdded: (comment: ApartmentComment) => void
  onCommentUpdated: (comment: ApartmentComment) => void
  onCommentDeleted: (commentId: string) => void
}

export function CommentSection({
  apartmentId,
  comments,
  currentUserId,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const comment = await apartmentService.addComment(apartmentId, newComment.trim())
      onCommentAdded(comment)
      setNewComment('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return

    try {
      const updated = await apartmentService.updateComment(commentId, editText.trim())
      onCommentUpdated(updated)
      setEditingId(null)
      setEditText('')
    } catch (err) {
      console.error('Failed to update comment:', err)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return

    try {
      await apartmentService.deleteComment(commentId)
      onCommentDeleted(commentId)
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  const startEditing = (comment: ApartmentComment) => {
    setEditingId(comment.id)
    setEditText(comment.comment)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">
        Comments ({comments.length})
      </h3>

      {/* Comment List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                    {comment.user_profile?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="font-medium text-sm text-gray-900">
                      {comment.user_profile?.name || 'Unknown'}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {comment.created_at &&
                        formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {comment.user_id === currentUserId && editingId !== comment.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(comment)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Comment text or edit field */}
              {editingId === comment.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(comment.id)}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-gray-700 text-sm">
                  {comment.comment}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
