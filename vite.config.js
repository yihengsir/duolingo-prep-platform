// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 移除 css.postcss 配置，让 Vite 自动查找项目根目录的 postcss.config.cjs
  // 这样可以避免在 ESM 环境的 vite.config.js 中使用 CommonJS 的 require()
});
