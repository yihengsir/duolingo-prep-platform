/** @type {import('tailwindcss').Config} */
module.exports = {
  // 这告诉 Tailwind CSS 在哪些文件中查找它的类名，以便生成对应的 CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 确保这里包含了所有的 JS/TS/JSX/TSX 文件
  ],
  theme: {
    extend: {}, // 在这里可以扩展 Tailwind 的默认主题，例如添加自定义颜色或字体
  },
  plugins: [], // 在这里添加 Tailwind CSS 插件
}
