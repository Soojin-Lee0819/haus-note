// src/pages/ProjectDashboard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, ArrowRight, Search, Home, GitCompare, X, ChevronRight, User, LogOut, Pencil, Trash2, AlertTriangle, MessageSquare } from 'lucide-react'
import { projectService } from '../services/projectService'
import { authService } from '../services/authService'
import { Project } from '../types/database'
import { loadGoogleMaps } from '../lib/googleMaps'

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showEditAccount, setShowEditAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userInitial, setUserInitial] = useState('')
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
    loadUserInfo()
  }, [])

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const loadUserInfo = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        setUserEmail(user.email || '')
        const profile = await authService.getProfile(user.id)
        const name = profile?.name || user.user_metadata?.name || ''
        setUserName(name)
        setUserInitial((name || user.email || '?')[0].toUpperCase())
      }
    } catch {
      // Silently fail — user info is non-critical
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header - hidden during onboarding */}
      <header className={`bg-white border-b border-gray-100 ${isFirstTime ? 'hidden' : ''}`}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-[#1A1A1A] cursor-default flex items-center gap-2">
            <img src="/house-logo.png" alt="" className="w-6 h-6" />
            haus note
          </span>

          {/* Account icon + dropdown */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu(prev => !prev)}
              className="w-9 h-9 rounded-full bg-[#F5F5F5] hover:bg-[#EBEBEB] flex items-center justify-center transition-colors border border-gray-200"
              title="Account"
            >
              {userInitial ? (
                <span className="text-sm font-semibold text-[#666]">{userInitial}</span>
              ) : (
                <User className="w-4 h-4 text-[#666]" />
              )}
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 animate-fade-in">
                {userEmail && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-[#999] truncate">{userEmail}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    navigate('/feedback')
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#999]" />
                  Share Feedback
                </button>
                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    setShowEditAccount(true)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-[#999]" />
                  Edit Account
                </button>
                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-[#999]" />
                  Sign Out
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowAccountMenu(false)
                      setShowDeleteConfirm(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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

      {/* Edit Account Modal */}
      {showEditAccount && (
        <EditAccountModal
          currentName={userName}
          currentEmail={userEmail}
          onClose={() => setShowEditAccount(false)}
          onSaved={(name, email) => {
            setUserName(name)
            setUserEmail(email)
            setUserInitial((name || email || '?')[0].toUpperCase())
            setShowEditAccount(false)
          }}
        />
      )}

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <DeleteAccountConfirm
          onClose={() => setShowDeleteConfirm(false)}
          onDeleted={() => navigate('/')}
        />
      )}
    </div>
  )
}

/* ─── Onboarding Flow Types ─── */
type OnboardingStep =
  | 'walkthrough-choice'
  | 'tour-1'
  | 'tour-2'
  | 'tour-3'
  | 'tour-4'
  | 'survey-usecase'
  | 'survey-location'

type UseCase =
  | 'solo'
  | 'partner'
  | 'helping'
  | 'exploring'
  | null

const TOUR_SLIDES = [
  {
    id: 'tour-1',
    title: 'Track every apartment',
    description: 'Add photos, notes & details for each place you view',
    gifPlaceholder: 'apartment-tracking.gif',
    video: '/images/tour-add-apartment.mp4',
  },
  {
    id: 'tour-2',
    title: 'Compare side by side',
    description: 'See all your options at a glance and make better decisions',
    gifPlaceholder: 'compare-apartments.gif',
    video: '/images/tour-compare.mp4',
  },
  {
    id: 'tour-3',
    title: 'Hunt together',
    description: 'Invite partners or roommates to collaborate in real-time',
    gifPlaceholder: 'collaborate.gif',
    video: '/images/tour-hunt-together.mp4',
  },
  {
    id: 'tour-4',
    title: 'Calculate commute times',
    description: 'See how far each place is from work, gym, or anywhere',
    gifPlaceholder: 'commute-times.gif',
    video: '/images/tour-commute.mp4',
  },
]

const USE_CASE_OPTIONS = [
  { id: 'solo', label: 'Apartment hunting for myself' },
  { id: 'partner', label: 'Searching with a partner or roommate' },
  { id: 'helping', label: 'Helping someone else find a place' },
  { id: 'exploring', label: 'Just exploring' },
]

/* ─── First-Time User Experience (Mobile-First) ─── */
function FirstTimeView({ onCreated }: { onCreated: (project: Project) => void }) {
  const [step, setStep] = useState<OnboardingStep>('walkthrough-choice')
  const [, setShowTour] = useState(false)
  const [, setUseCase] = useState<UseCase>(null)
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleWalkthroughChoice = (wantsTour: boolean) => {
    setShowTour(wantsTour)
    setStep(wantsTour ? 'tour-1' : 'survey-usecase')
  }

  const handleTourNext = () => {
    const tourSteps: OnboardingStep[] = ['tour-1', 'tour-2', 'tour-3', 'tour-4']
    const currentIndex = tourSteps.indexOf(step)
    if (currentIndex < tourSteps.length - 1) {
      setStep(tourSteps[currentIndex + 1])
    } else {
      setStep('survey-usecase')
    }
  }

  const handleUseCaseSelect = (selected: UseCase) => {
    setUseCase(selected)
    setStep('survey-location')
  }

  const handleCreateProject = async () => {
    if (!city.trim()) return

    setError('')
    setLoading(true)

    try {
      const projectName = `${city.trim()} house`
      const project = await projectService.create({
        name: projectName,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      })
      onCreated(project)
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
      setLoading(false)
    }
  }

  // Get current tour slide index for progress dots
  const getCurrentTourIndex = () => {
    const tourSteps: OnboardingStep[] = ['tour-1', 'tour-2', 'tour-3', 'tour-4']
    return tourSteps.indexOf(step)
  }

  const isSurveyStep = step === 'survey-usecase' || step === 'survey-location'

  return (
    <main className="flex-1 flex flex-col relative">
      {/* Walkthrough Choice */}
      {step === 'walkthrough-choice' && (
        <WalkthroughChoice onChoice={handleWalkthroughChoice} />
      )}

      {/* Feature Tour */}
      {step.startsWith('tour-') && (
        <FeatureTourSlide
          slide={TOUR_SLIDES[getCurrentTourIndex()]}
          currentIndex={getCurrentTourIndex()}
          totalSlides={TOUR_SLIDES.length}
          onNext={handleTourNext}
        />
      )}

      {/* Survey Steps - Show dashboard background with modal overlay */}
      {isSurveyStep && (
        <>
          {/* Dashboard-like background */}
          <DashboardBackground />

          {/* Survey Modal Overlay */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-slide-up">
              {step === 'survey-usecase' && (
                <SurveyUseCase onSelect={handleUseCaseSelect} />
              )}
              {step === 'survey-location' && (
                <SurveyLocation
                  city={city}
                  setCity={setCity}
                  state={state}
                  setState={setState}
                  loading={loading}
                  error={error}
                  onSubmit={handleCreateProject}
                />
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}

/* ─── Dashboard Background (shown during survey) ─── */
function DashboardBackground() {
  return (
    <div className="flex-1 px-5 py-6 opacity-50 pointer-events-none">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-xl">My Projects</h1>
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
      </div>

      {/* Placeholder project cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
            <div className="w-7 h-7 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Walkthrough Choice Screen ─── */
function WalkthroughChoice({ onChoice }: { onChoice: (wantsTour: boolean) => void }) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Left side - Question */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-12 lg:py-12 lg:max-w-md">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center">
            <img src="/house-logo.png" alt="haus note" className="w-10 h-10" />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <h1 className="font-bold text-2xl lg:text-3xl text-[#1A1A1A] leading-tight">
            Do you want a walkthrough of<br />haus note?
          </h1>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={() => onChoice(true)}
            className="w-full text-left px-5 py-4 border border-gray-200 rounded-xl hover:border-gray-300 active:bg-gray-50 transition-colors"
          >
            <span className="text-[#1A1A1A] text-base">Yes, show me around</span>
          </button>
          <button
            onClick={() => onChoice(false)}
            className="w-full text-left px-5 py-4 border border-gray-200 rounded-xl hover:border-gray-300 active:bg-gray-50 transition-colors"
          >
            <span className="text-[#1A1A1A] text-base">Nah, I'll figure it out</span>
          </button>
        </div>
      </div>

      {/* Right side - Demo Video */}
      <div className="hidden lg:flex flex-[1.4] bg-gradient-to-br from-rose-50 to-orange-50 items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="relative w-full max-w-3xl">
          <video
            src="/images/hausnote-demo.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-2xl shadow-2xl border border-white/60"
          />
        </div>
      </div>

      {/* Mobile: Demo Video */}
      <div className="flex-1 lg:hidden flex items-center justify-center p-4">
        <div className="w-full">
          <video
            src="/images/hausnote-demo.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-xl shadow-lg border border-gray-200/80"
          />
        </div>
      </div>
    </div>
  )
}


/* ─── Feature Tour Slide ─── */
function FeatureTourSlide({
  slide,
  currentIndex,
  totalSlides,
  onNext,
}: {
  slide: typeof TOUR_SLIDES[0]
  currentIndex: number
  totalSlides: number
  onNext: () => void
}) {
  const isLastSlide = currentIndex === totalSlides - 1

  // Different gradient colors for each slide
  const gradients = [
    'from-blue-50 to-indigo-50',
    'from-emerald-50 to-teal-50',
    'from-violet-50 to-purple-50',
    'from-amber-50 to-orange-50',
  ]
  const gradient = gradients[currentIndex] || gradients[0]

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Left side - Content */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-12 lg:py-12 lg:max-w-md lg:justify-center">
        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? 'w-6 bg-accent' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-[#999]">{currentIndex + 1} of {totalSlides}</span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
          {currentIndex === 0 && <Home className="w-7 h-7 text-accent" />}
          {currentIndex === 1 && <GitCompare className="w-7 h-7 text-accent" />}
          {currentIndex === 2 && <Search className="w-7 h-7 text-accent" />}
          {currentIndex === 3 && <MapPin className="w-7 h-7 text-accent" />}
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="font-bold text-2xl lg:text-3xl text-[#1A1A1A] mb-3">
            {slide.title}
          </h2>
          <p className="text-[#666] text-base lg:text-lg leading-relaxed">
            {slide.description}
          </p>
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="w-full lg:w-auto lg:px-8 bg-accent text-white py-4 rounded-xl font-semibold text-base active:bg-accent-dark hover:bg-accent-dark transition-colors flex items-center justify-center gap-2"
        >
          {isLastSlide ? "Okay, let's get started" : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right side - Visual Area */}
      <div className={`hidden lg:flex flex-1 bg-gradient-to-br ${gradient} items-center justify-center p-5 relative overflow-hidden`}>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/30 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-white/20 rounded-full blur-3xl" />

        <div className="relative w-full max-w-2xl">
          {slide.video ? (
            <video
              key={slide.video}
              src={slide.video}
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-2xl shadow-2xl border border-white/60"
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl p-4">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex flex-col items-center justify-center">
                <div className="w-20 h-20 mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
                  {currentIndex === 1 && <GitCompare className="w-10 h-10 text-gray-400" />}
                  {currentIndex === 2 && <Search className="w-10 h-10 text-gray-400" />}
                  {currentIndex === 3 && <MapPin className="w-10 h-10 text-gray-400" />}
                </div>
                <p className="text-sm text-gray-400 font-medium">{slide.gifPlaceholder}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Visual area below content */}
      <div className={`lg:hidden flex-1 bg-gradient-to-br ${gradient} flex items-center justify-center p-4`}>
        {slide.video ? (
          <div className="w-full">
            <video
              key={slide.video}
              src={slide.video}
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-xl shadow-lg border border-white/60"
            />
          </div>
        ) : (
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-3">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex flex-col items-center justify-center">
              <div className="w-14 h-14 mb-2 bg-gray-200 rounded-xl flex items-center justify-center">
                {currentIndex === 1 && <GitCompare className="w-7 h-7 text-gray-400" />}
                {currentIndex === 2 && <Search className="w-7 h-7 text-gray-400" />}
                {currentIndex === 3 && <MapPin className="w-7 h-7 text-gray-400" />}
              </div>
              <p className="text-xs text-gray-400">{slide.gifPlaceholder}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Survey: Use Case ─── */
function SurveyUseCase({ onSelect }: { onSelect: (useCase: UseCase) => void }) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-accent font-medium mb-2">Let me personalize experience for you</p>
        <h1 className="font-bold text-xl text-[#1A1A1A] leading-tight">
          What brings you to haus note?
        </h1>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {USE_CASE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id as UseCase)}
            className="w-full text-left px-4 py-3.5 border border-gray-200 rounded-xl hover:border-accent hover:bg-accent/5 active:bg-accent/10 transition-colors"
          >
            <span className="text-[#1A1A1A] text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Survey: Location with City Autocomplete ─── */
function SurveyLocation({
  city,
  setCity,
  state,
  setState,
  loading,
  error,
  onSubmit,
}: {
  city: string
  setCity: (v: string) => void
  state: string
  setState: (v: string) => void
  loading: boolean
  error: string
  onSubmit: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load Google Places API
  useEffect(() => {
    loadGoogleMaps().then(() => setIsGoogleLoaded(true)).catch(console.error)
  }, [])

  // Initialize services when Google is loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      // Create a dummy div for PlacesService (required by API)
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [isGoogleLoaded])

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setSuggestions([])
      return
    }

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          types: ['(cities)'], // Only return cities
        },
        (predictions, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions)
          } else {
            setSuggestions([])
          }
        }
      )
    } catch (err) {
      console.error('Error fetching city suggestions:', err)
      setSuggestions([])
    }
  }, [])

  // Debounced input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue) {
        fetchSuggestions(inputValue)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Handle selecting a suggestion
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'name'],
        },
        (place, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            let cityName = ''
            let stateName = ''

            // Extract city and state from address components
            place.address_components?.forEach((component) => {
              if (component.types.includes('locality')) {
                cityName = component.long_name
              } else if (component.types.includes('sublocality_level_1') && !cityName) {
                // For places like Brooklyn (which is a sublocality of NYC)
                cityName = component.long_name
              } else if (component.types.includes('administrative_area_level_1')) {
                stateName = component.short_name // Use short name for state (e.g., "NY" instead of "New York")
              } else if (component.types.includes('country') && !stateName) {
                // For international cities, use country if no state
                stateName = component.short_name
              }
            })

            // Fallback to place name if no locality found
            if (!cityName && place.name) {
              cityName = place.name
            }

            setCity(cityName)
            setState(stateName)
            setInputValue(cityName + (stateName ? `, ${stateName}` : ''))
            setSuggestions([])
            setShowSuggestions(false)
          }
        }
      )
    } catch (err) {
      console.error('Error getting place details:', err)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-accent font-medium mb-2">Let's get started in one click</p>
        <h1 className="font-bold text-xl text-[#1A1A1A] leading-tight">
          Which city are you looking for an apartment?
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* City Autocomplete Input */}
          <div className="relative">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setShowSuggestions(true)
                  // Clear the selected city/state if user is typing new value
                  if (city && e.target.value !== `${city}${state ? `, ${state}` : ''}`) {
                    setCity('')
                    setState('')
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="Start typing a city..."
                autoFocus
                autoComplete="off"
              />
              {inputValue && !city && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-[#999] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[#1A1A1A] text-sm truncate">
                        {suggestion.structured_formatting.main_text}
                      </p>
                      <p className="text-[#999] text-xs truncate">
                        {suggestion.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected location display */}
          {city && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="font-medium">{city}</span>
                {state && <span className="text-[#666]">({state})</span>}
              </div>
              <p className="text-sm text-[#666] mt-2">
                Your project will be named "<span className="font-medium text-[#1A1A1A]">{city} house</span>"
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading || !city.trim()}
            className="w-full bg-accent text-white py-3.5 rounded-xl font-semibold text-base active:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? 'Setting up...' : (
              <>
                Let's go
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Projects List (Responsive Grid) ─── */
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
      <main className="flex-1 bg-[#FAFAFA] min-h-0">
        {/* Container with max width for desktop */}
        <div className="max-w-4xl mx-auto px-5 py-6 sm:px-8 sm:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-bold text-2xl sm:text-3xl text-[#1A1A1A]">My Searches</h1>
              <p className="text-sm text-[#666] mt-1">
                {projects.length === 0
                  ? 'Start your apartment hunt'
                  : `${projects.length} active search${projects.length !== 1 ? 'es' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 bg-accent text-white pl-4 pr-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-dark active:bg-accent-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Search</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          {/* Project Cards - Grid on desktop, Stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onNavigate(project.id)}
              />
            ))}

            {/* Add New Card - Desktop only */}
            <button
              onClick={() => setShowNewProject(true)}
              className="hidden sm:flex flex-col items-center justify-center min-h-[180px] border-2 border-dashed border-gray-200 rounded-2xl hover:border-accent/40 hover:bg-accent/5 transition-colors group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-accent/10 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-accent" />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-accent">
                New search
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* New Project Sheet */}
      {showNewProject && (
        <NewProjectSheet
          onClose={() => setShowNewProject(false)}
          onCreated={onCreated}
          existingProjects={projects}
        />
      )}
    </>
  )
}

/* ─── Project Card Component ─── */
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const apartmentCount = project.apartments?.length || 0
  const memberCount = project.members?.length || 0
  const visitedCount = project.apartments?.filter(a => a.status === 'visited').length || 0

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 overflow-hidden text-left hover:border-gray-200 hover:shadow-md active:scale-[0.98] transition-all group"
    >
      <div className="p-5">
        {/* Top row: Icon + Name + Arrow */}
        <div className="flex items-start gap-3 mb-4">
          {/* City Icon */}
          <div className="w-11 h-11 bg-[#F5F5F5] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#EFEFEF] transition-colors">
            <Home className="w-5 h-5 text-[#666]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-[#1A1A1A] truncate leading-tight">
              {project.name}
            </h3>
            <p className="text-sm text-[#999] mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">
                {project.city || 'No location'}{project.state ? `, ${project.state}` : ''}
              </span>
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-[#ccc] flex-shrink-0 group-hover:text-[#999] transition-colors" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          {apartmentCount > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-[#F0F7FF] rounded-md flex items-center justify-center">
                  <Home className="w-3.5 h-3.5 text-[#3B82F6]" />
                </div>
                <span className="text-sm text-[#666]">
                  <span className="font-medium text-[#1A1A1A]">{apartmentCount}</span> apartment{apartmentCount !== 1 ? 's' : ''}
                </span>
              </div>

              {visitedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-[#F0FDF4] rounded-md flex items-center justify-center">
                    <Search className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <span className="text-sm text-[#666]">
                    <span className="font-medium text-[#1A1A1A]">{visitedCount}</span> visited
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-[#999]">No apartments yet</span>
          )}
        </div>

        {/* Members row - if multiple members */}
        {memberCount > 1 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <div className="flex -space-x-2">
              {project.members?.slice(0, 4).map((member, index) => (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full bg-[#F5F5F5] border-2 border-white flex items-center justify-center"
                  style={{ zIndex: 4 - index }}
                >
                  <span className="text-xs font-medium text-[#666]">
                    {member.user_profile?.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs text-[#999]">
              {memberCount} collaborator{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

/* ─── New Project Sheet (Simplified - City Only) ─── */
function NewProjectSheet({
  onClose,
  onCreated,
  existingProjects = []
}: {
  onClose: () => void
  onCreated: (project: Project) => void
  existingProjects?: Project[]
}) {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Generate unique project name
  const generateProjectName = useCallback((cityName: string) => {
    const baseName = `${cityName} house`

    // Check if this base name or variations exist
    const existingNames = existingProjects.map(p => p.name.toLowerCase())

    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName
    }

    // Find the next available number
    let counter = 2
    while (existingNames.includes(`${baseName} ${counter}`.toLowerCase())) {
      counter++
    }
    return `${baseName} ${counter}`
  }, [existingProjects])

  // Load Google Places API
  useEffect(() => {
    loadGoogleMaps().then(() => setIsGoogleLoaded(true)).catch(console.error)
  }, [])

  // Initialize services when Google is loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [isGoogleLoaded])

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setSuggestions([])
      return
    }

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          types: ['(cities)'],
        },
        (predictions, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions)
          } else {
            setSuggestions([])
          }
        }
      )
    } catch (err) {
      console.error('Error fetching city suggestions:', err)
      setSuggestions([])
    }
  }, [])

  // Debounced input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue) {
        fetchSuggestions(inputValue)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Handle selecting a suggestion
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'name'],
        },
        (place, status) => {
          if (window.google?.maps?.places?.PlacesServiceStatus?.OK && status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            let cityName = ''
            let stateName = ''

            place.address_components?.forEach((component) => {
              if (component.types.includes('locality')) {
                cityName = component.long_name
              } else if (component.types.includes('sublocality_level_1') && !cityName) {
                cityName = component.long_name
              } else if (component.types.includes('administrative_area_level_1')) {
                stateName = component.short_name
              } else if (component.types.includes('country') && !stateName) {
                stateName = component.short_name
              }
            })

            if (!cityName && place.name) {
              cityName = place.name
            }

            setCity(cityName)
            setState(stateName)
            setInputValue(cityName + (stateName ? `, ${stateName}` : ''))
            setSuggestions([])
            setShowSuggestions(false)
          }
        }
      )
    } catch (err) {
      console.error('Error getting place details:', err)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city.trim()) return

    setError('')
    setLoading(true)

    try {
      const projectName = generateProjectName(city.trim())
      const project = await projectService.create({
        name: projectName,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      })
      onCreated(project)
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
      setLoading(false)
    }
  }

  const projectName = city ? generateProjectName(city) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet - Mobile bottom sheet, Desktop centered modal */}
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

        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-accent font-medium mb-2">Start a new search</p>
          <h2 className="font-bold text-xl text-[#1A1A1A] leading-tight">
            Which city are you looking in?
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* City Autocomplete Input */}
            <div className="relative">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setShowSuggestions(true)
                    if (city && e.target.value !== `${city}${state ? `, ${state}` : ''}`) {
                      setCity('')
                      setState('')
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                  placeholder="Start typing a city..."
                  autoFocus
                  autoComplete="off"
                />
                {inputValue && !city && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-[#999] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[#1A1A1A] text-sm truncate">
                          {suggestion.structured_formatting.main_text}
                        </p>
                        <p className="text-[#999] text-xs truncate">
                          {suggestion.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected location display */}
            {city && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#1A1A1A]">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="font-medium">{city}</span>
                  {state && <span className="text-[#666]">({state})</span>}
                </div>
                <p className="text-sm text-[#666] mt-2">
                  Your project will be named "<span className="font-medium text-[#1A1A1A]">{projectName}</span>"
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          {/* CTA Button */}
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
              disabled={loading || !city.trim()}
              className="flex-1 bg-accent text-white py-3.5 px-6 rounded-xl font-semibold text-base active:bg-accent-dark hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating...' : (
                <>
                  Create
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Edit Account Modal ─── */
function EditAccountModal({
  currentName,
  currentEmail,
  onClose,
  onSaved,
}: {
  currentName: string
  currentEmail: string
  onClose: () => void
  onSaved: (name: string, email: string) => void
}) {
  const [name, setName] = useState(currentName)
  const [email, setEmail] = useState(currentEmail)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [emailNote, setEmailNote] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailNote('')
    setSaving(true)

    try {
      // Update name if changed
      if (name !== currentName) {
        await authService.updateProfile({ name })
      }

      // Update email if changed
      if (email !== currentEmail) {
        await authService.updateEmail(email)
        setEmailNote('A confirmation link has been sent to your new email address.')
      }

      onSaved(name, email !== currentEmail ? currentEmail : email)
    } catch (err: any) {
      console.error('Error updating account:', err)
      setError(err.message || 'Failed to update account')
    } finally {
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
          <h2 className="font-bold text-xl text-[#1A1A1A]">Edit Account</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#666] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                placeholder="your@email.com"
              />
              {email !== currentEmail && (
                <p className="text-xs text-[#999] mt-1.5">
                  Changing your email requires confirmation via the new address.
                </p>
              )}
            </div>

            {emailNote && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-sm">
                {emailNote}
              </div>
            )}

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
              disabled={saving || (!name.trim() && !email.trim())}
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

/* ─── Delete Account Confirmation ─── */
function DeleteAccountConfirm({
  onClose,
  onDeleted,
}: {
  onClose: () => void
  onDeleted: () => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return

    setError('')
    setDeleting(true)

    try {
      await authService.deleteAccount()
      await authService.signOut()
      onDeleted()
    } catch (err: any) {
      console.error('Error deleting account:', err)
      setError(err.message || 'Failed to delete account. Please contact support.')
      setDeleting(false)
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="font-bold text-xl text-[#1A1A1A]">Delete Account</h2>
        </div>

        <p className="text-sm text-[#666] mb-6">
          This will permanently delete your account and all your data, including projects, apartments, and comments. This action cannot be undone.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#666] mb-1.5">
            Type <span className="font-bold text-[#1A1A1A]">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-3.5 border border-gray-200 rounded-xl font-medium text-[#666] hover:bg-gray-50 active:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || deleting}
            className="flex-1 bg-red-500 text-white py-3.5 px-6 rounded-xl font-semibold text-base hover:bg-red-600 active:bg-red-700 disabled:opacity-40 flex items-center justify-center"
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
