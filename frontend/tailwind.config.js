/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: '#070b13',
          card: 'rgba(15, 23, 42, 0.75)',
          panel: 'rgba(13, 20, 36, 0.85)',
          hover: 'rgba(255, 255, 255, 0.06)',
        },
        cyber: {
          cyan: '#00f0ff',
          blue: '#38bdf8',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#a855f7',
          neon: '#00ffff',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.3)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.3)',
        'neon-rose': '0 0 15px rgba(244, 63, 94, 0.3)',
        'neon-amber': '0 0 15px rgba(245, 158, 11, 0.3)',
      },
    },
  },
  plugins: [],
};
