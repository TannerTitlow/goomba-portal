import { createWebHistory, createRouter } from 'vue-router';
import { watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import routes from './routes';

const url = new URL(import.meta.env.BASE_URL, window.location.origin);
const router = createRouter({
        history: createWebHistory(url.pathname),
	routes: routes,
});

// Auth guard for protected routes
router.beforeEach(async (to, from, next) => {
	const { checkAuth, loading } = useAuth()

	// Wait for initial auth check to complete
	if (loading.value) {
		await new Promise(resolve => {
			const unwatch = watch(loading, (newLoading) => {
				if (!newLoading) {
					unwatch()
					resolve()
				}
			})
		})
	}

	// Check if route requires authentication
	if (to.meta.requiresAuth) {
		const isAuthenticated = await checkAuth()

		if (!isAuthenticated) {
			// Redirect to login, save intended destination
			next({
				name: 'login',
				query: { redirect: to.fullPath },
			})
			return
		}
	}

	// If going to login but already authenticated, redirect to dashboard
	if (to.name === 'login') {
		const isAuthenticated = await checkAuth()
		if (isAuthenticated) {
			next({ name: 'dashboard' })
			return
		}
	}

	next()
})

export default router;
