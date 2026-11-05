/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-background-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'surface-muted': 'rgb(var(--bg-surface-muted-rgb) / <alpha-value>)',
        theme: 'rgb(var(--border-theme-rgb) / <alpha-value>)',
        primary: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        'emerald-btn': 'rgb(var(--color-emerald-btn-rgb) / <alpha-value>)',
        'amber-badge': 'rgb(var(--color-amber-badge-rgb) / <alpha-value>)',
      },
      textColor: {
        primary: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        'emerald-btn': 'rgb(var(--text-emerald-rgb) / <alpha-value>)',
        'amber-badge': 'rgb(var(--text-amber-rgb) / <alpha-value>)',
      },
      backgroundColor: {
        background: 'rgb(var(--bg-background-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        'surface-muted': 'rgb(var(--bg-surface-muted-rgb) / <alpha-value>)',
        'emerald-btn': 'rgb(var(--color-emerald-btn-rgb) / <alpha-value>)',
        'amber-badge': 'rgb(var(--color-amber-badge-rgb) / <alpha-value>)',
      },
      borderColor: {
        theme: 'rgb(var(--border-theme-rgb) / <alpha-value>)',
        'emerald-btn': 'rgb(var(--text-emerald-rgb) / <alpha-value>)',
        'amber-badge': 'rgb(var(--text-amber-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 4px 16px -2px rgba(15, 23, 42, 0.16), 0 2px 6px -1px rgba(15, 23, 42, 0.1)',
        'mint-glow': '0 4px 16px -2px rgba(15, 23, 42, 0.16), 0 2px 6px -1px rgba(15, 23, 42, 0.1)',
        'amber-glow': '0 4px 16px -2px rgba(15, 23, 42, 0.16), 0 2px 6px -1px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}
