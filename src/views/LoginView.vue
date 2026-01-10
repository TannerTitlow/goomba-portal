<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'

const router = useRouter()
const loading = ref(false)
const error = ref(null)

const signInWithSpotify = async () => {
  try {
    loading.value = true
    error.value = null

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signInError) throw signInError
  } catch (err) {
    console.error('Error signing in:', err)
    error.value = err.message || 'Failed to sign in with Spotify'
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
    <!-- Portal Glow Effect -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl animate-glow"></div>

    <!-- Main Content -->
    <div class="relative z-10 text-center max-w-md px-4">
      <!-- Logo Section -->
      <div class="mb-8">
        <div class="inline-block px-6 py-2 border border-green-500/30 bg-black mb-6">
          <span class="text-green-500 font-mono text-xs uppercase tracking-widest">Portal Access</span>
        </div>
      </div>

      <!-- Heading -->
      <h1
        class="text-4xl mb-6 uppercase tracking-wider"
        style="font-family: 'Coder', 'Courier New', monospace; font-weight: 400;"
      >
        <span class="gradient-text">Authenticate</span>
      </h1>

      <p class="text-sm text-gray-400 mb-12 font-light">
        Band members only. Sign in with Spotify to access the portal.
      </p>

      <!-- Error Message -->
      <div v-if="error" role="alert" class="mb-8 p-4 border border-red-500/30 bg-red-500/5">
        <p class="text-red-500 text-sm">{{ error }}</p>
      </div>

      <!-- Spotify Sign In Button -->
      <button
        @click="signInWithSpotify"
        :disabled="loading"
        :aria-busy="loading"
        :aria-label="loading ? 'Connecting to Spotify' : 'Sign in with Spotify'"
        class="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-black transition-all duration-300 uppercase tracking-wider text-sm font-mono font-bold"
      >
        <svg
          v-if="!loading"
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ loading ? 'Connecting...' : 'Sign in with Spotify' }}</span>
      </button>

      <!-- Back to Home Link -->
      <div class="mt-8">
        <router-link
          to="/"
          class="text-xs text-gray-500 hover:text-green-500 uppercase tracking-widest transition-colors"
        >
          ← Back to Home
        </router-link>
      </div>
    </div>
  </div>
</template>
