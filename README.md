# Haus Note

A collaborative apartment hunting app. Create a search project, invite roommates or partners, and track every listing with photos, notes, ratings, commute times, and more — all in one place.

## Features

**Project-Based Organization**
- Create separate projects for each apartment search (e.g., "NYC Fall 2026")
- Set city, budget range, and target move-in date
- Invite collaborators as owners, editors, or viewers

**Apartment Tracking**
- Add apartments with address, price, bedrooms, bathrooms, square footage, and neighborhood
- Automatic geocoding — addresses are placed on the map instantly
- Track status through the pipeline: Interested, Visited, Applied, Rejected, Accepted
- 5-star rating system
- Notes and listing URL for each apartment

**Media**
- Upload photos and videos per apartment
- Gallery view with thumbnail navigation
- First uploaded photo serves as the apartment thumbnail in list and card views

**Amenities**
- 12 preset amenities with icons (Gym, Parking, Balcony, Elevator, Dishwasher, etc.)
- Add custom amenities for anything not in the presets
- Toggle amenities on/off with a single click

**Commute Times**
- Add commute destinations (work, school, gym, etc.) at the project level
- Automatic commute calculation for every apartment to every destination
- Four travel modes: driving, transit, walking, bicycling
- Direct link to Google Maps directions

**Collaboration**
- Role-based access control (owner / editor / viewer)
- Invite collaborators via email with secure token links
- Comments on each apartment for team discussion
- Activity logging for all changes

**Map View**
- Interactive Google Map showing all apartments with price markers
- Click markers to select and view apartment details
- Split-pane layout: list on the left, map on the right

**Mobile**
- iOS and Android support via Capacitor
- Responsive layout with safe area handling for notch devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 3 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Maps | Google Maps JavaScript API, Geocoding, Distance Matrix |
| Mobile | Capacitor (iOS / Android) |
| Routing | React Router v7 |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key) with Geocoding, Distance Matrix, and Maps JavaScript APIs enabled

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-username/haus-note.git
cd haus-note
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the project root:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

4. **Set up Supabase**

Create the following tables in your Supabase project (see [Database Schema](#database-schema) below):
- `user_profiles`, `projects`, `project_members`, `project_invitations`
- `apartments`, `apartment_media`, `apartment_comments`
- `amenities`, `brokers`, `apartment_brokers`
- `commute_locations`, `apartment_commutes`
- `activity_logs`

Create two storage buckets:
- `apartment-photos`
- `apartment-videos`

5. **Start the development server**

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Production build to `build/` |
| `npm test` | Run tests |
| `npm run cap:sync` | Sync web build to native projects |
| `npm run cap:ios` | Build, sync, and open in Xcode |
| `npm run cap:android` | Build, sync, and open in Android Studio |

## Mobile Development

Haus Note uses [Capacitor](https://capacitorjs.com) to run as a native iOS and Android app.

### iOS

Requires Xcode (Mac App Store) and CocoaPods.

```bash
# First time setup
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios

# Build and open in Xcode
npm run cap:ios
```

In Xcode, select a simulator or device and press Play.

### Android

Requires [Android Studio](https://developer.android.com/studio).

```bash
npm install @capacitor/android
npx cap add android
npm run cap:android
```

## Project Structure

```
src/
  pages/              Route-level views
    AuthPage.tsx        Login / signup
    ProjectDashboard.tsx  Project list
    ProjectPage.tsx     Main app view (list + map)
    InvitePage.tsx      Invitation acceptance
  components/         Reusable UI
    ApartmentDetail.tsx   Full apartment modal
    ApartmentCard.tsx     Card for grid view
    ApartmentListItem.tsx Row for list view
    ApartmentMap.tsx      Google Maps integration
    AddApartmentModal.tsx Create apartment form
    AmenityPicker.tsx     Amenity selection
    CommentSection.tsx    Comments
    CommuteTimes.tsx      Commute display
    CommuteLocations.tsx  Manage destinations
    MediaUploader.tsx     Photo/video upload
    ShareProjectModal.tsx Invite collaborators
    EditProjectModal.tsx  Project settings
  services/           API layer (one per domain)
  types/              TypeScript interfaces
  lib/                Supabase client config
ios/                  Capacitor iOS project
```

## Database Schema

### Core Tables

**projects** — Search projects with city, budget, and move-in date target.

**apartments** — Individual listings linked to a project. Tracks address, price, bedrooms, bathrooms, square footage, status, rating, neighborhood, and coordinates.

**project_members** — Links users to projects with a role: `owner`, `editor`, or `viewer`.

**project_invitations** — Pending email invitations with secure tokens (7-day expiry).

### Apartment Data

**apartment_media** — Photos and videos stored in Supabase Storage. References a `storage_path` and `media_type`.

**apartment_comments** — User comments on apartments.

**amenities** — Named amenities (e.g., "Gym", "Parking") linked to apartments.

**brokers** / **apartment_brokers** — Broker contacts linked to apartments.

### Commute

**commute_locations** — Project-level destinations (work, school, etc.) with coordinates.

**apartment_commutes** — Cached commute durations (driving, transit, walking, bicycling) between each apartment and each commute location.

### Activity

**activity_logs** — Tracks all user actions (apartment created, status changed, comment added, etc.).

## Roles and Permissions

| Action | Owner | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View apartments | Yes | Yes | Yes |
| Add/edit apartments | Yes | Yes | No |
| Upload media | Yes | Yes | No |
| Add comments | Yes | Yes | No |
| Toggle amenities | Yes | Yes | No |
| Invite members | Yes | Yes | No |
| Edit project settings | Yes | No | No |
| Delete project | Yes | No | No |

## License

ISC
