// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/duolingo-prep-platform/', // 👈 这是关键
  plugins: [react()],
})