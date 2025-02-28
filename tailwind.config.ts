import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AMOLED black theme colors
        black: "#000000",
        "gray-950": "#0a0a0a",
        "gray-900": "#171717", 
        "gray-800": "#1e1e1e",
        "gray-700": "#262626",
        "gray-600": "#333333",
        "gray-500": "#494949",
        "gray-400": "#808080",
        "gray-300": "#a0a0a0",
        "gray-200": "#c0c0c0",
        "gray-100": "#e0e0e0",
        
        // Neon accent colors
        "red": {
          DEFAULT: "#ff2d55",
          light: "#ff6b88",
          dark: "#cc0028"
        },
        "cyan": {
          DEFAULT: "#00ffff",
          light: "#80ffff",
          dark: "#00cccc"
        },
        "purple": {
          DEFAULT: "#bf5af2",
          light: "#d38ff5",
          dark: "#9931cc"
        },
        "blue": {
          DEFAULT: "#0a84ff",
          light: "#5aabff",
          dark: "#0066cc"
        }
      },
      fontFamily: {
        'serif-jp': ['Noto Serif JP', 'serif'],
        'sans-jp': ['Noto Sans JP', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-grid': "url('/images/cyber-grid.png')",
        'japanese-pattern': "url('/images/japanese-pattern-neon.png')",
        'scan-lines': "repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 2px)",
      },
      boxShadow: {
        'neon-red': '0 0 5px rgba(255, 45, 85, 0.6), 0 0 10px rgba(255, 45, 85, 0.4)',
        'neon-cyan': '0 0 5px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4)',
        'neon-purple': '0 0 5px rgba(191, 90, 242, 0.6), 0 0 10px rgba(191, 90, 242, 0.4)',
        'neon-blue': '0 0 5px rgba(10, 132, 255, 0.6), 0 0 10px rgba(10, 132, 255, 0.4)',
        'neon-subtle': '0 0 10px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 255, 255, 0.6)',
      },
      textShadow: {
        'neon': '0 0 5px rgba(255, 255, 255, 0.5)',
        'red': '0 0 5px rgba(255, 45, 85, 0.6), 0 0 10px rgba(255, 45, 85, 0.4)',
        'cyan': '0 0 5px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4)',
        'purple': '0 0 5px rgba(191, 90, 242, 0.6), 0 0 10px rgba(191, 90, 242, 0.4)',
      },
      keyframes: {
        'pattern-shift': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' }
        },
        'pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' }
        },
        'expand': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' }
        },
        'ping': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' }
        },
        'float': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' }
        }
      },
      animation: {
        'pattern-shift': 'pattern-shift 30s linear infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        'expand': 'expand 0.5s ease-out',
        'ping': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 60s linear infinite'
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-neon': {
          textShadow: '0 0 5px rgba(255, 255, 255, 0.5)'
        },
        '.text-shadow-red': {
          textShadow: '0 0 5px rgba(255, 45, 85, 0.6), 0 0 10px rgba(255, 45, 85, 0.4)'
        },
        '.text-shadow-cyan': {
          textShadow: '0 0 5px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4)'
        },
        '.text-shadow-purple': {
          textShadow: '0 0 5px rgba(191, 90, 242, 0.6), 0 0 10px rgba(191, 90, 242, 0.4)'
        },
        '.text-vertical-right': {
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          letterSpacing: '0.2em'
        },
        '.text-vertical-left': {
          writingMode: 'vertical-lr',
          textOrientation: 'upright',
          letterSpacing: '0.2em'
        }
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;