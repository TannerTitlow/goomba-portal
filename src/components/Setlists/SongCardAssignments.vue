<template>
  <div class="flex flex-grow gap-2">
    <!-- Duplicate assignments for testing -->
      <AssignmentBadge
          v-for="assignment in assignments"
          :key="assignment.id"
          :assignment="assignment"
      />
  </div>
</template>

<script setup>
import AssignmentBadge from '../Assignments/AssignmentBadge.vue';

const props = defineProps({
  assignments: {
    type: Array,
    required: true
  }
})
</script>