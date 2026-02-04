import React, { useState } from 'react'
import { MessageSquarePlus, X, Send, ImagePlus } from 'lucide-react'
import { feedbackService } from '../services/feedbackService'

const CATEGORIES = [
  { key: 'feature', label: 'Feature request' },
  { key: 'bug', label: 'Bug report' },
  { key: 'general', label: 'General' },
]

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTitle('')
    setDescription('')
    setCategory('general')
    setImage(null)
    setImagePreview(null)
    setError('')
    setSubmitted(false)
  }

  const handleClose = () => {
    setOpen(false)
    // Reset after close animation
    setTimeout(reset, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setError('')
    setSubmitting(true)

    try {
      await feedbackService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        anonymous: false,
        image: image || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-tour-target="feedback"
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 bg-[#1A1A1A] text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-lg hover:bg-[#333] active:scale-95 transition-all text-sm font-medium"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
        >
          <MessageSquarePlus className="w-4 h-4" />
          Feedback
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={handleClose}
          />

          <div
            className="fixed bottom-0 left-0 right-0 sm:bottom-5 sm:left-5 sm:right-auto z-50 sm:w-[360px]"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
          >
            <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up sm:animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#999]" />
                  <span className="font-semibold text-sm text-[#1A1A1A]">Share Feedback</span>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 text-[#999] hover:text-[#666] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitted ? (
                /* Success state */
                <div className="p-5 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[#1A1A1A] mb-1">Thanks for your feedback!</p>
                  <p className="text-sm text-[#666] mb-4">We read every submission.</p>
                  <button
                    onClick={handleClose}
                    className="text-sm text-accent font-medium hover:underline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                  {/* Category pills */}
                  <div className="flex gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          category === c.key
                            ? 'bg-[#1A1A1A] text-white'
                            : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Title */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    placeholder="Title"
                    required
                    autoFocus
                  />

                  {/* Description */}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none"
                    placeholder="Tell us more... (optional)"
                    rows={3}
                  />

                  {/* Image upload */}
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="rounded-lg max-h-28 object-cover border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => { setImage(null); setImagePreview(null) }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
                      >
                        <X className="w-3 h-3 text-[#666]" />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#999] hover:text-[#666] cursor-pointer transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      Attach screenshot
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

                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
