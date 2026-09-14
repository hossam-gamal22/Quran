/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Admin Panel Unified Color System
        admin: {
          bg: '#0b1322',           // deeper base — more separation from cards
          surface: '#1a2536',      // card/modal surface
          'surface-light': '#2b3a52', // hover/elevated surface
          border: '#3a4a63',       // brighter, more visible borders
          input: '#111b2e',        // input darker than surface for depth
          muted: '#94a3b8',        // slate-400 — brighter muted text
        },
        accent: {
          DEFAULT: '#10b981',      // emerald-500 - primary accent
          dark: '#059669',         // emerald-600 - hover state
          light: '#34d399',        // emerald-400 - lighter accent
          muted: 'rgba(16, 185, 129, 0.2)', // emerald with opacity - badges
        },
      },
    },
  },
  plugins: [],
}
