<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSpotifyPlayback } from '@/composables/useSpotifyPlayback'

const router = useRouter()
const error = ref(null)
const { handleCallback } = useSpotifyPlayback()

onMounted(async () => {
  console.log('[SpotifyPlaybackCallback] Processing playback OAuth callback...')

  try {
    // Get authorization code from URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      throw new Error(`Spotify authorization failed: ${errorParam}`)
    }

    if (!code) {
      throw new Error('No authorization code received')
    }

    // Exchange code for token
    await handleCallback(code)

    console.log('[SpotifyPlaybackCallback] Playback token obtained, redirecting...')

    // Redirect to dashboard
    router.push('/dashboard')
  } catch (err) {
    console.error('[SpotifyPlaybackCallback] Error:', err)
    error.value = err.message
  }
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-black text-white"
  >
    <div class="text-center">
      <div v-if="!error" class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"
        ></div>
        <p class="text-sm text-gray-400">Setting up playback...</p>
      </div>

      <div v-else class="max-w-md px-4">
        <div
          class="p-4 border border-red-500/30 bg-red-500/5 mb-4"
        >
          <p class="text-red-500 text-sm break-words">{{ error }}</p>
        </div>
        <router-link
          to="/login"
          class="text-green-500 hover:text-green-400 text-sm"
        >
          ← Back to login
        </router-link>
      </div>
    </div>
  </div>
</template>
