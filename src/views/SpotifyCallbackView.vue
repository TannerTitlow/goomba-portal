<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const status = ref('loading'); // 'loading', 'success', 'error'
const message = ref('Connecting to Spotify...');

onMounted(async () => {
	// Extract OAuth parameters from URL
	const code = route.query.code;
	const error = route.query.error;
	const state = route.query.state;

	// Handle OAuth errors (user denied access, etc.)
	if (error) {
		status.value = 'error';
		message.value = `Authentication failed: ${error}`;
		return;
	}

	// Handle missing authorization code
	if (!code) {
		status.value = 'error';
		message.value = 'No authorization code received from Spotify.';
		return;
	}

	try {
		// TODO: Exchange authorization code for access token
		// This will be implemented later when Spotify credentials are configured
		// For now, just show that we received the code

		console.log('Received authorization code:', code);
		console.log('State parameter:', state);

		// Simulate processing delay
		await new Promise(resolve => setTimeout(resolve, 1000));

		status.value = 'success';
		message.value = 'Successfully connected to Spotify!';

		// Redirect to home after 2 seconds
		setTimeout(() => {
			router.push({ name: 'home' });
		}, 2000);

	} catch (err) {
		status.value = 'error';
		message.value = `An error occurred: ${err.message}`;
		console.error('Spotify OAuth error:', err);
	}
});
</script>

<template>
	<div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
		<!-- Portal Glow Effect -->
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl animate-glow"></div>

		<!-- Main Content -->
		<div class="relative z-10 text-center max-w-md px-4">
			<!-- Loading State -->
			<div v-if="status === 'loading'" class="flex flex-col items-center">
				<div class="mb-10">
					<div class="inline-block p-8 bg-black border-2 border-green-500/40 shadow-2xl shadow-green-500/30 relative">
						<div class="absolute inset-0 bg-green-500/5"></div>
						<svg class="w-20 h-20 text-green-500 relative z-10 animate-spin" fill="none" viewBox="0 0 24 24" stroke-width="2">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<!-- Corner accents -->
						<div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500"></div>
						<div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500"></div>
						<div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500"></div>
						<div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500"></div>
					</div>
				</div>
				<h2 class="text-2xl font-light text-gray-300 mb-3 uppercase tracking-wider">{{ message }}</h2>
				<p class="text-xs text-gray-500 uppercase tracking-widest font-mono">Establishing secure connection...</p>
			</div>

			<!-- Success State -->
			<div v-else-if="status === 'success'" class="flex flex-col items-center">
				<div class="mb-10">
					<div class="inline-block p-8 bg-black border-2 border-green-500 shadow-2xl shadow-green-500/50 relative">
						<div class="absolute inset-0 bg-green-500/10"></div>
						<svg class="w-20 h-20 text-green-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
							<path stroke-linecap="square" stroke-linejoin="miter" d="M5 13l4 4L19 7"></path>
						</svg>
						<!-- Corner accents -->
						<div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500"></div>
						<div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500"></div>
						<div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500"></div>
						<div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500"></div>
					</div>
				</div>
				<h2 class="text-2xl font-light text-green-500 mb-3 uppercase tracking-wider">Connection Established</h2>
				<p class="text-xs text-gray-500 uppercase tracking-widest font-mono">Redirecting to portal...</p>
			</div>

			<!-- Error State -->
			<div v-else-if="status === 'error'" class="flex flex-col items-center">
				<div class="mb-8">
					<div class="inline-block px-6 py-2 border border-red-500/30 bg-black mb-6">
						<span class="text-red-500 font-mono text-xs uppercase tracking-widest">CONNECTION ERROR</span>
					</div>
				</div>
				<div class="mb-10">
					<div class="inline-block p-8 bg-black border-2 border-red-500/40 shadow-2xl shadow-red-500/30 relative">
						<div class="absolute inset-0 bg-red-500/5"></div>
						<svg class="w-20 h-20 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
							<path stroke-linecap="square" stroke-linejoin="miter" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
						<!-- Corner accents -->
						<div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500"></div>
						<div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500"></div>
						<div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500"></div>
						<div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500"></div>
					</div>
				</div>
				<h2 class="text-2xl font-light text-red-500 mb-3 uppercase tracking-wider">Authentication Failed</h2>
				<p class="text-xs text-gray-500 mb-12 uppercase tracking-wider font-mono max-w-sm">{{ message }}</p>
				<router-link
					to="/"
					class="inline-flex items-center gap-3 px-8 py-4 bg-black border-2 border-green-500 text-green-500 hover:bg-green-500/10 transition-all duration-300 uppercase tracking-wider text-sm font-mono"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="square" stroke-linejoin="miter" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
					</svg>
					Return to Portal
				</router-link>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">

</style>
