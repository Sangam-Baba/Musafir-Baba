/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/(user)/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-poppins)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      animation: {
        'drift-cloud': 'driftCloud 45s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'sway-birds': 'swayBirds 6s ease-in-out infinite',
        'blink': 'blink 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 10px 0 rgba(16, 185, 129, 0.2)' },
        },
        driftCloud: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100vw)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(0.95)' },
          '50%': { opacity: 0.9, transform: 'scale(1.05)' }
        },
        swayBirds: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-12px) translateX(4px)' }
        },
      }
    },
  },
  plugins: [],
};
