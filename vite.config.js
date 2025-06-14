import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/duolingo-prep-platform/',
  plugins: [react()],
  build: {
    outDir: 'docs'
  }
});