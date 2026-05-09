// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './templates/reev-joomla/**/*.php',
    './src/**/*.{js,scss}'
  ],
  darkMode: 'class', // Включаем ручное переключение темы
  theme: {
    extend: {
      colors: {
        // ✅ Brand scale (Electric Lime)
        brand: {
          50: 'oklch(97.5% 0.03 130)',
          100: 'oklch(94% 0.06 130)',
          200: 'oklch(87% 0.12 130)',
          300: 'oklch(80% 0.19 130)',
          400: 'oklch(72% 0.25 130)',
          500: 'oklch(64% 0.27 130)',
          600: 'oklch(54% 0.23 130)',
          700: 'oklch(45% 0.19 130)',
          800: 'oklch(36% 0.14 130)',
          900: 'oklch(25% 0.09 130)',
        },
        // ✅ Semantic tokens (привязка к CSS-переменным)
        background: 'var(--background)',
        'bg-secondary': 'var(--background-secondary)',
        foreground: 'var(--foreground)',
        'fg-secondary': 'var(--foreground-secondary)',
        'fg-muted': 'var(--foreground-muted)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        card: 'var(--card)',
        'card-border': 'var(--card-border)',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
      }
    }
  }
}