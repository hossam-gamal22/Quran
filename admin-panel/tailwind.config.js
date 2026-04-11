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
          bg: '#0f172a',           // slate-900 - main page background
          surface: '#1e293b',      // slate-800 - cards, modals
          'surface-light': '#334155', // slate-700 - hover states, lighter surfaces
          border: '#334155',       // slate-700 - borders
          input: '#1e293b',        // slate-800 - input backgrounds
          muted: '#64748b',        // slate-500 - muted text
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
