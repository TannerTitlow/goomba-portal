import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'

const user = ref(null)
const session = ref(null)
const loading = ref(true)

// Initialize auth listener once globally
let initialized = false

function initializeAuth() {
  if (initialized) return
  initialized = true

  // Check current session on app load
  supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
    session.value = currentSession
    user.value = currentSession?.user ?? null
    loading.value = false
  })

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_event, currentSession) => {
    session.value = currentSession
    user.value = currentSession?.user ?? null
    loading.value = false
  })
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
  }

  const checkAuth = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null
    return !!currentSession
  }

  return {
    user,
    session,
    loading,
    signOut,
    checkAuth,
  }
}
