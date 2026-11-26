/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0B1020',
          card: '#111A2D',
          surface: '#17233B',
          elevated: '#1E2D4B',
          border: 'rgba(145, 160, 189, 0.16)',
          accent: '#9AABFF',
          mint: '#76DFBD',
          text: '#EDF2FF',
          muted: '#91A0BD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
