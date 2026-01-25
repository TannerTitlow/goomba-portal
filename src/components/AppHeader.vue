<script setup>
import { useAuth } from '@/composables/useAuth'
import { useProfiles } from '@/composables/useProfiles'
import ProfileAvatar from './Profiles/ProfileAvatar.vue'
import ShroomIcon from "@/assets/icons/shroom.svg";
import { useRouter, useRoute } from 'vue-router'

const { signOut, loading } = useAuth()
const { currentProfile } = useProfiles()
const router = useRouter()
const route = useRoute()

const handleSignOut = async () => {
  try {
    await signOut()
    router.push('/login')
  } catch (err) {
    console.error('Error signing out:', err)
  }
}

const navigateToProfile = () => {
  router.push('/profile')
}

const navigateToDashboard = () => {
  router.push('/dashboard')
}

const navigateToSetlists = () => {
  router.push('/setlists')
}
</script>

<template>
  <div class="navbar relative bg-base-100 shadow-sm border-b border-primary/20">
    <div class="flex-1">
      <button 
        @click="navigateToDashboard"
        class="btn btn-ghost hover:bg-transparent hover:border-transparent p-0 ml-3"
      >
      <img
          :src="ShroomIcon"
          alt="Mushroom"
          class="w-10 h-10"
          style="filter: brightness(0) saturate(100%) invert(79%) sepia(27%) saturate(1453%) hue-rotate(75deg) brightness(1.05);"
      />
      </button>
    </div>
    <div class="absolute left-1/2 -translate-x-1/2 text-xl uppercase tracking-wider"
        style="font-family: 'Coder', 'Courier New', monospace; font-weight: 400;">
      <span class="gradient-text">GOOMBA PORTAL</span>
    </div>
    <div class="flex gap-2 mr-3">
      <div class="mr-3 text-right hidden sm:block">
        <p class="text-sm font-medium">{{ currentProfile?.display_name || 'User' }}</p>
        <p class="text-xs opacity-60">{{ currentProfile?.email || 'Email' }}</p>
      </div>
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar ring-2 ring-primary/30 hover:ring-primary/60 transition-all">
          <div class="w-10 rounded-full">
            <ProfileAvatar 
              v-if="currentProfile" 
              :profile="currentProfile" 
              size="sm"
            />
            <div v-else class="loading loading-ring loading-md"></div>
          </div>
        </div>
        <ul
          tabindex="-1"
          class="menu menu-md dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow border border-primary/20">
          <li>
            <button 
              @click="navigateToProfile"
              class="justify-between hover:bg-primary/10 hover:text-primary"
              :class="{ 'bg-primary/10 text-primary': route.path === '/profile' }"
            >
              Profile
            </button>
          </li>
          <li>
            <button 
              @click="navigateToDashboard"
              class="hover:bg-primary/10 hover:text-primary"
              :class="{ 'bg-primary/10 text-primary': route.path === '/dashboard' }"
            >
              Dashboard
            </button>
          </li>
          <li>
            <button 
              @click="navigateToSetlists"
              class="hover:bg-primary/10 hover:text-primary"
              :class="{ 'bg-primary/10 text-primary': route.path === '/setlists' }"
            >
              Setlists
            </button>
          </li>
          <li>
            <button 
              @click="handleSignOut"
              class="hover:bg-error/10 hover:text-error"
              :disabled="loading"
            >
              <span v-if="loading">Signing out...</span>
              <span v-else>Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gradient-text {
  background: linear-gradient(135deg, #1db954 0%, #00ff88 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>