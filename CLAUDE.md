# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goomba Portal is a band management portal for Smooth Goomba, built as a Vue 3 single-page application with Vite. The project currently displays a "coming soon" landing page with animated particle effects and will expand to include Spotify integration, setlist planning, and band management features.

## Development Commands

- **Start dev server**: `npm run dev` (runs on port 5173)
- **Build for production**: `npm run build` (outputs to `dist/`)
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install` or `npm ci` (use `npm ci` in CI/CD)

## Tech Stack

- **Frontend**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 6
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS 4 + DaisyUI 5 + Sass
- **Backend**: Supabase (authentication and database)
  - Spotify OAuth via Supabase Auth Provider

## Architecture & Code Conventions

### Project Structure

- `src/main.js` - Application entry point, initializes Vue app with router
- `src/App.vue` - Root component (simple RouterView wrapper)
- `src/router/` - Vue Router configuration
  - `index.js` - Router instance with history mode
  - `routes.js` - Route definitions with lazy loading for non-home views
- `src/views/` - Page-level components (HomeView, NotFoundView, SpotifyCallbackView)
- `src/components/` - Reusable Vue components
  - `ComponentsPreview/` - DaisyUI component examples from starter template (kept as reference)
  - `Home/` - Home page specific components from starter template (kept as reference)
- `src/utils/` - Utility functions and service clients
  - `supabase.js` - Supabase client initialization
  - `Themes.js` - Theme management utilities
- `src/assets/` - Static assets
  - `styles/` - Global SCSS files (imports Tailwind/DaisyUI, custom fonts, animations)
  - `fonts/` - Custom fonts (Circular from Spotify, Coder monospace)
  - `icons/` - SVG icons
  - `images/` - Image assets

### Routing

Routes use meta fields for page titles. The router uses `createWebHistory` with BASE_URL support for GitHub Pages deployment. Non-home routes are lazy-loaded with dynamic imports.

### Styling Conventions

- **Global styles**: `src/assets/styles/main.scss` imports vendor CSS and defines custom fonts/animations
- **Font families**:
  - Primary: `Circular` (Spotify's font, weights 300-900)
  - Monospace: `Coder` (used for headers like "GOOMBA PORTAL")
- **Custom animations**: `float`, `glow`, `gradient-shift` defined in main.scss
- **Utility classes**: `.container-center`, `.gradient-text`, `.animate-float`, `.animate-glow`
- **Theme**: Dark theme with black background (`#000000`), green accent colors (`#00ff88`, `#1db954`)
- **DaisyUI**: Available but minimal usage expected (template comes with example components)

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
- `src/composables/useAuth.js` - Auth state management composable
- `src/views/LoginView.vue` - Login page with Spotify OAuth button
- `src/views/AuthCallbackView.vue` - Handles OAuth callback from Supabase
- `src/views/DashboardView.vue` - Protected dashboard for authenticated users
- Route guard in `src/router/index.js` protects routes with `meta.requiresAuth: true`

To add auth protection to a route:
```javascript
{
  path: '/protected',
  component: ProtectedView,
  meta: { requiresAuth: true }
}
```

To access Spotify API tokens in components:
```javascript
const { session } = useAuth()
const spotifyToken = session.value?.provider_token
// Use token to call Spotify Web API
```

## Deployment

- **Primary Platform**: Netlify
- **GitHub Pages**: Also configured via `.github/workflows/deploy.yaml`
  - Triggers on push to `master` branch or manual dispatch
  - Builds with `BASE_URL` environment variable from GitHub Pages configuration
  - Deploys `dist/` folder to GitHub Pages
- **Base URL**: Configured via `BASE_URL` environment variable (important for subdirectory deployments)

## Known Issues & TODOs

- README.md still contains template boilerplate
- Unit tests not yet implemented (noted in README TODO)
