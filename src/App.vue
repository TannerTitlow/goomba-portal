<script setup>
import { computed, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import AppLayout from '../layouts/AppLayout.vue';
import AppLayoutGuest from '../layouts/AppLayoutGuest.vue';

const route = useRoute();
const { cleanupAuth } = useAuth();

const layout = computed(() => {
  return route.meta.requiresAuth ? AppLayout : AppLayoutGuest;
});

// Clean up auth subscriptions when app unmounts
onBeforeUnmount(() => {
  cleanupAuth();
});
</script>

<template>
	<component :is="layout">
		<router-view />
	</component>
</template>

<style scoped lang="scss">

</style>
