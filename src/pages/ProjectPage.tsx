// src/pages/ProjectPage.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Menu, Plus, MapPin, UserPlus, ChevronLeft,
  List, Map, X, ChevronDown, ChevronUp, Home, Users, Clock, MessageSquarePlus
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { projectService, apartmentService, commuteService } from '../services'
import { Project, Apartment, CommuteLocation, ApartmentCommute } from '../types/database'
import { ApartmentListItem } from '../components/ApartmentListItem'
import { ApartmentDetail } from '../components/ApartmentDetail'
import { AddApartmentModal } from '../components/AddApartmentModal'
import { ApartmentMap } from '../components/ApartmentMap'
import { CommuteLocations } from '../components/CommuteLocations'
import { EditProjectModal } from '../components/EditProjectModal'
import { ShareProjectModal } from '../components/ShareProjectModal'

type FilterType = 'all' | 'price' | 'viewed'
type ViewMode = 'list' | 'map'

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [commuteLocations, setCommuteLocations] = useState<CommuteLocation[]>([])
  const [apartmentCommutes, setApartmentCommutes] = useState<Record<string, ApartmentCommute[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showCommuteLocations, setShowCommuteLocations] = useState(false)

  const [activeFilters, setActiveFilters] = useState<FilterType[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [priceFilterActive, setPriceFilterActive] = useState(false)

  // Tour state
  const [tourStep, setTourStep] = useState<number>(0) // 0 = not showing, 1-3 = tour steps
  const [showTour, setShowTour] = useState(false)
  const tourTargetRefs = useRef<Record<number, HTMLElement | null>>({})
  const [tourTargetRect, setTourTargetRect] = useState<DOMRect | null>(null)
  const [isFirstProject, setIsFirstProject] = useState(false)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      try {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        const projectData = await projectService.getById(projectId)
        setProject(projectData)

        const member = projectData.members?.find(m => m.user_id === user?.id)
        setUserRole(member?.role || '')

        // Check if this is the user's only project
        const allProjects = await projectService.getUserProjects()
        setIsFirstProject(allProjects.length <= 1)

        // Load apartments and commute locations in parallel
        const [apartmentsData, locationsData] = await Promise.all([
          apartmentService.getByProject(projectId),
          commuteService.getLocationsByProject(projectId)
        ])

        setApartments(apartmentsData)
        setCommuteLocations(locationsData)

        // Load commute times for each apartment
        if (locationsData.length > 0) {
          const commutesRecord: Record<string, ApartmentCommute[]> = {}
          let hasMissing = false
          for (const apt of apartmentsData) {
            const commutes = await commuteService.getCommutesForApartment(apt.id)
            if (commutes.length > 0) {
              commutesRecord[apt.id] = commutes
            }
            const hasRealData = commutes.some(c =>
              c.duration_transit != null || c.duration_driving != null
            )
            if (apt.latitude && apt.longitude && (!hasRealData || commutes.length < locationsData.length)) {
              hasMissing = true
            }
          }
          setApartmentCommutes(commutesRecord)

          // Calculate any missing commutes in background
          if (hasMissing) {
            ;(async () => {
              for (const apt of apartmentsData) {
                if (!apt.latitude || !apt.longitude) continue
                const existing = commutesRecord[apt.id] || []
                const existingHasData = existing.some(c =>
                  c.duration_transit != null || c.duration_driving != null
                )
                if (!existingHasData || existing.length < locationsData.length) {
                  await commuteService.calculateCommutesForApartment(
                    apt.id, Number(apt.latitude), Number(apt.longitude), projectId
                  )
                }
              }
              // Refresh commute data after calculations
              const updatedRecord: Record<string, ApartmentCommute[]> = {}
              for (const apt of apartmentsData) {
                const commutes = await commuteService.getCommutesForApartment(apt.id)
                if (commutes.length > 0) {
                  updatedRecord[apt.id] = commutes
                }
              }
              setApartmentCommutes(updatedRecord)
            })().catch(err => console.error('[commute] background calc error:', err))
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // Check if we should show the tour (only for first-time users with their first project)
  useEffect(() => {
    if (!projectId || loading) return

    const tourKey = `hausnote_tour_${projectId}`
    const hasSeenTour = localStorage.getItem(tourKey)

    if (!hasSeenTour && apartments.length === 0) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setShowTour(true)
        setTourStep(1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [projectId, loading, apartments.length, isFirstProject])

  // Update target rect when tour step changes
  useEffect(() => {
    if (!showTour || tourStep === 0) {
      setTourTargetRect(null)
      return
    }
    // Small delay to allow DOM updates (e.g. commute panel opening)
    const timer = setTimeout(() => {
      let el = tourTargetRefs.current[tourStep]
      // Step 4 targets the feedback widget which lives outside ProjectPage
      if (!el && tourStep === 4) {
        el = document.querySelector('[data-tour-target="feedback"]') as HTMLElement | null
      }
      if (el) {
        setTourTargetRect(el.getBoundingClientRect())
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [showTour, tourStep])

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length) {
      setTourStep(tourStep + 1)
      // Open commute locations when showing that step
      if (tourStep === 1) {
        setShowCommuteLocations(true)
      }
    } else {
      // Tour complete
      setShowTour(false)
      setTourStep(0)
      if (projectId) {
        localStorage.setItem(`hausnote_tour_${projectId}`, 'true')
      }
    }
  }

  const handleSkipTour = () => {
    setShowTour(false)
    setTourStep(0)
    if (projectId) {
      localStorage.setItem(`hausnote_tour_${projectId}`, 'true')
    }
  }

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  const filteredApartments = apartments.filter(apt => {
    if (priceFilterActive && apt.price != null && (apt.price < priceRange[0] || apt.price > priceRange[1])) return false
    if (activeFilters.includes('viewed') && apt.status !== 'visited') return false
    return true
  })

  const canEdit = userRole === 'owner' || userRole === 'editor'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const refreshCommutes = async (apts?: Apartment[]) => {
    const list = apts || apartments
    if (list.length === 0) return
    const commutesRecord: Record<string, ApartmentCommute[]> = {}
    for (const apt of list) {
      const commutes = await commuteService.getCommutesForApartment(apt.id)
      if (commutes.length > 0) {
        commutesRecord[apt.id] = commutes
      }
    }
    setApartmentCommutes(commutesRecord)
  }

  const calculateMissingCommutes = async (apts: Apartment[], locations: CommuteLocation[]) => {
    if (locations.length === 0) return
    for (const apt of apts) {
      if (!apt.latitude || !apt.longitude) continue
      const existing = await commuteService.getCommutesForApartment(apt.id)
      const hasRealData = existing.some(c =>
        c.duration_transit != null || c.duration_driving != null
      )
      if (!hasRealData || existing.length < locations.length) {
        await commuteService.calculateCommutesForApartment(
          apt.id, Number(apt.latitude), Number(apt.longitude), apt.project_id!
        )
      }
    }
  }

  const refreshApartments = async () => {
    if (!projectId) return
    const data = await apartmentService.getByProject(projectId)
    setApartments(data)
    await calculateMissingCommutes(data, commuteLocations)
    await refreshCommutes(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white sm:bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-accent sm:h-12 sm:w-12 sm:border-b-2 sm:border-t-0 sm:border-blue-600"></div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white sm:bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-red-500 sm:text-red-600 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-accent sm:text-blue-600 font-medium sm:hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ===== MOBILE HEADER ===== */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sm:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 -ml-1 text-[#666]"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg truncate max-w-[180px]">
            {project.name}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => setShowShareModal(true)}
              ref={(el) => { tourTargetRefs.current[3] = el }}
              className={`p-2 text-[#666] active:bg-gray-100 rounded-lg ${showTour && tourStep === 3 ? 'relative z-[60] bg-white' : ''}`}
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-[#666] active:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[160px]">
                  {userRole === 'owner' && (
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowEditModal(true)
                      }}
                      className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                    >
                      Edit Project
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                  >
                    All Projects
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/feedback')
                    }}
                    className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                  >
                    Share Feedback
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                  >
                    My Account
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      handleSignOut()
                    }}
                    className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== DESKTOP HEADER ===== */}
      <header className="hidden sm:block border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1
              onClick={() => navigate('/dashboard')}
              className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 flex items-center gap-2"
            >
              <img src="/house-logo.png" alt="" className="w-7 h-7" />
              haus note
            </h1>
            <span className="text-2xl text-gray-400 font-light">/</span>
            <span className="text-xl font-semibold text-gray-700">{project.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                ref={(el) => { if (window.innerWidth >= 640) tourTargetRefs.current[3] = el }}
                onClick={() => setShowShareModal(true)}
                className={`p-2 hover:bg-gray-100 rounded-lg ${showTour && tourStep === 3 ? 'relative z-[60] bg-white' : ''}`}
                title="Invite collaborators"
              >
                <UserPlus className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[160px]">
                  {userRole === 'owner' && (
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowEditModal(true)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                    >
                      Edit Project
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    All Projects
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/feedback')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    Share Feedback
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    My Account
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      handleSignOut()
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== MOBILE: Collapsible Commute Locations ===== */}
      <div
        ref={(el) => { tourTargetRefs.current[2] = el }}
        className={`border-b border-gray-100 sm:hidden ${showTour && tourStep === 2 ? 'relative z-[60]' : ''}`}
      >
        <button
          onClick={() => setShowCommuteLocations(!showCommuteLocations)}
          className={`w-full px-4 py-3 flex items-center justify-between text-left ${showTour && tourStep === 2 ? 'bg-white' : ''}`}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#999]" />
            <span className="text-sm font-medium text-[#666]">
              {commuteLocations.length > 0
                ? `Commute times (${commuteLocations.length})`
                : 'Add places to check your commute'}
            </span>
          </div>
          {showCommuteLocations ? (
            <ChevronUp className="w-4 h-4 text-[#999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999]" />
          )}
        </button>
        {showCommuteLocations && (
          <div className="px-4 pb-3">
            <CommuteLocations
              projectId={projectId!}
              locations={commuteLocations}
              canEdit={canEdit}
              onLocationsChange={setCommuteLocations}
              onCommutesRecalculated={() => refreshCommutes()}
            />
          </div>
        )}
      </div>

      {/* ===== MOBILE: Filter chips (horizontal scroll) ===== */}
      <div className="px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide sm:hidden">
        <div className="flex items-center gap-2 min-w-max">
          <div className="relative">
            <FilterChip
              label={priceFilterActive ? formatPriceLabel(priceRange) : 'Price'}
              active={priceFilterActive}
              onClick={() => setShowPriceFilter(!showPriceFilter)}
            />
            {showPriceFilter && (
              <PriceFilterDropdown
                priceRange={priceRange}
                onRangeChange={setPriceRange}
                onReset={() => {
                  setPriceRange([0, 10000])
                  setPriceFilterActive(false)
                  setShowPriceFilter(false)
                }}
                onClose={() => setShowPriceFilter(false)}
                onApply={() => {
                  setPriceFilterActive(true)
                  setShowPriceFilter(false)
                }}
              />
            )}
          </div>
          <FilterChip
            label="Viewed"
            active={activeFilters.includes('viewed')}
            onClick={() => toggleFilter('viewed')}
          />
        </div>
      </div>

      {/* ===== MOBILE: View Toggle (List / Map) ===== */}
      <div className="flex border-b border-gray-100 sm:hidden">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            viewMode === 'list'
              ? 'text-accent border-b-2 border-accent'
              : 'text-[#666]'
          }`}
        >
          <List className="w-4 h-4" />
          List
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            viewMode === 'map'
              ? 'text-accent border-b-2 border-accent'
              : 'text-[#666]'
          }`}
        >
          <Map className="w-4 h-4" />
          Map
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----- MOBILE: Single View (List or Map) ----- */}
        <div className="flex-1 flex flex-col sm:hidden">
          {viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto">
              {filteredApartments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#666] px-6 py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-1">No apartments yet</p>
                  <p className="text-sm text-[#999] text-center mb-4">
                    Start adding apartments to your search
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-accent text-white px-6 py-3 rounded-xl font-medium active:bg-accent-dark"
                    >
                      Add Apartment
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredApartments.map(apartment => (
                    <ApartmentListItem
                      key={apartment.id}
                      apartment={apartment}
                      commutes={apartmentCommutes[apartment.id] || []}
                      onClick={() => setSelectedApartment(apartment)}
                      isSelected={selectedApartment?.id === apartment.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1">
              <ApartmentMap
                apartments={filteredApartments}
                selectedId={selectedApartment?.id}
                onMarkerClick={(apt) => setSelectedApartment(apt)}
                apartmentCommutes={apartmentCommutes}
                commuteLocations={commuteLocations}
                cityName={project.city}
                stateName={project.state}
              />
            </div>
          )}

          {/* Mobile FAB - show during tour step 1 even in map view */}
          {canEdit && (viewMode === 'list' || (showTour && tourStep === 1)) && (
            <button
              ref={(el) => { tourTargetRefs.current[1] = el }}
              onClick={() => setShowAddModal(true)}
              className={`fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg active:bg-accent-dark ${showTour && tourStep === 1 ? 'z-[60]' : 'z-30'}`}
              style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* ----- DESKTOP: Split View (original layout) ----- */}
        <div className="hidden sm:flex flex-1">
          {/* Left side - List */}
          <div className="w-1/2 flex flex-col border-r border-gray-200">
            {/* Commute Locations */}
            <div
              ref={(el) => { if (window.innerWidth >= 640) tourTargetRefs.current[2] = el }}
              className={`p-4 border-b border-gray-200 bg-gray-50 ${showTour && tourStep === 2 ? 'relative z-[60]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {commuteLocations.length > 0 ? 'Commute times from:' : 'Add places to check your commute'}
                </span>
              </div>
              <CommuteLocations
                projectId={projectId!}
                locations={commuteLocations}
                canEdit={canEdit}
                onLocationsChange={setCommuteLocations}
                onCommutesRecalculated={() => refreshCommutes()}
              />
            </div>

            {/* Filters */}
            <div className={`p-4 border-b border-gray-200 ${showTour && tourStep === 1 ? 'relative z-[60] bg-white' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <DesktopFilterChip
                    label={priceFilterActive ? formatPriceLabel(priceRange) : 'Price'}
                    active={priceFilterActive}
                    onClick={() => setShowPriceFilter(!showPriceFilter)}
                  />
                  {showPriceFilter && (
                    <PriceFilterDropdown
                      priceRange={priceRange}
                      onRangeChange={setPriceRange}
                      onReset={() => {
                        setPriceRange([0, 10000])
                        setPriceFilterActive(false)
                        setShowPriceFilter(false)
                      }}
                      onClose={() => setShowPriceFilter(false)}
                      onApply={() => {
                        setPriceFilterActive(true)
                        setShowPriceFilter(false)
                      }}
                    />
                  )}
                </div>
                <DesktopFilterChip
                  label="Viewed"
                  active={activeFilters.includes('viewed')}
                  onClick={() => toggleFilter('viewed')}
                />

                {/* Add button */}
                {canEdit && (
                  <button
                    ref={(el) => { if (window.innerWidth >= 640) tourTargetRefs.current[1] = el }}
                    onClick={() => setShowAddModal(true)}
                    className={`ml-auto w-10 h-10 bg-accent hover:bg-accent-dark text-white rounded-full flex items-center justify-center shadow-lg transition-colors ${showTour && tourStep === 1 ? 'relative z-[60]' : ''}`}
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Apartment List */}
            <div className="flex-1 overflow-y-auto">
              {filteredApartments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <p className="text-lg mb-2">No apartments yet</p>
                  {canEdit && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="text-red-500 hover:underline"
                    >
                      Add your first apartment
                    </button>
                  )}
                </div>
              ) : (
                filteredApartments.map(apartment => (
                  <ApartmentListItem
                    key={apartment.id}
                    apartment={apartment}
                    commutes={apartmentCommutes[apartment.id] || []}
                    onClick={() => setSelectedApartment(apartment)}
                    isSelected={selectedApartment?.id === apartment.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right side - Map */}
          <div className="w-1/2">
            <ApartmentMap
              apartments={filteredApartments}
              selectedId={selectedApartment?.id}
              onMarkerClick={(apt) => setSelectedApartment(apt)}
              apartmentCommutes={apartmentCommutes}
              commuteLocations={commuteLocations}
              cityName={project.city}
              stateName={project.state}
            />
          </div>
        </div>
      </div>

      {/* Add Apartment Modal */}
      <AddApartmentModal
        projectId={projectId!}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshApartments}
      />

      {/* Apartment Detail */}
      {selectedApartment && (
        <>
          {/* Mobile: Full screen slide-up */}
          <div className="fixed inset-0 z-50 bg-white sm:hidden animate-slide-up">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setSelectedApartment(null)}
                className="p-2 bg-white/80 backdrop-blur rounded-full shadow-sm"
              >
                <X className="w-5 h-5 text-[#666]" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <ApartmentDetail
                apartment={selectedApartment}
                commutes={apartmentCommutes[selectedApartment.id] || []}
                currentUserId={currentUserId}
                canEdit={canEdit}
                onClose={() => setSelectedApartment(null)}
                onUpdate={(updated) => {
                  setApartments(apartments.map(a => a.id === updated.id ? updated : a))
                  setSelectedApartment(updated)
                }}
                onDelete={() => {
                  setApartments(apartments.filter(a => a.id !== selectedApartment.id))
                  setSelectedApartment(null)
                }}
              />
            </div>
          </div>

          {/* Desktop: Modal (original behavior) */}
          <div className="hidden sm:block">
            <ApartmentDetail
              apartment={selectedApartment}
              commutes={apartmentCommutes[selectedApartment.id] || []}
              currentUserId={currentUserId}
              canEdit={canEdit}
              onClose={() => setSelectedApartment(null)}
              onUpdate={(updated) => {
                setApartments(apartments.map(a => a.id === updated.id ? updated : a))
                setSelectedApartment(updated)
              }}
              onDelete={() => {
                setApartments(apartments.filter(a => a.id !== selectedApartment.id))
                setSelectedApartment(null)
              }}
            />
          </div>
        </>
      )}

      {/* Edit Project Modal */}
      {showEditModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => {
            setProject({ ...project, ...updated })
            setShowEditModal(false)
          }}
          onDeleted={() => {
            navigate('/dashboard')
          }}
        />
      )}

      {/* Share Project Modal */}
      {showShareModal && project && (
        <ShareProjectModal
          projectId={project.id}
          projectName={project.name}
          currentUserId={currentUserId}
          userRole={userRole}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          step={tourStep}
          onNext={handleTourNext}
          onSkip={handleSkipTour}
          targetRect={tourTargetRect}
        />
      )}
    </div>
  )
}

/* Mobile filter chip */
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
          : 'bg-white text-[#666] border-gray-200 active:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

/* Desktop filter chip (original style) */
function DesktopFilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

/* ─── Price Filter Helpers ─── */
function formatPriceLabel(range: [number, number]): string {
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`
  return `${fmt(range[0])}–${fmt(range[1])}`
}

function PriceFilterDropdown({
  priceRange,
  onRangeChange,
  onReset,
  onClose,
  onApply,
}: {
  priceRange: [number, number]
  onRangeChange: (range: [number, number]) => void
  onReset: () => void
  onClose: () => void
  onApply: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const SLIDER_MIN = 0
  const SLIDER_MAX = 10000
  const SLIDER_STEP = 100

  const [minText, setMinText] = useState(String(priceRange[0]))
  const [maxText, setMaxText] = useState(String(priceRange[1]))
  const isDragging = useRef(false)

  // Sync text fields when slider changes (but not while typing)
  useEffect(() => {
    if (isDragging.current) {
      setMinText(String(priceRange[0]))
      setMaxText(String(priceRange[1]))
    }
  }, [priceRange])

  // Outside click — use a ref so the listener is stable and doesn't re-attach on every render
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

  const commitMinText = () => {
    const parsed = parseInt(minText.replace(/[^0-9]/g, ''), 10)
    if (isNaN(parsed)) {
      setMinText(String(priceRange[0]))
      return
    }
    const clamped = clamp(parsed, SLIDER_MIN, priceRange[1] - SLIDER_STEP)
    const snapped = Math.round(clamped / SLIDER_STEP) * SLIDER_STEP
    setMinText(String(snapped))
    onRangeChange([snapped, priceRange[1]])
  }

  const commitMaxText = () => {
    const parsed = parseInt(maxText.replace(/[^0-9]/g, ''), 10)
    if (isNaN(parsed)) {
      setMaxText(String(priceRange[1]))
      return
    }
    const clamped = clamp(parsed, priceRange[0] + SLIDER_STEP, SLIDER_MAX)
    const snapped = Math.round(clamped / SLIDER_STEP) * SLIDER_STEP
    setMaxText(String(snapped))
    onRangeChange([priceRange[0], snapped])
  }

  const handleSliderMin = (val: number) => {
    isDragging.current = true
    const clamped = Math.min(val, priceRange[1] - SLIDER_STEP)
    onRangeChange([clamped, priceRange[1]])
  }

  const handleSliderMax = (val: number) => {
    isDragging.current = true
    const clamped = Math.max(val, priceRange[0] + SLIDER_STEP)
    onRangeChange([priceRange[0], clamped])
  }

  const handleSliderEnd = () => {
    isDragging.current = false
    setMinText(String(priceRange[0]))
    setMaxText(String(priceRange[1]))
  }

  const pctMin = ((priceRange[0] - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100
  const pctMax = ((priceRange[1] - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 w-[300px] bg-white rounded-xl shadow-lg border border-gray-200 p-5 z-50"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-800">Price range</span>
        <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-600">
          Reset
        </button>
      </div>

      {/* Min / Max text inputs */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1">
          <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Min</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={minText}
              onChange={e => setMinText(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitMinText}
              onKeyDown={e => { if (e.key === 'Enter') commitMinText() }}
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900"
            />
          </div>
        </div>
        <span className="text-gray-300 mt-5">—</span>
        <div className="flex-1">
          <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Max</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxText}
              onChange={e => setMaxText(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitMaxText}
              onKeyDown={e => { if (e.key === 'Enter') commitMaxText() }}
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Dual range slider */}
      <div
        className="relative h-8 mb-1"
        onMouseUp={handleSliderEnd}
        onTouchEnd={handleSliderEnd}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        {/* Active track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-gray-900 rounded-full"
          style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={priceRange[0]}
          onChange={e => handleSliderMin(Number(e.target.value))}
          onMouseUp={handleSliderEnd}
          onTouchEnd={handleSliderEnd}
          className="absolute w-full top-0 h-8 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-0"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={priceRange[1]}
          onChange={e => handleSliderMax(Number(e.target.value))}
          onMouseUp={handleSliderEnd}
          onTouchEnd={handleSliderEnd}
          className="absolute w-full top-0 h-8 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-0"
        />
      </div>

      <div className="flex justify-between text-[11px] text-gray-400 mb-5">
        <span>$0</span>
        <span>$10,000</span>
      </div>

      <button
        onClick={onApply}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Apply
      </button>
    </div>
  )
}

/* ─── Onboarding Tour Component ─── */
const TOUR_STEPS = [
  {
    icon: Home,
    title: 'Add your apartments',
    description: 'Tap here to add apartments you find or visit. Track photos, notes, and details all in one place.',
    position: 'above' as const,
  },
  {
    icon: Clock,
    title: 'Check commute times',
    description: 'Add your workplace or favorite spots to automatically see commute times from each apartment.',
    position: 'below' as const,
  },
  {
    icon: Users,
    title: 'Hunt together',
    description: 'Invite your partner, roommate, or friends to collaborate on your apartment search.',
    position: 'below' as const,
  },
  {
    icon: MessageSquarePlus,
    title: 'Help us improve',
    description: 'Have a feature idea or running into an issue? Tap the Feedback button anytime to let us know.',
    position: 'above' as const,
  },
]

function OnboardingTour({
  step,
  onNext,
  onSkip,
  targetRect,
}: {
  step: number
  onNext: () => void
  onSkip: () => void
  targetRect: DOMRect | null
}) {
  const currentStep = TOUR_STEPS[step - 1]
  if (!currentStep) return null

  const Icon = currentStep.icon
  const isLastStep = step === TOUR_STEPS.length

  // Calculate tooltip position based on target element
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Fallback positioning
      if (step === 1) return { bottom: 104, right: 16, left: 16 }
      if (step === 2) return { top: 128, left: 16, right: 16 }
      if (step === 4) return { bottom: 64, left: 16, right: 16 }
      return { top: 64, right: 8, left: 16 }
    }

    const padding = 16
    if (currentStep.position === 'above') {
      // Tooltip above the target (for FAB button)
      return {
        bottom: window.innerHeight - targetRect.top + 12,
        left: padding,
        right: padding,
      }
    } else {
      // Tooltip below the target (for commute bar, share button)
      return {
        top: targetRect.bottom + 12,
        left: padding,
        right: step === 3 ? 8 : padding,
      }
    }
  }

  // Calculate arrow position to point at the center of the target
  const getArrowStyle = (): React.CSSProperties => {
    if (!targetRect) return {}
    const targetCenterX = targetRect.left + targetRect.width / 2
    return { left: targetCenterX - 8 } // 8 = half of arrow width (16/2)
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onSkip} />

      {/* Tooltip */}
      <div className="fixed z-[70]" style={getTooltipStyle()}>
        <div className={`bg-white rounded-2xl shadow-xl p-5 max-w-sm ${step === 3 ? 'ml-auto' : step === 2 || step === 4 ? 'mr-auto' : 'mx-auto'}`}>
          {/* Icon */}
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-accent" />
          </div>

          {/* Content */}
          <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">
            {currentStep.title}
          </h3>
          <p className="text-[#666] text-sm mb-5">
            {currentStep.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-sm text-[#999] hover:text-[#666]"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i + 1 === step ? 'bg-accent' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={onNext}
                className="bg-accent text-white px-5 py-2.5 rounded-xl font-medium text-sm active:bg-accent-dark"
              >
                {isLastStep ? 'Got it!' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow pointing to target element */}
        {targetRect && currentStep.position === 'above' && (
          <div
            className="absolute -bottom-2 w-4 h-4 bg-white transform rotate-45 shadow-lg"
            style={getArrowStyle()}
          />
        )}
        {targetRect && currentStep.position === 'below' && (
          <div
            className="absolute -top-2 w-4 h-4 bg-white transform rotate-45"
            style={getArrowStyle()}
          />
        )}
      </div>
    </>
  )
}
