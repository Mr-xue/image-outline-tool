import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置：Vue 插件 + 本地开发服务器
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
})
