// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/duolingo-prep-platform/', // ✅ 注意这里要加上你的 repo 名
  plugins: [react()],
})
