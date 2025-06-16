module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#fcd34d',
        success: '#22c55e',
        danger: '#ef4444',
        neutral: {
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}