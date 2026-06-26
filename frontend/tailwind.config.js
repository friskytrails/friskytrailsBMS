/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',      // Rich dark slate
        darkCard: '#1e293b',    // Slightly lighter slate for cards
        brandPrimary: '#4f46e5',// Premium indigo primary
        brandHover: '#4338ca',  // Darker indigo on hover
        brandAccent: '#10b981', // Clean emerald accent
      }
    },
  },
  plugins: [],
}
