<!-- src/components/UI/data-table/DataTable.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router';
import { useSongs } from '../../composables/useSongs';
import { Trash } from 'lucide-vue-next';

const route = useRoute();
const { songs, fetchSongs, deleteSong, subscribeToSongs } = useSongs();

// Local state
const loadingSongs = ref({})

let realtimeChannel = null

async function deleteTrack(song) {
  try {
    await deleteSong(song.id)
    showToast(`Deleted "${song.title}"`)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// Lifecycle
onMounted(async () => {
  await fetchSongs()

  // Subscribe to real-time updates
  realtimeChannel = subscribeToSongs()
})

onUnmounted(() => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }
})

</script>

<template>
    <div class="overflow-x-auto">
        <table class="table">
            <!-- head -->
            <thead>
                <tr>
                    <th>Song</th>
                    <th>Assignments</th>
                    <th>Difficulty</th>
                    <th>Suggested By</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
            <tr v-for="song in songs" :key="song.id">
                <td>
                    <div class="flex items-center gap-3">
                        <div class="avatar">
                            <div class="mask mask-squircle h-12 w-12">
                                <img
                                :src="song.album_art_url"
                                alt="Album Art" />
                            </div>
                        </div>
                        <div>
                            <div class="font-bold">{{ song.title }}</div>
                            <div class="text-sm opacity-50">{{ song.artist }}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="flex gap-1">
                        <div v-for="assignment in song.assignments" :key="assignment.id" class="flex flex-col gap-1">
                            <span>{{ assignment.instrument.name }}</span>
                            <span class="badge badge-ghost badge-sm">{{ assignment.user.full_name }}</span>
                        </div>
                    </div>
                </td>
                <td>{{ song.difficulty_rating }}</td>
                <td>{{ song.suggested_by.full_name }}</td>
                <th>
                    <div class="tooltip" data-tip="Delete Song">
                        <button class="btn btn-ghost btn-xs" @click="deleteTrack(song)">
                            <Trash class="h-4 w-4 text-red-500"/>
                        </button>
                    </div>
                </th>
            </tr>
            </tbody>
        </table>
        </div>
</template>