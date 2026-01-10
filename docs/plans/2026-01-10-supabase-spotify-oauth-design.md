# Supabase Spotify OAuth Integration Design

**Date:** 2026-01-10
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Overview

This design implements Spotify authentication for the Goomba Portal using Supabase's built-in OAuth provider. This replaces the partially-implemented custom OAuth flow with a more secure, maintainable solution.

## Goals

- Enable band members to authenticate using their Spotify accounts
- Provide a dedicated login page with "Enter Portal" button on home page
- Protect dashboard and future features behind authentication
- Maintain portal's visual aesthetic (black background, green accents)
- Keep Spotify client secrets secure (server-side only)

## Architecture

### Authentication Flow

1. User visits home page (public) → clicks "Enter Portal" button
2. Redirects to `/login` page
3. User clicks "Sign in with Spotify"
4. Supabase handles OAuth with Spotify (redirects to Spotify, then back to Supabase)
5. Supabase redirects to app at `/auth/callback`
6. Callback handler extracts session, stores it, redirects to `/dashboard`
7. Protected routes check for valid session, redirect to `/login` if not authenticated

### Core Approach

Use Supabase's built-in Spotify OAuth provider instead of custom implementation. Supabase handles the entire OAuth flow server-side, keeping client secrets secure and managing token refresh automatically.

## Implementation Details

### New Routes

```javascript
/login → LoginView.vue (public)
/auth/callback → AuthCallbackView.vue (public, handles Supabase redirect)
/dashboard → DashboardView.vue (protected, requires authentication)
```

### Components & Views

**LoginView.vue**
- Clean design matching portal aesthetic (black background, green accents)
- Single "Sign in with Spotify" button
- Calls `supabase.auth.signInWithOAuth({ provider: 'spotify' })`
- Shows loading state during redirect

**AuthCallbackView.vue**
- Replaces current `SpotifyCallbackView.vue`
- Extracts session from URL using Supabase helpers
- Success path: Session exists → redirect to `/dashboard`
- Error path: No session or error param → redirect to `/login` with error message
- Shows loading state during processing

**DashboardView.vue**
- Placeholder view for authenticated users
- Displays user info (Spotify display name, profile image)
- Shows navigation/links to future features
- "Sign Out" button calling `supabase.auth.signOut()`
- Matches portal aesthetic

**HomeView.vue Updates**
- Add "Enter Portal" button below feature badges
- Style prominently (larger, more emphasis than feature badges)
- Links to `/login` route

### Auth State Management

**Auth Composable (`src/composables/useAuth.js`)**

Provides:
- `user` - Reactive ref with current user data (null if not authenticated)
- `session` - Reactive ref with current session (null if not authenticated)
- `loading` - Boolean indicating if auth state is being determined
- `signOut()` - Function to log out user
- `checkAuth()` - Function to verify current session

Implementation:
- Subscribes to Supabase auth state changes via `onAuthStateChange`
- Updates reactive refs when auth state changes
- Persists across component lifecycle
- Reusable in any component: `const { user, session, loading, signOut } = useAuth()`

**Route Guard (`src/router/index.js`)**

Global `beforeEach` navigation guard that:
1. Checks if route requires authentication via `meta.requiresAuth` field
2. If protected and user not authenticated → redirect to `/login`
3. If protected and user authenticated → allow navigation
4. Stores intended destination for redirect after login
5. Waits for auth to initialize before making routing decisions

Route meta field pattern:
```javascript
// Protected route
{ path: '/dashboard', meta: { requiresAuth: true } }

// Public route
{ path: '/login', meta: { requiresAuth: false } }
```

## Configuration

### Supabase Dashboard Setup

1. Navigate to Authentication → Providers → Spotify
2. Enable Spotify provider
3. Enter Spotify Client ID and Client Secret
4. Set redirect URL to: `https://<your-project>.supabase.co/auth/v1/callback`
5. In URL Configuration, set site URL to your app's URL:
   - Development: `http://localhost:5173`
   - Production: Your production URL

### Spotify Developer Dashboard Setup

Update redirect URIs to include:
- `https://<your-project>.supabase.co/auth/v1/callback`

Remove old redirect URI:
- ~~`http://127.0.0.1:5173/spotify/callback`~~ (no longer needed)

### Environment Variables

**Updated `.env.example`:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Spotify Configuration (Optional)
# Only needed if you want to display Spotify branding/info
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
```

**Removed:**
- `VITE_SPOTIFY_CLIENT_SECRET` - No longer needed in frontend (stays in Supabase)
- `VITE_SPOTIFY_REDIRECT_URI` - Handled by Supabase

## Cleanup

### Files to Delete
- `src/views/SpotifyCallbackView.vue` (replaced by `AuthCallbackView.vue`)

### Files to Update
- `.env.example` - Remove `VITE_SPOTIFY_CLIENT_SECRET` and `VITE_SPOTIFY_REDIRECT_URI`
- `src/router/routes.js` - Remove `/spotify/callback` route, add new routes
- `CLAUDE.md` - Update documentation to reflect Supabase OAuth approach

## Future: Accessing Spotify APIs

When implementing features that need Spotify API access (setlists, playlists, etc.):

```javascript
const { data: { session } } = await supabase.auth.getSession()
const spotifyAccessToken = session.provider_token
// Use this token to call Spotify Web API
```

Supabase automatically manages and refreshes this token.

## Benefits

1. **Security** - Client secrets stay server-side in Supabase
2. **Simplicity** - No manual OAuth flow implementation
3. **Token Management** - Automatic token refresh handled by Supabase
4. **Scalability** - Easy to add `requiresAuth` to any future route
5. **Unified Auth** - Single auth system for current and future providers
6. **Maintainability** - Less custom code to maintain

## Trade-offs

- Dependency on Supabase for auth (acceptable given we're already using Supabase)
- Slightly less control over OAuth flow (not needed for this use case)
- Additional redirect hop through Supabase (negligible UX impact)
