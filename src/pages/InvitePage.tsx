import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { projectService } from '../services/projectService'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'needs-auth' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    handleInvite()
  }, [token])

  const handleInvite = async () => {
    if (!token) {
      setStatus('error')
      setError('Invalid invite link')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Save invite path for post-login redirect
      localStorage.setItem('pendingInviteRedirect', `/invite/${token}`)
      setStatus('needs-auth')
      return
    }

    // User is authenticated — accept the invite
    try {
      const result = await projectService.acceptInvite(token)
      setProjectId(result.project_id)
      setStatus('success')
      // Auto-redirect after a brief moment
      setTimeout(() => {
        navigate(`/projects/${result.project_id}`)
      }, 1500)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Failed to accept invitation')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">haus note</h1>

        {status === 'loading' && (
          <div className="mt-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Accepting invitation...</p>
          </div>
        )}

        {status === 'needs-auth' && (
          <div className="mt-8">
            <p className="text-gray-600 mb-6">
              You've been invited to collaborate on a project. Sign in or create an account to accept.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Sign In to Accept
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-2">Invitation accepted!</p>
            <p className="text-gray-500 text-sm">Redirecting to project...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              to="/dashboard"
              className="text-blue-600 hover:underline text-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
