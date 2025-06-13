    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      css: {
        // 明确配置 PostCSS
        postcss: {
          // 这里可以引用你的 postcss.config.cjs 文件
          // 默认情况下，Vite 会自动查找 postcss.config.js 或 postcss.config.cjs
          // 但显式配置可以帮助解决一些识别问题
          // 如果你的 postcss.config.cjs 在根目录，这里无需额外路径配置，Vite会找到
        },
      },
    });
    