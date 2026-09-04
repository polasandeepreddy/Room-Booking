/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F3E5C8',
          300: '#EBD4A4',
          400: '#DFC07B',
          500: '#D4AF37',
          600: '#B89327',
          700: '#8C6E19',
          800: '#634E12',
          900: '#3D300B',
        },
        navy: {
          800: '#151D2A',
          900: '#0F172A',
          950: '#090D16',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 20px -5px rgba(212, 175, 55, 0.12)',
        'luxury-hover': '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 25px -2px rgba(212, 175, 55, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
