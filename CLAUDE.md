# CLAUDE.md

This file provides context for Claude Code when working on this repository.

## Project Overview

Haus Note is a collaborative apartment hunting application. Users create projects for an apartment search, invite collaborators with role-based access (owner/editor/viewer), and track apartments with photos, comments, ratings, amenities, and commute times.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 3, Lucide React icons
- **Build:** Create React App (react-scripts), outputs to `build/`
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Maps:** Google Maps JavaScript API, Geocoding API, Distance Matrix API
- **Mobile:** Capacitor (iOS/Android native shell wrapping the web app)
- **Routing:** React Router v7

## Project Structure

```
src/
  pages/            # 4 route-level page components
    AuthPage.tsx        # Login/signup
    ProjectDashboard.tsx # List of user projects
    ProjectPage.tsx     # Main project view (apartment list + map)
    InvitePage.tsx      # Invitation acceptance flow
  components/       # Reusable UI components
    ApartmentCard.tsx       # Card view for apartment grid
    ApartmentListItem.tsx   # Row view for apartment list
    ApartmentDetail.tsx     # Full detail modal (media, comments, amenities, edit)
    ApartmentMap.tsx         # Google Maps with apartment markers
    AddApartmentModal.tsx   # Create apartment form
    AmenityPicker.tsx       # Preset + custom amenity pill selector
    CommentSection.tsx      # Threaded comments
    CommuteTimes.tsx        # Commute time display
    CommuteLocations.tsx    # Manage commute destinations
    MediaUploader.tsx       # Drag-and-drop photo/video upload
    EditProjectModal.tsx    # Edit project settings
    ShareProjectModal.tsx   # Invite collaborators
  services/         # Supabase API layer (one file per domain)
    apartmentService.ts     # CRUD apartments, comments, amenities, brokers
    mediaService.ts         # Upload/delete photos/videos to Supabase Storage
    projectService.ts       # CRUD projects, members, invitations
    authService.ts          # Sign up/in/out, profile management
    commuteService.ts       # Google Distance Matrix calculations
    geocodeService.ts       # Address geocoding via Google API
    brokerService.ts        # CRUD broker contacts
    activityService.ts      # Activity logging
  types/
    database.ts         # All TypeScript interfaces matching Supabase schema
  lib/
    supabase.ts         # Supabase client initialization
  hooks/              # Custom React hooks (currently minimal)
  stores/             # Zustand stores (imported but not actively used)
```

## Key Architecture Decisions

- **No global state store in active use.** State is managed via React `useState`/`useEffect` at the page/component level. Zustand is a dependency but not wired up.
- **Services are plain objects with async methods**, not classes. They call Supabase directly and return typed data.
- **Media URLs are computed, not stored.** `storage_path` is persisted in the DB; public URLs are resolved via `mediaService.addPublicUrl()` at fetch time. The `resolveMediaUrls` helper in `apartmentService` ensures joined media records have URLs.
- **Roles are checked client-side** in `ProjectPage.tsx`: `canEdit = role === 'owner' || role === 'editor'`. Supabase RLS policies enforce server-side.

## Environment Variables

Required in `.env` (bundled at build time via `REACT_APP_*` prefix):

```
REACT_APP_SUPABASE_URL=<supabase project url>
REACT_APP_SUPABASE_ANON_KEY=<supabase anon key>
REACT_APP_GOOGLE_MAPS_API_KEY=<google maps api key>
```

## Commands

```bash
npm start           # Dev server (localhost:3000)
npm run build       # Production build to build/
npm test            # Run tests (react-scripts test)
npm run cap:sync    # Sync web build to native projects
npm run cap:ios     # Build + sync + open Xcode
npm run cap:android # Build + sync + open Android Studio
```

## Capacitor (Mobile)

- Config: `capacitor.config.ts` (appId: `com.hausnote.app`, webDir: `build`)
- iOS project: `ios/App/`
- After code changes: `npm run build && npx cap sync ios`
- Safe area CSS is in `src/index.css` using `env(safe-area-inset-*)`
- `viewport-fit=cover` is set in `public/index.html`

## Supabase Schema (key tables)

- `user_profiles` — name, phone, avatar_url
- `projects` — name, city, budget_min/max, target_move_in_date
- `project_members` — user_id, project_id, role (owner/editor/viewer)
- `project_invitations` — email, token, role, expires_at
- `apartments` — title, address, price, lat/lng, status, rating, neighborhood
- `apartment_media` — storage_path, media_type (photo/video), order_index
- `apartment_comments` — user_id, comment text
- `amenities` — apartment_id, name, has_amenity
- `brokers` — name, email, phone, company
- `apartment_brokers` — join table
- `commute_locations` — project-level destinations (name, address, lat/lng)
- `apartment_commutes` — cached commute durations per mode
- `activity_logs` — action, entity_type, entity_id, details JSON

## Storage Buckets

- `apartment-photos` — photo uploads
- `apartment-videos` — video uploads

## Common Patterns

- Components receive `canEdit` prop to toggle between read-only and editable views.
- Apartment detail loads media, comments, and amenities in parallel via `Promise.all` in `useEffect`.
- Geocoding happens on address field blur in `AddApartmentModal` and retries on form submit if coordinates are missing.
- Commute times are calculated in the background after apartment creation for all project locations and all travel modes (driving, transit, walking, bicycling).

## Testing

- Test setup: Jest + React Testing Library (configured via react-scripts)
- Run: `npm test`
