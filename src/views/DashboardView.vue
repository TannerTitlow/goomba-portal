<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSetlists } from '@/composables/useSetlists'
import { useListSongs } from '@/composables/useListSongs'
import SongsTable from '../components/Songs/SongsTable.vue'

const router = useRouter()
const { user, signOut } = useAuth()
const { lists, fetchLists } = useSetlists()
const { songs } = useListSongs()

const userName = computed(() => {
  return user.value?.user_metadata?.name ||
         user.value?.email?.split('@')[0] ||
         'there'
})

const totalSongs = computed(() => {
  return Object.values(songs.value).reduce((total, listSongs) => {
    return total + listSongs.length
  }, 0)
})

async function handleLogout() {
  await signOut()
  router.push('/login')
}

onMounted(async () => {
  await fetchLists()
})
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1 class="welcome-title">
          Welcome back, <span class="user-name">{{ userName }}</span>
        </h1>
        <p class="subtitle">Ready to manage your setlists?</p>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ lists.length }}</div>
          <div class="stat-label">Total Lists</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ totalSongs }}</div>
          <div class="stat-label">Total Songs</div>
        </div>
      </div>

      <div class="cta-section">
        <router-link to="/setlists" class="btn-primary">
          Go to Setlists →
        </router-link>
      </div>

      <div class="logout-section">
        <button @click="handleLogout" class="btn-logout">
          Logout
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #000000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.dashboard-container {
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.dashboard-header {
  margin-bottom: 3rem;
}

.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #1db954 0%, #1ed760 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-name {
  display: inline-block;
  background: linear-gradient(135deg, #00ff88 0%, #1db954 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.25rem;
  color: #b3b3b3;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: #111111;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #1db954;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(29, 185, 84, 0.2);
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: #1db954;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  color: #b3b3b3;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cta-section {
  margin-bottom: 2rem;
}

.btn-primary {
  display: inline-block;
  padding: 1rem 2.5rem;
  background: #1db954;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.125rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 185, 84, 0.4);
}

.logout-section {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid #333;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #666;
  border-radius: 6px;
  color: #b3b3b3;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  border-color: #f44336;
  color: #f44336;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }

  .welcome-title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 2rem;
  }
}
</style>
