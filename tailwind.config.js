/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./code/build/index.html",
    "./code/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: 'var(--bg-primary)',
        textPrimary: 'var(--text-primary)',
        accentPrimary: 'var(--accent-primary)',
      }
    },
  },
  plugins: [],
}
