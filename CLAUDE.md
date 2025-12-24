# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 + Vite frontend application using Tailwind CSS 4 + DaisyUI 5 for styling. It's a starter template project that showcases various UI components and includes theme switching functionality.

## Development Commands

- `npm run dev` - Start development server on port 5173
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally

## Architecture

### Core Stack
- **Vite** - Build tool and development server
- **Vue 3** with Composition API (`<script setup>`)
- **Vue Router 4** for routing
- **Sass** for enhanced CSS features
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **PostCSS** for CSS transformations

### Project Structure
```
src/
├── assets/
│   ├── icons/         # Icon assets
│   ├── images/        # Image assets
│   └── styles/        # SCSS files including vendor imports
├── components/
│   ├── ComponentsPreview/  # Demo components showcasing DaisyUI
│   └── Home/               # Home page specific components
├── data/              # Static data files (themes.js)
├── router/            # Vue Router configuration
│   ├── index.js       # Router setup
│   └── routes.js      # Route definitions
├── utils/             # Utility functions (Themes.js)
├── views/             # Page-level components
├── App.vue            # Root application component
└── main.js            # Application entry point
```

### Key Features
- Theme switching system with multiple DaisyUI themes
- Component library preview/showcase
- GitHub Pages deployment ready
- Path alias `@` mapped to `src/` directory

### Routing
- Home page (`/`) - Main landing page with component previews
- Components preview (`/preview`) - Lazy-loaded showcase of UI components
- 404 handling for unmatched routes

### Styling Architecture
- Main styles imported in `main.js` from `src/assets/styles/main.scss`
- Tailwind CSS 4 configuration in `tailwind.config.js`
- DaisyUI themes managed through `src/data/themes.js` and `src/utils/Themes.js`
- Component styles use `<style scoped lang="scss">`

### Development Notes
- Uses ES modules (`"type": "module"` in package.json)
- Base URL configuration for GitHub Pages deployment via `BASE_URL` environment variable
- Lazy loading implemented for non-critical routes
- All components use Vue 3 Composition API with `<script setup>`