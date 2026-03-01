/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#030508',
        surface: '#0a0d14',
        panel: '#0f1420',
        border: '#1a2035',
        neon: '#00e5ff',
        fire: '#ff6b35',
        acid: '#b8ff57',
        muted: '#4a5568',
        ghost: '#8892a4',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #00e5ff, 0 0 20px #00e5ff40' },
          '50%': { boxShadow: '0 0 10px #00e5ff, 0 0 40px #00e5ff60' },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      }
    }
  },
  plugins: []
}
