import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/duolingo-prep-platform/', // 👈 注意：这是你的 GitHub 仓库名，必须加上！
  plugins: [react()],
});