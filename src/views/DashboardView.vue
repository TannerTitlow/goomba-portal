<script setup>
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { user, session, signOut, loading } = useAuth()
const router = useRouter()

const handleSignOut = async () => {
  try {
    await signOut()
    router.push({ name: 'home' })
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
  <div class="min-h-screen bg-black text-white">
    <!-- Header -->
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

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8 sm:py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Welcome Section -->
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-block px-4 py-2 sm:px-6 border border-green-500/30 bg-green-500/5 mb-4 sm:mb-6">
            <span class="text-green-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">System Online</span>
          </div>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 uppercase tracking-wide sm:tracking-wider" style="font-family: 'Coder', 'Courier New', monospace;">
            Welcome to the Portal
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">Band management features coming soon</p>
        </div>

        <!-- Feature Grid -->
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <!-- Spotify Integration -->
          <div class="border border-green-500/20 bg-green-500/5 p-4 sm:p-6 hover:border-green-500/40 transition-all duration-300">
            <div class="mb-3 sm:mb-4">
              <svg class="w-10 h-10 sm:w-12 sm:h-12 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-bold mb-1 sm:mb-2 uppercase tracking-wide">Spotify Link</h3>
            <p class="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Connect your playlists and setlists</p>
            <span class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest">Coming Soon</span>
          </div>

          <!-- Setlist Planning -->
          <div class="border border-green-500/20 bg-green-500/5 p-4 sm:p-6 hover:border-green-500/40 transition-all duration-300">
            <div class="mb-3 sm:mb-4">
              <svg class="w-10 h-10 sm:w-12 sm:h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-bold mb-1 sm:mb-2 uppercase tracking-wide">Setlist Planning</h3>
            <p class="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Create and manage your setlists</p>
            <span class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest">Coming Soon</span>
          </div>

          <!-- Band Management -->
          <div class="border border-green-500/20 bg-green-500/5 p-4 sm:p-6 hover:border-green-500/40 transition-all duration-300">
            <div class="mb-3 sm:mb-4">
              <svg class="w-10 h-10 sm:w-12 sm:h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-bold mb-1 sm:mb-2 uppercase tracking-wide">Band Mgmt</h3>
            <p class="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Manage band members and roles</p>
            <span class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>

        <!-- Info Box -->
        <div class="mt-12 sm:mt-16 border border-green-500/20 bg-green-500/5 p-6 sm:p-8 text-center">
          <p class="text-xs sm:text-sm text-gray-400">
            You're currently authenticated with Spotify. More features will be added to this dashboard soon.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
</style>
