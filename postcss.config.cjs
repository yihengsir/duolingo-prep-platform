// postcss.config.cjs
// 这个文件使用 CommonJS 模块语法，因此需要 .cjs 扩展名
// 它告诉 PostCSS (Vite 使用的 CSS 处理器) 如何处理你的 CSS 文件
module.exports = {
  plugins: {
    // 这将 Tailwind CSS 作为 PostCSS 插件加载。
    // 请注意，最新版本的 Tailwind CSS 要求通过 @tailwindcss/postcss 包来加载
    tailwindcss: require('@tailwindcss/postcss'),
    // Autoprefixer 会自动为你的 CSS 属性添加浏览器前缀，以确保兼容性
    autoprefixer: {},
  },
};
