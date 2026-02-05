import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, Plus, X, ArrowLeft, ImagePlus, MoreHorizontal, Pencil, Trash2, Search, MessageCircle, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { feedbackService } from '../services/feedbackService'
import { Feedback, FeedbackComment } from '../types/database'

type CategoryFilter = 'all' | 'feature' | 'bug' | 'general'
type SortOption = 'votes' | 'newest'

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortOption>('votes')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [session, setSession] = useState<any>(null)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, categoryFilter])

  useEffect(() => {
    if (session) {
      feedbackService.getUserVotes().then(setUserVotes).catch(console.error)
    }
  }, [session])

  const loadFeedback = async () => {
    try {
      const category = categoryFilter === 'all' ? undefined : categoryFilter
      const data = await feedbackService.getAll(sort, category)
      setFeedbacks(data)
    } catch (error) {
      console.error('Error loading feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (feedbackId: string) => {
    if (!session) {
      navigate('/login')
      return
    }

    if (votingId) return
    setVotingId(feedbackId)

    try {
      const added = await feedbackService.toggleVote(feedbackId)
      setUserVotes(prev => {
        const next = new Set(prev)
        if (added) {
          next.add(feedbackId)
        } else {
          next.delete(feedbackId)
        }
        return next
      })
      // Update local count
      setFeedbacks(prev =>
        prev.map(f =>
          f.id === feedbackId
            ? { ...f, vote_count: f.vote_count + (added ? 1 : -1) }
            : f
        )
      )
    } catch (error) {
      console.error('Error toggling vote:', error)
    } finally {
      setVotingId(null)
    }
  }

  const handleNewFeedback = () => {
    if (!session) {
      navigate('/login')
      return
    }
    setShowNewForm(true)
  }

  const handleCreated = (feedback: Feedback) => {
    setFeedbacks(prev => [feedback, ...prev])
    setShowNewForm(false)
  }

  const handleDelete = async (feedbackId: string) => {
    try {
      await feedbackService.delete(feedbackId)
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
    } catch (error) {
      console.error('Error deleting feedback:', error)
    }
  }

  const handleUpdated = (updated: Feedback) => {
    setFeedbacks(prev => prev.map(f => f.id === updated.id ? updated : f))
  }

  const currentUserId = session?.user?.id

  const CATEGORIES: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'feature', label: 'Feature' },
    { key: 'bug', label: 'Bug' },
    { key: 'general', label: 'General' },
  ]

  const SORTS: { key: SortOption; label: string }[] = [
    { key: 'votes', label: 'Most voted' },
    { key: 'newest', label: 'Newest' },
  ]

  const filteredFeedbacks = searchQuery.trim()
    ? feedbacks.filter(f => {
        const q = searchQuery.toLowerCase()
        return f.title.toLowerCase().includes(q) || (f.description?.toLowerCase().includes(q))
      })
    : feedbacks

  const categoryBadge = (category: string) => {
    switch (category) {
      case 'feature':
        return 'bg-blue-100 text-blue-700'
      case 'bug':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 text-[#666] hover:text-[#1A1A1A] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <a
              href="/"
              className="text-xl font-bold text-[#1A1A1A] hover:opacity-80 transition-opacity"
            >
              haus note
            </a>
          </div>

          <div>
            {session ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
          {/* Title + New button */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-bold text-2xl sm:text-3xl text-[#1A1A1A]">Feedback</h1>
              <p className="text-sm text-[#666] mt-1">Help us improve Haus Note</p>
            </div>
            <button
              onClick={handleNewFeedback}
              className="flex items-center gap-1.5 bg-accent text-white pl-3.5 pr-4 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Filters + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategoryFilter(c.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === c.key
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-white text-[#666] border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    sort === s.key
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-white text-[#666] border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#999] hover:text-[#666] hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Feedback List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent"></div>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#999] text-sm">
                {searchQuery ? 'No feedback matching your search.' : 'No feedback yet. Be the first to share!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedbacks.map(feedback => {
                const isOwner = currentUserId && feedback.user_id === currentUserId
                return (
                  <div
                    key={feedback.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-4">
                      {/* Upvote button */}
                      <button
                        onClick={() => handleVote(feedback.id)}
                        disabled={votingId === feedback.id}
                        className={`flex flex-col items-center justify-center min-w-[48px] py-2 rounded-lg border transition-colors ${
                          userVotes.has(feedback.id)
                            ? 'border-accent bg-accent/5 text-accent'
                            : 'border-gray-200 text-[#999] hover:border-gray-300 hover:text-[#666]'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="text-sm font-semibold">{feedback.vote_count}</span>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-[#1A1A1A] text-base leading-snug">
                            {feedback.title}
                          </h3>
                          {isOwner && (
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={() => setMenuOpenId(menuOpenId === feedback.id ? null : feedback.id)}
                                className="p-1 text-[#ccc] hover:text-[#666] hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {menuOpenId === feedback.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[140px]">
                                    <button
                                      onClick={() => {
                                        setMenuOpenId(null)
                                        setEditingFeedback(feedback)
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-[#999]" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMenuOpenId(null)
                                        if (window.confirm('Delete this feedback?')) {
                                          handleDelete(feedback.id)
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {feedback.description && (
                          <p className="text-sm text-[#666] mt-1 line-clamp-2">
                            {feedback.description}
                          </p>
                        )}
                        {feedback.image_url && (
                          <img
                            src={feedback.image_url}
                            alt=""
                            className="mt-2 rounded-lg max-h-48 object-cover border border-gray-100"
                          />
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryBadge(feedback.category)}`}
                          >
                            {feedback.category}
                          </span>
                          <span className="text-xs text-[#999]">
                            {timeAgo(feedback.created_at)}
                          </span>
                          <span className="text-xs text-[#999]">
                            {feedback.display_name || 'Anonymous'}
                          </span>
                          <button
                            onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                            className={`flex items-center gap-1 text-xs ml-auto transition-colors ${
                              expandedId === feedback.id ? 'text-accent' : 'text-[#999] hover:text-[#666]'
                            }`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {(feedback.comment_count ?? 0) > 0 && (
                              <span>{feedback.comment_count}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Comment Section */}
                    {expandedId === feedback.id && (
                      <FeedbackCommentSection
                        feedbackId={feedback.id}
                        currentUserId={currentUserId}
                        isLoggedIn={!!session}
                        onNavigateLogin={() => navigate('/login')}
                        onCommentCountChange={(delta) => {
                          setFeedbacks(prev =>
                            prev.map(f =>
                              f.id === feedback.id
                                ? { ...f, comment_count: (f.comment_count ?? 0) + delta }
                                : f
                            )
                          )
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* New Feedback Modal */}
      {showNewForm && (
        <NewFeedbackForm
          onClose={() => setShowNewForm(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Edit Feedback Modal */}
      {editingFeedback && (
        <EditFeedbackForm
          feedback={editingFeedback}
          onClose={() => setEditingFeedback(null)}
          onUpdated={(updated) => {
            handleUpdated(updated)
            setEditingFeedback(null)
          }}
        />
      )}
    </div>
  )
}

/* ─── New Feedback Form Modal ─── */
function NewFeedbackForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (feedback: Feedback) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('feature')
  const [anonymous, setAnonymous] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const CATEGORY_OPTIONS = [
    { key: 'feature', label: 'Feature' },
    { key: 'bug', label: 'Bug' },
    { key: 'general', label: 'General' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setError('')
    setSubmitting(true)

    try {
      const feedback = await feedbackService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        anonymous,
        image: image || undefined,
      })
      onCreated(feedback)
    } catch (err: any) {
      console.error('Error creating feedback:', err)
      setError(err.message || 'Failed to submit feedback')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl px-5 sm:px-6 pt-4 pb-8 animate-slide-up sm:animate-fade-in">
        {/* Handle - Mobile only */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Close button - Desktop */}
        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-4 right-4 p-1 text-[#666] hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="font-bold text-xl text-[#1A1A1A]">New Feedback</h2>
          <p className="text-sm text-[#666] mt-1">Share a bug, idea, or suggestion</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="What's on your mind?"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">
                Description <span className="text-[#999] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none"
                placeholder="Add more details..."
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Category</label>
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      category === c.key
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-white text-[#666] border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">
                Screenshot <span className="text-[#999] font-normal">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="rounded-xl max-h-40 object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null) }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
                  >
                    <X className="w-3.5 h-3.5 text-[#666]" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <ImagePlus className="w-5 h-5 text-[#999]" />
                  <span className="text-sm text-[#666]">Add a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImage(file)
                        setImagePreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Anonymous checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent/30"
              />
              <span className="text-sm text-[#666]">Post anonymously</span>
            </label>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3.5 border border-gray-200 rounded-xl font-medium text-[#666] hover:bg-gray-50 active:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex-1 bg-accent text-white py-3.5 px-6 rounded-xl font-semibold text-base active:bg-accent-dark hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Edit Feedback Form Modal ─── */
function EditFeedbackForm({
  feedback,
  onClose,
  onUpdated,
}: {
  feedback: Feedback
  onClose: () => void
  onUpdated: (feedback: Feedback) => void
}) {
  const [title, setTitle] = useState(feedback.title)
  const [description, setDescription] = useState(feedback.description || '')
  const [category, setCategory] = useState(feedback.category)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const CATEGORY_OPTIONS = [
    { key: 'feature', label: 'Feature' },
    { key: 'bug', label: 'Bug' },
    { key: 'general', label: 'General' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setError('')
    setSaving(true)

    try {
      const updated = await feedbackService.update(feedback.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
      })
      onUpdated(updated)
    } catch (err: any) {
      console.error('Error updating feedback:', err)
      setError(err.message || 'Failed to update feedback')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl px-5 sm:px-6 pt-4 pb-8 animate-slide-up sm:animate-fade-in">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-4 right-4 p-1 text-[#666] hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="font-bold text-xl text-[#1A1A1A]">Edit Feedback</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">
                Description <span className="text-[#999] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Category</label>
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      category === c.key
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-white text-[#666] border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3.5 border border-gray-200 rounded-xl font-medium text-[#666] hover:bg-gray-50 active:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-accent text-white py-3.5 px-6 rounded-xl font-semibold text-base active:bg-accent-dark hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Feedback Comment Section ─── */
function FeedbackCommentSection({
  feedbackId,
  currentUserId,
  isLoggedIn,
  onNavigateLogin,
  onCommentCountChange,
}: {
  feedbackId: string
  currentUserId?: string
  isLoggedIn: boolean
  onNavigateLogin: () => void
  onCommentCountChange: (delta: number) => void
}) {
  const [comments, setComments] = useState<FeedbackComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    feedbackService.getComments(feedbackId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [feedbackId])

  const handleAdd = async () => {
    if (!isLoggedIn) { onNavigateLogin(); return }
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const comment = await feedbackService.addComment(feedbackId, newComment.trim())
      setComments(prev => [...prev, comment])
      setNewComment('')
      onCommentCountChange(1)
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (commentId: string) => {
    if (!editText.trim()) return
    try {
      const updated = await feedbackService.updateComment(commentId, editText.trim())
      setComments(prev => prev.map(c => c.id === commentId ? updated : c))
      setEditingId(null)
    } catch (err) {
      console.error('Error updating comment:', err)
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await feedbackService.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      onCommentCountChange(-1)
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-accent"></div>
        </div>
      ) : (
        <>
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="space-y-3 mb-3">
              {comments.map(comment => {
                const isOwner = currentUserId && comment.user_id === currentUserId
                return (
                  <div key={comment.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {comment.user_profile?.avatar_url ? (
                        <img src={comment.user_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-[#666]">
                          {(comment.user_profile?.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#1A1A1A]">
                          {comment.user_profile?.name || 'User'}
                        </span>
                        <span className="text-xs text-[#999]">{timeAgo(comment.created_at)}</span>
                        {isOwner && editingId !== comment.id && (
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => { setEditingId(comment.id); setEditText(comment.comment) }}
                              className="p-0.5 text-[#ccc] hover:text-[#666] transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="p-0.5 text-[#ccc] hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingId === comment.id ? (
                        <div className="mt-1 flex gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(comment.id); if (e.key === 'Escape') setEditingId(null) }}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdate(comment.id)}
                            className="text-xs text-accent font-medium hover:text-accent-dark"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-[#999] font-medium hover:text-[#666]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-[#666] mt-0.5">{comment.comment}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder={isLoggedIn ? 'Add a comment...' : 'Log in to comment'}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              disabled={!isLoggedIn}
            />
            <button
              onClick={handleAdd}
              disabled={!newComment.trim() || submitting}
              className="p-2 text-accent hover:bg-accent/5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
