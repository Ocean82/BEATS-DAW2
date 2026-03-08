
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        surface: '#2a2a2a',
        primary: '#7c3aed',
        'primary-focus': '#6d28d9',
        secondary: '#db2777',
        'secondary-focus': '#be185d',
        accent: '#2563eb',
        'accent-focus': '#1d4ed8',
        text: '#e5e5e5',
        'text-muted': '#a3a3a3',
      },
    },
  },
  plugins: [],
} satisfies Config;
