module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6', // 主色调 - 蓝色
        secondary: '#fcd34d', // 辅助色 - 黄色
        success: '#22c55e', // 成功/正确 - 绿色
        danger: '#ef4444', // 错误/警告 - 红色
        neutral: {
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'custom-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'bounce-subtle': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
}