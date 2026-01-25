<template>
  <div class="min-h-screen bg-gradient-to-b from-[#000000] to-[#0a0a0a] text-white flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-20 backdrop-blur-xl bg-black/70 border-b border-white/5">
      <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-3">
          <div class="w-1 h-12 bg-gradient-to-b from-[#1db954] to-[#00ff88] rounded-full"></div>
          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">My Profile</h1>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="profileLoading && !currentProfile" class="max-w-3xl mx-auto">
        <div class="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-8 flex items-center justify-center">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="profileError" class="max-w-3xl mx-auto">
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="font-bold">Error loading profile</h3>
            <div class="text-xs">{{ profileError }}</div>
          </div>
          <button @click="fetchCurrentProfile" class="btn btn-sm">Retry</button>
        </div>
      </div>

      <!-- Profile Form -->
      <div v-else-if="currentProfile" class="max-w-3xl mx-auto">
        <ProfileForm :profile="currentProfile" />
        
        <!-- Account Info Section -->
        <div class="mt-8 bg-black/30 backdrop-blur-md border border-white/5 rounded-xl p-6">
          <h3 class="text-lg font-semibold mb-4 opacity-80">Account Information</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="opacity-60 mb-1">Member Since</p>
              <p class="font-medium">{{ formatDate(currentProfile.created_at) }}</p>
            </div>
            <div>
              <p class="opacity-60 mb-1">Last Updated</p>
              <p class="font-medium">{{ formatDate(currentProfile.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- No Profile State -->
      <div v-else class="max-w-3xl mx-auto">
        <div class="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>No profile found. Please log in.</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useProfiles } from '@/composables/useProfiles';
import ProfileForm from '@/components/Profiles/ProfileForm.vue';

const { currentProfile, profileLoading, profileError, fetchCurrentProfile } = useProfiles();

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
</script>