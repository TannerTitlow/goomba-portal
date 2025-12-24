<script setup>

</script>

<template>
	<div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
		<!-- Red warning glow for 404 -->
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-3xl animate-glow"></div>

		<!-- Main Content -->
		<div class="relative z-10 text-center px-4">
			<div class="mb-8">
				<div class="inline-block px-6 py-2 border border-red-500/30 bg-black mb-6">
					<span class="text-red-500 font-mono text-xs uppercase tracking-widest">ERROR</span>
				</div>
			</div>

			<h1 class="text-9xl font-black mb-6 portal-title">
				<span class="text-red-500">404</span>
			</h1>

			<h2 class="text-2xl font-light text-gray-400 mb-3 uppercase tracking-wider">Portal Access Denied</h2>

			<div class="flex items-center justify-center gap-4 mb-8">
				<div class="h-px w-12 bg-gradient-to-r from-transparent to-red-500/50"></div>
				<div class="w-2 h-2 bg-red-500"></div>
				<div class="h-px w-12 bg-gradient-to-l from-transparent to-red-500/50"></div>
			</div>

			<p class="text-sm text-gray-500 mb-12 max-w-md mx-auto uppercase tracking-wider font-mono">
				Coordinates not found in system database
			</p>

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
</template>

<style scoped lang="scss">

</style>