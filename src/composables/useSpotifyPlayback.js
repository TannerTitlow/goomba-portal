import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

// Development mode logging (disable in production)
const DEBUG_MODE = import.meta.env.DEV
const log = (...args) => DEBUG_MODE && console.log(...args)
const logError = (...args) => console.error(...args)

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

// Get redirect URI - must match what's registered in Spotify dashboard
function getRedirectUri() {
  const isDev = import.meta.env.DEV
  if (isDev) {
    // Use IPv6 loopback [::1] for local dev - this must match Spotify dashboard config
    const port = window.location.port || '5173'
    return `http://[::1]:${port}/auth/spotify-playback-callback`
  }
  // Production: use actual origin
  return `${window.location.origin}/auth/spotify-playback-callback`
}

// Module-level state (singleton pattern)
const isAuthenticating = ref(false)

export function useSpotifyPlayback() {
  const { storePlaybackTokenData, getValidPlaybackToken: getValidTokenFromAuth, clearPlaybackTokenData } = useAuth()

  // Check if we have a valid playback token
  const hasValidToken = computed(() => {
    return !!getValidTokenFromAuth()
  })

  // Store token using useAuth
  function storeToken(accessToken, refreshToken, expiresIn) {
    log('[useSpotifyPlayback] Storing playback token:', accessToken.substring(0, 20) + '...', 'expires in', expiresIn, 'seconds')
    storePlaybackTokenData(accessToken, refreshToken, expiresIn)
  }

  // Clear stored token
  function clearStoredToken() {
    clearPlaybackTokenData()
    localStorage.removeItem('spotify_pkce_verifier')
  }

  // Generate PKCE challenge
  function generateCodeVerifier() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    )
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  // Start OAuth flow
  async function startAuth() {
    if (!SPOTIFY_CLIENT_ID) {
      throw new Error('Spotify Client ID not configured')
    }

    isAuthenticating.value = true

    try {
      // Generate PKCE verifier and challenge
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)

      // Store verifier for callback
      localStorage.setItem('spotify_pkce_verifier', verifier)

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: getRedirectUri(),
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state: generateCodeVerifier(), // Random state for CSRF protection
      })

      // Redirect to Spotify authorization
      window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`
    } catch (err) {
      logError('[useSpotifyPlayback] Error starting auth:', err)
      isAuthenticating.value = false
      throw err
    }
  }

  // Handle OAuth callback
  async function handleCallback(code) {
    if (!code) {
      throw new Error('No authorization code provided')
    }

    try {
      // Get stored PKCE verifier
      const verifier = localStorage.getItem('spotify_pkce_verifier')
      if (!verifier) {
        throw new Error('PKCE verifier not found')
      }

      // Exchange code for token
      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: getRedirectUri(),
          code_verifier: verifier,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error_description || 'Failed to exchange code')
      }

      const data = await response.json()

      // Store the token (including refresh token)
      storeToken(data.access_token, data.refresh_token, data.expires_in)

      // Clean up
      localStorage.removeItem('spotify_pkce_verifier')

      log('[useSpotifyPlayback] Token obtained successfully')
      return true
    } catch (err) {
      logError('[useSpotifyPlayback] Error handling callback:', err)
      clearStoredToken()
      throw err
    }
  }

  // Get a valid token from useAuth
  function getValidToken() {
    return getValidTokenFromAuth()
  }

  return {
    hasValidToken,
    isAuthenticating,
    startAuth,
    handleCallback,
    getValidToken,
    clearStoredToken,
  }
}
