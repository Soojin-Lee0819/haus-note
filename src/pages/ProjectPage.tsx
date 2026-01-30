// src/pages/ProjectPage.tsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Menu, Plus, MapPin, Settings, UserPlus, ChevronLeft,
  List, Map, X, ChevronDown, ChevronUp
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

type FilterType = 'all' | 'price' | 'type' | 'viewed' | 'instant'
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

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  const filteredApartments = apartments.filter(apt => {
    if (activeFilters.length === 0) return true
    if (activeFilters.includes('viewed') && apt.status === 'visited') return true
    return activeFilters.length === 0
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
              className="p-2 text-[#666] active:bg-gray-100 rounded-lg"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          {userRole === 'owner' && (
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-[#666] active:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
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
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-3 text-left text-[#333] active:bg-gray-50"
                  >
                    All Projects
                  </button>
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
              className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700"
            >
              haus note
            </h1>
            <span className="text-2xl text-gray-400 font-light">/</span>
            <span className="text-xl font-semibold text-gray-700">{project.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Share project"
              >
                <UserPlus className="w-5 h-5 text-gray-600" />
              </button>
            )}
            {userRole === 'owner' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Project settings"
              >
                <Settings className="w-5 h-5 text-gray-600" />
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
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      navigate('/dashboard')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    All Projects
                  </button>
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
      <div className="border-b border-gray-100 sm:hidden">
        <button
          onClick={() => setShowCommuteLocations(!showCommuteLocations)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#999]" />
            <span className="text-sm font-medium text-[#666]">
              Commute locations {commuteLocations.length > 0 && `(${commuteLocations.length})`}
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
          <FilterChip
            label="Price"
            active={activeFilters.includes('price')}
            onClick={() => toggleFilter('price')}
          />
          <FilterChip
            label="Type"
            active={activeFilters.includes('type')}
            onClick={() => toggleFilter('type')}
          />
          <FilterChip
            label="Viewed"
            active={activeFilters.includes('viewed')}
            onClick={() => toggleFilter('viewed')}
          />
          <FilterChip
            label="Instant"
            active={activeFilters.includes('instant')}
            onClick={() => toggleFilter('instant')}
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
              />
            </div>
          )}

          {/* Mobile FAB */}
          {canEdit && viewMode === 'list' && filteredApartments.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg active:bg-accent-dark z-30"
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
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Commute to:</span>
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
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <DesktopFilterChip
                  label="Price"
                  active={activeFilters.includes('price')}
                  onClick={() => toggleFilter('price')}
                />
                <DesktopFilterChip
                  label="Type of place"
                  active={activeFilters.includes('type')}
                  onClick={() => toggleFilter('type')}
                />
                <DesktopFilterChip
                  label="Viewed"
                  active={activeFilters.includes('viewed')}
                  onClick={() => toggleFilter('viewed')}
                />
                <DesktopFilterChip
                  label="Instant Book"
                  active={activeFilters.includes('instant')}
                  onClick={() => toggleFilter('instant')}
                />

                {/* Add button */}
                {canEdit && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="ml-auto w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
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
        />
      )}

      {/* Share Project Modal */}
      {showShareModal && project && (
        <ShareProjectModal
          projectId={project.id}
          currentUserId={currentUserId}
          userRole={userRole}
          onClose={() => setShowShareModal(false)}
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
