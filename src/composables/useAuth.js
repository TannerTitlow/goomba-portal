import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

const user = ref(null)
const session = ref(null)
const loading = ref(true)

// Initialize auth listener once globally
let initialized = false
let authSubscription = null

async function initializeAuth() {
  if (initialized) return
  initialized = true

  try {
    // Check current session on app load
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()
    if (error) throw error

    session.value = currentSession
    user.value = currentSession?.user ?? null
    loading.value = false
  } catch (err) {
    console.error('Error getting session:', err)
    loading.value = false
  }

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
    console.log('Auth state change:', event)
    try {
      session.value = currentSession
      user.value = currentSession?.user ?? null
      loading.value = false
    } catch (err) {
      console.error('Error handling auth state change:', err)
    }
  })

  // Store subscription for potential future cleanup
  authSubscription = subscription
}

export function useAuth() {
  // Initialize on first use
  if (!initialized) {
    initializeAuth()
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    // Clear stored Spotify tokens
    localStorage.removeItem('spotify_access_token')
    localStorage.removeItem('spotify_refresh_token')
    localStorage.removeItem('spotify_token_expires_at')
  }

  const checkAuth = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      if (error) throw error

      session.value = currentSession
      user.value = currentSession?.user ?? null
      return !!currentSession
    } catch (err) {
      console.error('Error getting session:', err)
      return false
    }
  }

  return {
    user,
    session,
    loading,
    signOut,
    checkAuth,
  }
}
