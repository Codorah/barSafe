/** @type {import('tailwindcss').Config} */
// Compiled at build time (was the Play CDN). Colors map to the CSS variables of
// index.css so `.dark` flips every token and `/opacity` modifiers keep working.
export default {
  content: ['./index.html', './*.{ts,tsx}', './{pages,components,lib}/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'rgb(var(--bg) / <alpha-value>)',
        raise:        'rgb(var(--bg-2) / <alpha-value>)',
        surface:      'rgb(var(--surface) / <alpha-value>)',
        surface2:     'rgb(var(--surface-2) / <alpha-value>)',
        ink:          'rgb(var(--ink) / <alpha-value>)',
        muted:        'rgb(var(--muted) / <alpha-value>)',
        faint:        'rgb(var(--faint) / <alpha-value>)',
        line:         'rgb(var(--line) / <alpha-value>)',
        accent:       'rgb(var(--accent) / <alpha-value>)',
        accentStrong: 'rgb(var(--accent-strong) / <alpha-value>)',
        onAccent:     'rgb(var(--on-accent) / <alpha-value>)',
        positive:     'rgb(var(--positive) / <alpha-value>)',
        warn:         'rgb(var(--warn) / <alpha-value>)',
        danger:       'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--shadow) / 0.06), 0 14px 40px -18px rgb(var(--shadow) / 0.22)',
        lift: '0 10px 44px -12px rgb(var(--shadow) / 0.34)',
      },
      maxWidth: {
        content: '78rem',
      },
    },
  },
  plugins: [],
};
