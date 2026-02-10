# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goomba Portal is a band management portal for Smooth Goomba, built as a Vue 3 single-page application with Vite. The application features collaborative setlist management with Spotify integration, allowing band members to organize songs into lists, assign instruments/parts, and track learning progress through a Trello-style interface.

## Development Commands

- **Start dev server**: `npm run dev` (runs on port 5173)
- **Build for production**: `npm run build` (outputs to `dist/`)
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install` or `npm ci` (use `npm ci` in CI/CD)

## Tech Stack

- **Frontend**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 6
- **Routing**: Vue Router 4
- **State Management**: Composables pattern (no Vuex/Pinia)
- **Styling**: Tailwind CSS 4 + DaisyUI 5 + Sass
- **UI Libraries**:
  - `lucide-vue-next` - Icon components
  - `vuedraggable` / `sortablejs` - Drag-and-drop functionality
  - `@vueuse/core` - Vue composition utilities
- **Backend**: Supabase (authentication, database, real-time subscriptions)
  - Spotify OAuth via Supabase Auth Provider
  - Spotify Web API integration for track search

## Architecture & Code Conventions

### Project Structure

- `src/main.js` - Application entry point, initializes Vue app with router
- `src/App.vue` - Root component (simple RouterView wrapper)
- `src/router/` - Vue Router configuration
  - `index.js` - Router instance with history mode and auth guards
  - `routes.js` - Route definitions with lazy loading for non-home views
- `src/views/` - Page-level components
  - `HomeView.vue` - Landing page with particle animation
  - `DashboardView.vue` - Main dashboard (protected route)
  - `Auth/` - Authentication views (LoginView, AuthCallbackView)
  - `Profile/` - User profile management
  - `Setlists/` - Setlist management interface (Trello-style)
- `src/components/` - Reusable Vue components organized by feature
  - `Setlists/` - Setlist columns, song cards, modals, drag-and-drop
  - `Assignments/` - Assignment cards and badges
  - `Profiles/` - Profile forms and avatar components
  - `AppHeader.vue` - Main navigation header
- `src/composables/` - Composition API logic (state management, API calls)
  - `useAuth.js` - Authentication state and Spotify token management
  - `useSpotify.js` - Spotify Web API integration
  - `useSetlists.js` - Setlist CRUD and real-time subscriptions
  - `useListSongs.js` - Song-to-list associations (join table operations)
  - `useSongs.js` - Song catalog management
  - `useSongAssignments.js` - Instrument assignments and progress tracking
  - `useInstruments.js` - Instrument catalog
  - `useProfiles.js` - User profile management
- `src/utils/` - Utility functions and service clients
  - `supabase.js` - Supabase client initialization
  - `Themes.js` - Theme management utilities
- `src/assets/` - Static assets
  - `styles/` - Global SCSS files (imports Tailwind/DaisyUI, custom fonts, animations)
  - `fonts/` - Custom fonts (Circular from Spotify, Coder monospace)
  - `icons/` - SVG icons
  - `images/` - Image assets

### Routing

Routes use meta fields for page titles and auth requirements. The router uses `createWebHistory` with BASE_URL support for GitHub Pages deployment. Non-home routes are lazy-loaded with dynamic imports.

**Protected Routes:** Routes with `meta.requiresAuth: true` are guarded by navigation guards in `src/router/index.js`. Unauthenticated users are redirected to `/login`.

### Composables Pattern

The app uses Vue 3 Composition API composables for state management instead of Vuex/Pinia. Each composable encapsulates:
- Reactive state (`ref`, `computed`)
- API calls to Supabase
- Real-time subscription setup
- Error handling

**Composable Conventions:**
- Export a function that returns reactive refs and methods
- Handle loading and error states within the composable
- Use Supabase client from `@/utils/supabase`
- Include real-time subscription functions where needed
- Log errors for debugging (check console in dev mode)

**Example Pattern:**
```javascript
export function useFeature() {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchItems() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('table').select()
      if (fetchError) throw fetchError
      items.value = data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function subscribeToItems() {
    return supabase.channel('items-changes')
      .on('postgres_changes', { ... }, callback)
      .subscribe()
  }

  return { items, loading, error, fetchItems, subscribeToItems }
}
```

### Setlist Management Feature

The core feature is a Trello-style collaborative setlist manager where band members organize songs into lists, assign instruments, and track progress.

**Key Concepts:**
- **Lists** - Flexible containers for organizing songs (setlists, learning queues, archives)
- **Songs** - Spotify tracks added to lists with band-specific metadata
- **Assignments** - Track who plays what instrument on each song with progress status

**Data Model:**
- `lists` - Setlist containers (name, description, position)
- `songs` - Song catalog with Spotify metadata (spotify_id, title, artist, etc.)
- `list_songs` - Many-to-many join table (songs can appear in multiple lists)
- `song_assignments` - Instrument assignments per song (user, instrument, status, difficulty)
- `instruments` - Predefined instrument types (Guitar, Bass, Drums, etc.)
- `profiles` - Extended user profiles (display_name, avatar, bio)

**Real-time Collaboration:**
All list, song, and assignment changes broadcast via Supabase real-time subscriptions. Components automatically reflect updates from other band members.

**Drag-and-Drop:**
- Horizontal column drag: Reorder lists using vuedraggable on list array
- Vertical song drag: Reorder songs within a list using vuedraggable on song array
- Cross-list drag: Copy/move songs between lists (handled via `copySongToList`)
- Touch support: Drag handlers use delay for mobile compatibility

### Styling Conventions

- **Global styles**: `src/assets/styles/main.scss` imports vendor CSS and defines custom fonts/animations
- **Font families**:
  - Primary: `Circular` (Spotify's font, weights 300-900)
  - Monospace: `Coder` (used for headers like "GOOMBA PORTAL")
- **Custom animations**: `float`, `glow`, `gradient-shift` defined in main.scss
- **Utility classes**: `.container-center`, `.gradient-text`, `.animate-float`, `.animate-glow`
- **Theme**: Dark theme with black background (`#000000`), green accent colors (`#00ff88`, `#1db954`)
- **DaisyUI**: Available but minimal usage expected (template comes with example components)

### Responsive Design Guidelines

**IMPORTANT: All new pages and components MUST be mobile-friendly and responsive.**

- **Mobile-first approach**: Start with mobile styles, progressively enhance for larger screens
- **Breakpoints**: Use Tailwind's standard breakpoints
  - Base (default): Mobile devices (< 640px)
  - `sm:` 640px+ (large phones, small tablets)
  - `md:` 768px+ (tablets, small laptops)
  - `lg:` 1024px+ (laptops, desktops)
- **Touch targets**: All interactive elements (buttons, links) must have minimum 44x44px tap area
  - Use `min-h-[44px]` on buttons
  - Add `inline-block py-2` to text links to increase vertical tap area
- **Typography scaling**: Scale text responsively
  - Headers: Start small (e.g., `text-2xl`), scale up with `sm:text-3xl lg:text-4xl`
  - Body text: Use `text-xs sm:text-sm` or `text-sm sm:text-base`
  - Reduce letter-spacing on mobile: `tracking-tight sm:tracking-wide lg:tracking-wider`
- **Spacing**: Reduce padding and margins on mobile
  - Containers: `px-4 sm:px-6 lg:px-8`
  - Sections: `py-6 sm:py-8 lg:py-12`
  - Margins: `mb-4 sm:mb-6 lg:mb-8`
- **Layout patterns**:
  - Stack vertically on mobile: `flex flex-col sm:flex-row`
  - Responsive grids: `grid sm:grid-cols-2 md:grid-cols-3`
  - Full-width buttons on mobile: `w-full sm:w-auto`
- **Visual effects**: Scale down effects on small screens
  - Glows/blur: Reduce size on mobile (e.g., `w-[300px] sm:w-[400px] lg:w-[500px]`)
  - Blur intensity: `blur-2xl sm:blur-3xl`
- **Text overflow**: Prevent text overflow and layout breaking
  - Use `break-words` for error messages and user-generated content
  - Use `truncate max-w-[120px] sm:max-w-none` for text that might overflow on small screens
- **Testing**: Always test responsive layouts at mobile (375px), tablet (768px), and desktop (1440px) widths

### Supabase Integration Patterns

**Real-time Subscriptions:**
Components subscribe to database changes and automatically update. Cleanup subscriptions in `onUnmounted()`:
```javascript
let channel = null

onMounted(async () => {
  await fetchData()
  channel = subscribeToChanges()
})

onUnmounted(() => {
  if (channel) channel.unsubscribe()
})
```

**Query Patterns:**
- Use `.select()` with joined tables for nested data (e.g., `profiles(display_name, avatar)`)
- Use `.eq()`, `.order()`, and filters to narrow queries
- Use `.single()` when expecting one result, `.maybeSingle()` when result may not exist
- Always check for `error` in Supabase responses before using `data`

**Upsert Pattern:**
For assignments, use `upsert` with `onConflict` to handle duplicates:
```javascript
await supabase.from('song_assignments')
  .upsert({ song_id, user_id, instrument_id },
          { onConflict: 'song_id, user_id, instrument_id' })
```

### Canvas Particle System

The HomeView implements a custom Canvas-based particle animation:
- Grid-based particles (1200 particles, responsive to aspect ratio)
- Organic morphing blob effect using layered sine waves
- Particles scale based on distance from blob edge
- Animation runs at 60fps via requestAnimationFrame
- Properly cleans up on component unmount

### Environment Variables

Required environment variables (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SPOTIFY_CLIENT_ID` - (Optional) Spotify OAuth client ID for display purposes

**Note**: Spotify authentication is handled by Supabase's OAuth provider. Configure the Spotify provider in your Supabase dashboard with your client ID and secret. The secret never needs to be in your frontend code.

**Note**: Access environment variables using `import.meta.env.VITE_*` (not `process.env`).

### Path Aliases

- `@/` resolves to `src/` directory (configured in vite.config.js)

### Authentication

Authentication is handled by Supabase's built-in Spotify OAuth provider:
- `src/composables/useAuth.js` - Auth state management and token refresh logic
- `src/views/Auth/LoginView.vue` - Login page with Spotify OAuth button
- `src/views/Auth/AuthCallbackView.vue` - Handles OAuth callback from Supabase
- Route guard in `src/router/index.js` protects routes with `meta.requiresAuth: true`

**Spotify Token Management:**
The `useAuth` composable provides `getValidSpotifyToken()` which:
1. Checks if current `provider_token` is still valid
2. Automatically refreshes the session if token is expired
3. Returns a valid token for Spotify API calls
4. Handles refresh failures by signing out and redirecting to login

Always use `getValidSpotifyToken()` instead of accessing `session.value.provider_token` directly when making Spotify API calls.

To add auth protection to a route:
```javascript
{
  path: '/protected',
  component: ProtectedView,
  meta: { requiresAuth: true }
}
```

To make Spotify API calls:
```javascript
const { getValidSpotifyToken } = useAuth()
const token = await getValidSpotifyToken()
// Use token with Spotify Web API
```

## Deployment

- **Primary Platform**: Netlify
  - **SPA Routing**: Configured via `public/_redirects` to serve `index.html` for all routes
  - This allows Vue Router to handle client-side routing for deep links and OAuth callbacks
- **GitHub Pages**: Also configured via `.github/workflows/deploy.yaml`
  - Triggers on push to `master` branch or manual dispatch
  - Builds with `BASE_URL` environment variable from GitHub Pages configuration
  - Deploys `dist/` folder to GitHub Pages
- **Base URL**: Configured via `BASE_URL` environment variable (important for subdirectory deployments)

## Development Workflow

**Working with Features:**
- Feature designs and implementation plans are documented in `docs/plans/`
- Reference `SETLIST-MANAGEMENT-FEATURE-OUTLINE.md` for data model and user stories
- Use the composables pattern for new features requiring state management
- Real-time subscriptions should be set up for collaborative features

**Database Changes:**
- Schema changes are managed via Supabase dashboard (no local migrations yet)
- Document data model changes in feature outline files
- Test real-time subscriptions when adding new tables

## Known Issues & TODOs

- Unit tests not yet implemented
- Some features may need error boundary components for better error handling
- Consider adding optimistic UI updates for better perceived performance
