// src/pages/ProjectDashboard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, ArrowRight, Search, Home, GitCompare, X, ChevronRight } from 'lucide-react'
import { projectService } from '../services/projectService'
import { authService } from '../services/authService'
import { Project } from '../types/database'

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectService.getUserProjects()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent"></div>
      </div>
    )
  }

  const isFirstTime = projects.length === 0

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="font-serif text-xl font-bold">haus note</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-[#666]"
        >
          Sign Out
        </button>
      </header>

      {isFirstTime ? (
        <FirstTimeView
          onCreated={(project) => navigate(`/projects/${project.id}`)}
        />
      ) : (
        <ProjectsView
          projects={projects}
          onNavigate={(id) => navigate(`/projects/${id}`)}
          showNewProject={showNewProject}
          setShowNewProject={setShowNewProject}
          onCreated={(project) => {
            setShowNewProject(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}
    </div>
  )
}

/* ─── First-Time User Experience (Mobile-First) ─── */
function FirstTimeView({ onCreated }: { onCreated: (project: Project) => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const project = await projectService.create({
        name,
        city: city || undefined,
        state: state || undefined,
      })
      onCreated(project)
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex flex-col px-5 py-6">
      {/* Welcome */}
      <div className="text-center mb-8">
        <h1 className="font-serif font-bold text-2xl mb-2">
          Welcome to haus note
        </h1>
        <p className="text-[#666] text-sm">
          Let's set up your first apartment search
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Name your search
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              placeholder="NYC Apartment Hunt"
              required
              autoFocus
            />
            <p className="text-xs text-[#999] mt-2">
              e.g., "Brooklyn 2BR" or "SF Search"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="NY"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* How it works - compact */}
        <div className="my-8 py-6 border-t border-b border-gray-100">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">How it works</p>
          <div className="space-y-3">
            {[
              { Icon: Search, text: 'Create a project for your search' },
              { Icon: Home, text: 'Add apartments as you view them' },
              { Icon: GitCompare, text: 'Compare and decide together' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-[#666]">
                <Icon className="w-4 h-4 text-[#999]" strokeWidth={1.5} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-auto">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-accent text-white py-4 rounded-xl font-semibold text-base active:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : (
              <>
                Start finding apartments
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}

/* ─── Projects List (Mobile-First) ─── */
function ProjectsView({
  projects,
  onNavigate,
  showNewProject,
  setShowNewProject,
  onCreated,
}: {
  projects: Project[]
  onNavigate: (id: string) => void
  showNewProject: boolean
  setShowNewProject: (v: boolean) => void
  onCreated: (project: Project) => void
}) {
  return (
    <>
      <main className="flex-1 px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif font-bold text-xl">My Projects</h1>
          <button
            onClick={() => setShowNewProject(true)}
            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center active:bg-accent-dark"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onNavigate(project.id)}
              className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-4 active:bg-gray-100 text-left"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#1A1A1A] mb-0.5 truncate">
                  {project.name}
                </h3>
                {project.city && (
                  <p className="text-sm text-[#666] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {project.city}{project.state ? `, ${project.state}` : ''}
                  </p>
                )}
                {project.budget_min && project.budget_max && (
                  <p className="text-xs text-[#999] mt-1">
                    ${project.budget_min.toLocaleString()} – ${project.budget_max.toLocaleString()}/mo
                  </p>
                )}
              </div>

              {/* Member avatars */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {project.members?.slice(0, 2).map((member) => (
                    <div
                      key={member.id}
                      className="w-7 h-7 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center"
                    >
                      <span className="text-xs font-medium text-[#666]">
                        {member.user_profile?.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  ))}
                </div>
                <ChevronRight className="w-5 h-5 text-[#ccc]" />
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* New Project Sheet (Mobile Bottom Sheet Style) */}
      {showNewProject && (
        <NewProjectSheet
          onClose={() => setShowNewProject(false)}
          onCreated={onCreated}
        />
      )}
    </>
  )
}

/* ─── New Project Sheet (Mobile Bottom Sheet) ─── */
function NewProjectSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const project = await projectService.create({
        name,
        city: city || undefined,
        state: state || undefined,
      })
      onCreated(project)
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-white rounded-t-2xl px-5 pt-4 pb-8 animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">New Project</h2>
          <button onClick={onClose} className="p-1 text-[#666]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              placeholder="NYC Apartment Hunt"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="NY"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-accent text-white py-4 rounded-xl font-semibold text-base active:bg-accent-dark disabled:opacity-40"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}
