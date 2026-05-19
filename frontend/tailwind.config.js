/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':      'var(--bg-base)',
        'bg-surface':   'var(--bg-surface)',
        'bg-elevated':  'var(--bg-elevated)',
        'bg-highlight': 'var(--bg-highlight)',

        'border-subtle': 'var(--border-subtle)',
        'border-medium': 'var(--border-medium)',

        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'text-hint':      'var(--text-hint)',

        accent:        'var(--accent)',
        'accent-dark': 'var(--accent-dark)',

        'ev-drive':   '#444444',
        'ev-break':   '#EF9F27',
        'ev-fuel':    '#639922',
        'ev-rest':    '#378ADD',
        'ev-pickup':  '#D85A30',
        'ev-dropoff': '#D4537E',
        'ev-restart': '#7F77DD',
        'ev-start':   '#000000',
      },
    },
  },
  plugins: [],
};
