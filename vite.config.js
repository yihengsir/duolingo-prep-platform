import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/duolingo-prep-platform/', // 注意：仓库名，必须加上！
  plugins: [react()],
});