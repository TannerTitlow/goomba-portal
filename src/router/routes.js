import HomeView from '@/views/HomeView.vue';

export default [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: { title: 'Goomba Portal' },
	},
	{
		path: '/spotify/callback',
		name: 'spotifyCallback',
		component: () => import('@/views/SpotifyCallbackView.vue'),
		meta: { title: 'Connecting to Spotify...' },
	},
	{
		// 404 fallback
		path: '/:pathMatch(.*)*',
		name: 'notFound',
		component: () => import('@/views/NotFoundView.vue'),
		meta: { title: '404 Not Found' },
	}
];
