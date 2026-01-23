<script setup>
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { user, session, signOut, loading } = useAuth()
const router = useRouter()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (err) {
    console.error('Error signing out:', err)
  }
}

// Get Spotify user metadata
const getSpotifyName = () => {
  return user.value?.user_metadata?.full_name || user.value?.user_metadata?.name || user.value?.email || 'Band Member'
}

const getSpotifyAvatar = () => {
  return user.value?.user_metadata?.avatar_url || user.value?.user_metadata?.picture
}
</script>

<template>
    <header class="border-b border-green-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-center sm:text-left">
            <h1
              class="text-xl sm:text-2xl uppercase tracking-wide sm:tracking-wider"
              style="font-family: 'Coder', 'Courier New', monospace; font-weight: 400;"
            >
              <span class="gradient-text">GOOMBA PORTAL</span>
            </h1>
            <p class="text-[10px] sm:text-xs text-gray-500 mt-1">Command Center</p>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <!-- User Info -->
            <div v-if="!loading" class="flex items-center gap-2 sm:gap-3">
              <img
                v-if="getSpotifyAvatar()"
                :src="getSpotifyAvatar()"
                alt="Profile"
                class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-500/30"
              />
              <div class="text-center sm:text-right">
                <p class="text-xs sm:text-sm text-gray-300 truncate max-w-[120px] sm:max-w-none">{{ getSpotifyName() }}</p>
                <p class="text-[10px] sm:text-xs text-gray-500">Authenticated</p>
              </div>
            </div>

            <!-- Sign Out Button -->
            <button
              @click="handleSignOut"
              class="w-full sm:w-auto px-4 py-3 min-h-[44px] border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-all duration-300 text-xs uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
</template>