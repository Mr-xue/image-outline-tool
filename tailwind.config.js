/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      // 自定义毛玻璃面板的细腻边框色
      colors: {
        panel: '#1e293b',
      },
    },
  },
  plugins: [],
}
