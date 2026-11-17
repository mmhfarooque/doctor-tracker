/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F2F4F3',
        ink: { DEFAULT: '#18212B', soft: '#3A4550' },
        muted: '#5D6873',
        faint: '#8A949D',
        line: { DEFAULT: '#DFE4E2', strong: '#C9D1CE' },
        pine: {
          50: '#EEF6F3',
          100: '#DCEDE7',
          200: '#B5D8CC',
          500: '#2A7D68',
          600: '#1B6A57',
          700: '#155E4E',
          800: '#0F4A3D',
          900: '#112620',
          950: '#0B1A16',
        },
        stable: { DEFAULT: '#1E7F53', soft: '#E4F3EB' },
        watch: { DEFAULT: '#A86A00', soft: '#FBF0D9' },
        recovering: { DEFAULT: '#2B64C7', soft: '#E5EDFB' },
        critical: { DEFAULT: '#B8322A', soft: '#FBE6E4' },
        discharged: { DEFAULT: '#66717D', soft: '#ECEEF0' },
      },
      borderRadius: {
        panel: '14px',
        control: '10px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(24, 33, 43, 0.04)',
        lift: '0 12px 32px -12px rgba(15, 38, 32, 0.28)',
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        'slide-in': 'slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 160ms ease-out',
        'pop-in': 'pop-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        grow: 'grow 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
