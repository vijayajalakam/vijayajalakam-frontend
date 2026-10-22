/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--color-brand-primary, #6366f1)',
        'user-accent': 'var(--color-user-accent, #1a1a1a)',
        'user-accent-soft': 'var(--color-user-accent-soft, rgba(0, 0, 0, 0.05))',
        'user-gold': 'var(--color-user-gold, #c5a059)',
        'user-text-main': 'var(--color-user-text-main, #1a1a1a)',
        'user-text-muted': 'var(--color-user-text-muted, #666666)',
        'dark-surface': 'var(--color-dark-surface, #1a1a1a)',
        'dark-card': 'var(--color-dark-card, #2a2a2a)',
        'dark-border': 'var(--color-dark-border, #3a3a3a)',
      },
    },
  },
  plugins: [],
}
