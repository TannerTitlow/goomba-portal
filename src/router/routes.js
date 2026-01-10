import HomeView from '@/views/HomeView.vue';

export default [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: { title: 'Goomba Portal' },
	},
	{
		path: '/login',
		name: 'login',
		component: () => import('@/views/LoginView.vue'),
		meta: { title: 'Login - Goomba Portal' },
	},
	{
		path: '/auth/callback',
		name: 'authCallback',
		component: () => import('@/views/AuthCallbackView.vue'),
		meta: { title: 'Authenticating...' },
	},
	{
		path: '/dashboard',
		name: 'dashboard',
		component: () => import('@/views/DashboardView.vue'),
		meta: {
			title: 'Dashboard - Goomba Portal',
			requiresAuth: true,
		},
	},
	{
		// 404 fallback
		path: '/:pathMatch(.*)*',
		name: 'notFound',
		component: () => import('@/views/NotFoundView.vue'),
		meta: { title: '404 Not Found' },
	}
];
