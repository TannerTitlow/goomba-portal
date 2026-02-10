import { ref } from 'vue'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'

// Constants
const SPOTIFY_TOKEN_EXPIRY_SECONDS = 3600 // 1 hour
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000 // 2 minutes
const TOKEN_VALIDITY_BUFFER_MS = 60 * 1000 // 1 minute
const MAX_REFRESH_RETRIES = 3
const RETRY_DELAY_MS = 1000 // Start with 1 second, exponential backoff

// Development mode logging (disable in production)
const DEBUG_MODE = import.meta.env.DEV
const log = (...args) => DEBUG_MODE && console.log(...args)
const logError = (...args) => console.error(...args)

const user = ref(null)
const session = ref(null)
const loading = ref(true)

let initialized = false
let authSubscription = null
let refreshTimeoutId = null
let refreshPromise = null // Prevents concurrent refresh attempts
let providerTokensStored = false // Prevents duplicate provider token storage
let routerInstance = null // Store router instance for automatic redirects

// Spotify token management (Supabase provider tokens)

/**
 * Retrieves stored Spotify token data from sessionStorage
 * @returns {Object|null} Token data with accessToken, refreshToken, and expiresAt
 */
function getStoredTokenData() {
  try {
    const tokenData = sessionStorage.getItem('spotify_token_data')
    return tokenData ? JSON.parse(tokenData) : null
  } catch (err) {
    logError('[useAuth] Error parsing token data:', err)
    return null
  }
}

// Spotify Playback token management (separate OAuth for streaming)

/**
 * Retrieves stored Spotify playback token data from sessionStorage
 * @returns {Object|null} Token data with accessToken, refreshToken, and expiresAt
 */
function getStoredPlaybackTokenData() {
  try {
    const tokenData = sessionStorage.getItem('spotify_playback_token_data')
    return tokenData ? JSON.parse(tokenData) : null
  } catch (err) {
    logError('[useAuth] Error parsing playback token data:', err)
    return null
  }
}

/**
 * Stores Spotify playback token data in sessionStorage
 * @param {string} accessToken - Spotify access token with streaming scope
 * @param {string} refreshToken - Spotify refresh token
 * @param {number} expiresIn - Token expiry time in seconds
 */
function storePlaybackTokenData(accessToken, refreshToken, expiresIn) {
  // Validate inputs
  if (!accessToken || typeof accessToken !== 'string') {
    logError('[useAuth] Invalid playback access token')
    return
  }
  if (typeof expiresIn !== 'number' || expiresIn <= 0) {
    logError('[useAuth] Invalid expiresIn, using default')
    expiresIn = SPOTIFY_TOKEN_EXPIRY_SECONDS
  }

  const tokenData = {
    accessToken,
    refreshToken: refreshToken || null, // Refresh token is optional
    expiresAt: Date.now() + expiresIn * 1000,
  }
  sessionStorage.setItem('spotify_playback_token_data', JSON.stringify(tokenData))
  log('[useAuth] Stored Spotify playback token data')
}

/**
 * Clears stored playback token data
 */
function clearPlaybackTokenData() {
  sessionStorage.removeItem('spotify_playback_token_data')
  log('[useAuth] Cleared playback token data')
}

/**
 * Gets a valid playback token (returns null if expired or missing)
 * @returns {string|null} Valid access token or null
 */
function getValidPlaybackToken() {
  const tokenData = getStoredPlaybackTokenData()
  if (!tokenData || !tokenData.accessToken) {
    return null
  }

  // Check if token is expired (with buffer)
  const isExpired = tokenData.expiresAt - Date.now() < TOKEN_VALIDITY_BUFFER_MS
  if (isExpired) {
    log('[useAuth] Playback token expired')
    return null
  }

  return tokenData.accessToken
}

/**
 * Stores Spotify token data in sessionStorage
 * @param {string} accessToken - Spotify access token
 * @param {string} refreshToken - Spotify refresh token
 * @param {number} expiresIn - Token expiry time in seconds
 */
function storeTokenData(accessToken, refreshToken, expiresIn) {
  // Validate inputs
  if (!accessToken || typeof accessToken !== 'string') {
    logError('[useAuth] Invalid access token')
    return
  }
  if (!refreshToken || typeof refreshToken !== 'string') {
    logError('[useAuth] Invalid refresh token')
    return
  }
  if (typeof expiresIn !== 'number' || expiresIn <= 0) {
    logError('[useAuth] Invalid expiresIn, using default')
    expiresIn = SPOTIFY_TOKEN_EXPIRY_SECONDS
  }

  const tokenData = {
    accessToken,
    refreshToken,
    // Store absolute expiration time
    expiresAt: Date.now() + expiresIn * 1000,
  }
  sessionStorage.setItem('spotify_token_data', JSON.stringify(tokenData))
  log('[useAuth] Stored Spotify token data')
}

function clearTokenData() {
  sessionStorage.removeItem('spotify_token_data')
  clearPlaybackTokenData() // Also clear playback tokens
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId)
    refreshTimeoutId = null
  }
  refreshPromise = null
  providerTokensStored = false
}

/**
 * Schedules the next token refresh check based on exact token expiration
 * @param {number} delayMs - Delay in milliseconds until token expires
 */
function scheduleTokenRefresh(delayMs) {
  if (refreshTimeoutId) clearTimeout(refreshTimeoutId)

  // Ensure delay is never negative
  const safeDelay = Math.max(0, delayMs - TOKEN_REFRESH_BUFFER_MS)

  log(
    `[useAuth] Next refresh check scheduled in ${Math.round(safeDelay / 1000 / 60)} minutes`,
  )

  refreshTimeoutId = setTimeout(async () => {
    await checkAndRefreshIfNeeded()
  }, safeDelay)
}

/**
 * Checks if token is valid, expired, or about to expire and handles refresh
 */
async function checkAndRefreshIfNeeded() {
  const tokenData = getStoredTokenData()

  // If no token, stop.
  if (!tokenData?.refreshToken) return

  const timeUntilExpiry = tokenData.expiresAt - Date.now()

  // If expired or expiring very soon, refresh NOW with retry logic
  if (timeUntilExpiry < TOKEN_REFRESH_BUFFER_MS) {
    log('[useAuth] Token expiring soon or expired. Refreshing now...')
    try {
      await refreshSpotifyTokenWithRetry()
    } catch (err) {
      logError('[useAuth] Scheduled refresh failed after retries:', err)
      // User will be signed out when next API call fails
    }
  } else {
    // Token is still good. Schedule the timer for the remaining time.
    scheduleTokenRefresh(timeUntilExpiry)
  }
}

/**
 * Refreshes Spotify token using Supabase Edge Function (server-side)
 * Uses race condition protection to prevent concurrent refresh attempts
 * @returns {Promise<string>} New access token
 */
async function refreshSpotifyToken() {
  // Race condition protection: if a refresh is already in progress, return that promise
  if (refreshPromise) {
    log('[useAuth] Refresh already in progress, waiting for existing refresh...')
    return refreshPromise
  }

  // Create new refresh promise
  refreshPromise = (async () => {
    try {
      log('[useAuth] Refreshing Spotify token via Edge Function...')

      const tokenData = getStoredTokenData()
      if (!tokenData?.refreshToken) {
        throw new Error('No refresh token available')
      }

      // Get the current Supabase session for authentication
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!currentSession) {
        throw new Error('No active session')
      }

      // Call our Supabase Edge Function to refresh the token
      const { data, error } = await supabase.functions.invoke('refresh-spotify-token', {
        body: {
          refresh_token: tokenData.refreshToken,
        },
      })

      if (error) {
        logError('[useAuth] Edge Function call failed:', error)
        throw error
      }

      if (!data?.access_token) {
        throw new Error('No access token in response')
      }

      // Store the new token data
      const newRefreshToken = data.refresh_token || tokenData.refreshToken
      const expiresIn = data.expires_in || SPOTIFY_TOKEN_EXPIRY_SECONDS
      storeTokenData(data.access_token, newRefreshToken, expiresIn)

      log('[useAuth] Token refreshed successfully via Edge Function')

      // Schedule next refresh based on new expiry
      scheduleTokenRefresh(expiresIn * 1000)

      return data.access_token
    } catch (err) {
      logError('[useAuth] Token refresh failed:', err)
      clearTokenData()
      await performSignOut()
      throw new Error('Spotify session expired. You have been signed out.')
    } finally {
      // Clear the promise once done (success or failure)
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Refreshes Spotify token with exponential backoff retry logic
 * @param {number} attempt - Current retry attempt (default 0)
 * @returns {Promise<string>} New access token
 */
async function refreshSpotifyTokenWithRetry(attempt = 0) {
  try {
    return await refreshSpotifyToken()
  } catch (err) {
    if (attempt < MAX_REFRESH_RETRIES - 1) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt) // Exponential backoff
      logError(`[useAuth] Refresh attempt ${attempt + 1} failed, retrying in ${delay}ms...`)

      await new Promise((resolve) => setTimeout(resolve, delay))
      return refreshSpotifyTokenWithRetry(attempt + 1)
    }

    // Max retries reached
    throw err
  }
}

// Visibility Handler - check token when tab becomes visible
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      log('[useAuth] Tab visible, verifying token status...')
      checkAndRefreshIfNeeded()
    }
  })
}

/**
 * Gets a valid Spotify access token, refreshing if necessary
 * @returns {Promise<string>} Valid Spotify access token
 * @throws {Error} If no session exists or refresh fails
 */
async function getValidSpotifyToken() {
  // First check session for fresh provider token (just after OAuth callback)
  const providerToken = session.value?.provider_token
  const providerRefreshToken = session.value?.provider_refresh_token

  // Only store provider tokens once to avoid duplicate scheduling
  if (providerToken && providerRefreshToken && !providerTokensStored) {
    storeTokenData(providerToken, providerRefreshToken, SPOTIFY_TOKEN_EXPIRY_SECONDS)
    providerTokensStored = true
    // Kick off the schedule
    scheduleTokenRefresh(SPOTIFY_TOKEN_EXPIRY_SECONDS * 1000)
    return providerToken
  }

  // Check stored token
  const tokenData = getStoredTokenData()

  if (!tokenData) {
    await performSignOut()
    throw new Error('No Spotify session found. You have been signed out.')
  }

  // Check if token is still valid (with buffer)
  if (Date.now() < tokenData.expiresAt - TOKEN_VALIDITY_BUFFER_MS) {
    return tokenData.accessToken
  }

  // Token expired or expiring soon, refresh it via Edge Function
  return await refreshSpotifyToken()
}

/**
 * Signs out the user and clears all auth state
 * @param {boolean} autoRedirect - If true, automatically redirect to login (for background signouts)
 */
async function performSignOut(autoRedirect = true) {
  const { error } = await supabase.auth.signOut()
  if (error) {
    logError('[useAuth] Error signing out:', error)
  }
  // Also clear our local state
  clearTokenData()
  user.value = null
  session.value = null

  // Auto-redirect to login for background signouts (token failures, etc.)
  if (autoRedirect && routerInstance && routerInstance.currentRoute.value.name !== 'login') {
    log('[useAuth] Background signout detected, redirecting to login...')
    routerInstance.push({ name: 'login' })
  }
}

/**
 * Initializes authentication state and sets up auth state listener
 */
async function initializeAuth() {
  if (initialized) return
  initialized = true

  try {
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession()
    if (error) throw error

    session.value = currentSession
    user.value = currentSession?.user ?? null
    loading.value = false

    // Initial check on load
    if (currentSession) {
      checkAndRefreshIfNeeded()
    }
  } catch (err) {
    logError('[useAuth] Error getting session:', err)
    loading.value = false
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, currentSession) => {
    log(`[useAuth] Auth state change: ${event}`)
    try {
      session.value = currentSession
      user.value = currentSession?.user ?? null
      loading.value = false

      if (event === 'SIGNED_OUT') {
        clearTokenData()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAndRefreshIfNeeded()
      }
    } catch (err) {
      logError('[useAuth] Error handling auth state change:', err)
    }
  })

  authSubscription = subscription
}

/**
 * Cleans up auth subscriptions and timers
 * Call this when the app is being unmounted (e.g., in App.vue onUnmount)
 */
function cleanupAuth() {
  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
  }
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId)
    refreshTimeoutId = null
  }
  refreshPromise = null
  log('[useAuth] Auth cleanup completed')
}

/**
 * Composable for authentication state and Spotify token management
 * @returns {Object} Auth state and methods
 */
export function useAuth() {
  const router = useRouter()

  // Store router instance for background signouts
  if (!routerInstance) {
    routerInstance = router
  }

  if (!initialized) {
    initializeAuth()
  }

  const signOut = async (toRoute = 'home') => {
    // Manual signout - don't auto-redirect, we'll handle it here
    await performSignOut(false)
    // Redirect to specified route (default: home)
    if (router.currentRoute.value.name !== toRoute) {
      log(`[useAuth] Manual signout, redirecting to ${toRoute}...`)
      router.push({ name: toRoute })
    }
  }

  const checkAuth = async () => {
    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()
      if (error) throw error

      session.value = currentSession
      user.value = currentSession?.user ?? null
      return !!currentSession
    } catch (err) {
      logError('[useAuth] Error getting session:', err)
      return false
    }
  }

  return {
    user,
    session,
    loading,
    signOut,
    checkAuth,
    storeTokenData,
    getValidSpotifyToken,
    refreshSpotifyToken,
    cleanupAuth,
    // Playback token management
    storePlaybackTokenData,
    getValidPlaybackToken,
    clearPlaybackTokenData,
  }
}
