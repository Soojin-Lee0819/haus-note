// src/App.tsx
import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { LandingPage } from './pages/LandingPage'
import { WaitlistPage } from './pages/WaitlistPage'
import { ProjectDashboard } from './pages/ProjectDashboard'
import { ProjectPage } from './pages/ProjectPage'
import { InvitePage } from './pages/InvitePage'
import { FeedbackPage } from './pages/FeedbackPage'
import { FeedbackWidget } from './components/FeedbackWidget'

// Set to true to show waitlist page instead of login
// In production, set REACT_APP_WAITLIST_MODE=true in Vercel env vars
const WAITLIST_MODE = process.env.REACT_APP_WAITLIST_MODE === 'true'

function PostAuthRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const pending = localStorage.getItem('pendingInviteRedirect')
    if (pending) {
      localStorage.removeItem('pendingInviteRedirect')
      navigate(pending, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])
  return null
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <FeedbackWidget />
      <Routes>
        <Route
          path="/"
          element={
            WAITLIST_MODE
              ? <WaitlistPage />
              : (session ? <PostAuthRedirect /> : <LandingPage />)
          }
        />
        <Route
          path="/login"
          element={session ? <PostAuthRedirect /> : <LandingPage />}
        />
        <Route 
          path="/dashboard" 
          element={session ? <ProjectDashboard /> : <Navigate to="/" />} 
        />
        <Route
          path="/projects/:projectId"
          element={session ? <ProjectPage /> : <Navigate to="/" />}
        />
        <Route
          path="/feedback"
          element={<FeedbackPage />}
        />
        <Route
          path="/invite/:token"
          element={<InvitePage />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
