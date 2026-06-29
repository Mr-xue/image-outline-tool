/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      // Vercel (Geist) 配色体系：纯白背景 + 黑字 + 浅灰边框
      colors: {
        // 主强调色：纯黑（主按钮、激活态）
        accent: '#000000',
        // 选中态点缀蓝（Vercel 链接/聚焦蓝）
        link: '#0070f3',
        // 中性灰阶
        'gray-50': '#fafafa',
        'gray-100': '#f5f5f5',
        'gray-200': '#eaeaea',
        'gray-300': '#e5e5e5',
        'gray-400': '#999999',
        'gray-500': '#666666',
        'gray-600': '#444444',
      },
    },
  },
  plugins: [],
}
