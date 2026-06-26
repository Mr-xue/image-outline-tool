import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置：Vue 插件 + 本地开发服务器
export default defineConfig({
  // 部署到 GitHub Pages 子路径，资源需带仓库名前缀（本地开发为根路径 '/'）
  base: process.env.GITHUB_ACTIONS ? '/image-outline-tool/' : '/',
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
})
