<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import ShroomIcon from "@/assets/icons/shroom.svg";

const canvasRef = ref(null);

onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });

    // Set canvas size to match window
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Generate grid-based particles - store as plain array for performance
    // Adjust grid based on aspect ratio to maintain consistent density
    const aspectRatio = window.innerWidth / window.innerHeight;
    const baseParticles = 1200; // Target total particles
    const cols = Math.round(Math.sqrt(baseParticles * aspectRatio));
    const rows = Math.round(Math.sqrt(baseParticles / aspectRatio));
    const particles = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            particles.push({
                x: col / (cols - 1), // 0-1 range
                y: row / (rows - 1), // 0-1 range
                baseSize: 1.5,
                currentSize: 1.5,
            });
        }
    }

    // Create morphing organic blob around content
    const blob = {
        x: 0.5, // Center (0-1 range)
        y: 0.5, // Center (0-1 range)
        baseInnerRadius: 0.28, // Base inner radius
        baseOuterRadius: 0.48, // Base outer radius
        time: 0,
    };

    // Animation loop
    let animationFrame;
    const animate = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        blob.time += 0.02;

        // Helper function to calculate organic radius at a given angle
        const getRadiusAtAngle = (angle, baseRadius) => {
            // Layer multiple sine waves at different frequencies for organic shape
            const wave1 = Math.sin(angle * 3 + blob.time * 0.8) * 0.08;
            const wave2 = Math.sin(angle * 5 - blob.time * 0.6) * 0.05;
            const wave3 = Math.sin(angle * 7 + blob.time * 1.2) * 0.04;
            const wave4 = Math.cos(angle * 4 + blob.time * 0.5) * 0.06;
            const wave5 = Math.sin(angle * 2.3 - blob.time * 0.9) * 0.07;

            // Combine waves for organic variation
            const variance = wave1 + wave2 + wave3 + wave4 + wave5;
            return baseRadius * (1 + variance);
        };

        // Draw particles
        particles.forEach((particle) => {
            // Convert normalized positions to canvas coordinates
            const px = particle.x * canvas.width;
            const py = particle.y * canvas.height;
            const bx = blob.x * canvas.width;
            const by = blob.y * canvas.height;

            const dx = px - bx;
            const dy = py - by;

            // Calculate angle from blob center to particle
            const angle = Math.atan2(dy, dx);

            // Get organic radii at this angle
            const innerRadius = getRadiusAtAngle(angle, blob.baseInnerRadius);
            const outerRadius = getRadiusAtAngle(angle, blob.baseOuterRadius);

            // Calculate distance from center
            const distance = Math.sqrt(dx * dx + dy * dy);
            const normalizedDistance = distance / Math.min(canvas.width, canvas.height);

            // Calculate distances relative to organic radii
            const distanceToInner = normalizedDistance / innerRadius;
            const distanceToOuter = normalizedDistance / outerRadius;

            // Calculate influence - highest in the organic donut ring
            let influence = 0;
            if (distanceToInner > 1 && distanceToOuter < 1) {
                // Inside the donut ring
                const innerEdge = distanceToInner - 1;
                const outerEdge = 1 - distanceToOuter;
                const ringPosition = Math.min(innerEdge, outerEdge) * 5; // Scale up the effect
                influence = Math.min(1, ringPosition); // Clamp to 1
                influence = Math.pow(influence, 2); // Smooth curve
            } else if (distanceToOuter < 1) {
                // Inside inner blob - gentle falloff
                influence = (1 - distanceToOuter) * 0.2;
            } else if (distanceToInner > 1) {
                // Outside outer blob - gentle falloff
                const outsideDistance = distanceToInner - 1;
                influence = Math.max(0, (1 - outsideDistance) * 0.3);
            }

            // Smoothly transition particle size
            const targetSize = particle.baseSize + influence * 5;
            particle.currentSize += (targetSize - particle.currentSize) * 0.08;

            // Draw particle with glow
            const size = particle.currentSize;
            const opacity = 0.5;

            // Reset shadow for each particle to avoid accumulation
            ctx.shadowBlur = size * 4;
            ctx.shadowColor = `rgba(74, 222, 128, ${opacity * 1.2})`;

            // Draw particle
            ctx.fillStyle = `rgba(74, 222, 128, ${opacity})`;
            ctx.beginPath();
            ctx.arc(px, py, size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Reset shadow after drawing
            ctx.shadowBlur = 0;
        });

        animationFrame = requestAnimationFrame(animate);
    };

    animate();

    onUnmounted(() => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        window.removeEventListener("resize", resizeCanvas);
    });
});
</script>

<template>
    <div
        class="min-h-screen flex items-center justify-center relative overflow-hidden bg-black"
    >
        <!-- Canvas Particle System -->
        <canvas
            ref="canvasRef"
            class="absolute inset-0 pointer-events-none"
        ></canvas>

        <!-- Gradient Background -->
        <div
            class="absolute inset-0 bg-gradient-to-b from-green-950/5 via-black/30 to-black/90"
        ></div>

        <!-- Vignette Shadow - Darkens edges to make center content stand out -->
        <div
            class="absolute inset-0 pointer-events-none"
            style="background: radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.85) 90%, rgba(0, 0, 0, 0.95) 100%);"
        ></div>

        <!-- Main Content -->
        <div class="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div class="text-center space-y-4 sm:space-y-6 md:space-y-8">
                <!-- Logo/Icon -->
                <div
                    class="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 backdrop-blur-xl mb-2 sm:mb-4"
                >
                    <img
                        :src="ShroomIcon"
                        alt="Mushroom"
                        class="w-12 h-12 sm:w-16 sm:h-16"
                        style="filter: brightness(0) saturate(100%) invert(79%) sepia(27%) saturate(1453%) hue-rotate(75deg) brightness(1.05);"
                    />
                </div>

                <!-- Main Heading -->
                <h1
                    class="text-2xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 uppercase flex justify-center"
                    style="
                        font-family: 'Coder', 'Courier New', monospace;
                        letter-spacing: 0.08em;
                        font-weight: 400;
                    "
                >
                    <span class="gradient-text">GOOMBA PORTAL</span>
                </h1>

                <!-- Subheading -->
                <p
                    class="text-base sm:text-lg text-gray-400 mb-4 sm:mb-6 md:mb-8 font-light px-4"
                >
                    Smooth Goomba / Command Center
                </p>

                <!-- Status Badge -->
                <div
                    class="inline-flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/10 border border-green-500/30 rounded-full backdrop-blur-sm mb-6 sm:mb-8 md:mb-12"
                >
                    <span class="relative flex h-1.5 w-1.5">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
                        ></span>
                        <span
                            class="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400"
                        ></span>
                    </span>
                    <span
                        class="text-green-400 text-xs font-medium tracking-wide"
                        >System Status: Building</span
                    >
                </div>

                <!-- Description -->
                <p
                    class="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 md:mb-12 max-w-md mx-auto px-4"
                >
                    Access point initializing... Portal systems coming online
                </p>

                <!-- Feature Badges -->
                <div
                    class="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 md:mb-16 px-2"
                >
                    <a
                        href="#"
                        class="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/10 border border-green-500/30 rounded-full hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-300"
                    >
                        <svg
                            class="w-4 h-4 text-green-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                            />
                        </svg>
                        <span
                            class="text-xs sm:text-sm font-medium text-green-400"
                            >Spotify Link</span
                        >
                    </a>

                    <a
                        href="#"
                        class="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/10 border border-green-500/30 rounded-full hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-300"
                    >
                        <svg
                            class="w-4 h-4 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            ></path>
                        </svg>
                        <span
                            class="text-xs sm:text-sm font-medium text-green-400"
                            >Setlist Planning</span
                        >
                    </a>

                    <a
                        href="#"
                        class="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/10 border border-green-500/30 rounded-full hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-300"
                    >
                        <svg
                            class="w-4 h-4 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            ></path>
                        </svg>
                        <span
                            class="text-xs sm:text-sm font-medium text-green-400"
                            >Band Mgmt</span
                        >
                    </a>
                </div>

                <!-- Footer -->
                <div
                    class="flex items-center justify-center gap-3 text-xs text-gray-600"
                >
                    <span class="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>PORTAL v0.1.0</span>
                    <span class="w-1 h-1 bg-gray-600 rounded-full"></span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
// Organic blob animation handled via Canvas API in script
</style>
