    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      // 关键改变：移除 'base' 配置，确保开发模式下文件路径正确
      // base: '/duolingo-prep-platform/', // 删除此行或注释掉

      plugins: [react()],
      build: {
        outDir: 'docs' // 保持此行不变，它用于 npm run build
      }
    });
    