<template>
  <div class="flex flex-wrap gap-3">
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