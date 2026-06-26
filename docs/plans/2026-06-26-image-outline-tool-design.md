# 图片主体抠图描边工具 — 设计文档

日期：2026-06-26

## 功能目标
1. 上传图片，AI 识别并抠出主体（人/物）
2. 主体轮廓增加描边，描边大小和颜色可调
3. 用户可对识别结果进行擦除/还原，修正识别误差
4. 界面现代高级，配色舒适
5. 导出透明背景 PNG

## 技术栈
Vue3 (`<script setup>`) + Vite + TailwindCSS + `@imgly/background-removal`（纯前端浏览器 AI 抠图）

## 核心架构：三层 Canvas
```
1. originalCanvas  原图（还原时从此采样像素）
2. maskCanvas      蒙版（alpha 通道 = 主体归属，唯一真相来源）
3. outputCanvas    最终合成（主体 + 描边），用户所见
```

## 数据流
```
上传 → 显示原图 → @imgly 抠图得初始 mask
→ [可选] 画笔擦除/还原 实时改 mask
→ mask 变化 → 重算描边 → 合成 outputCanvas
→ 导出 PNG
```
mask 是唯一真相来源；描边与最终图均由 mask 派生，故擦除/还原能实时联动描边。

## 描边算法
基于 mask alpha 通道做形态学膨胀（dilation）：轮廓向外扩 N 像素得描边区域，填充描边色，主体盖在其上。N = 描边大小。重算用 requestAnimationFrame 防抖。

## 画笔交互
- 擦除：maskCanvas 上 `destination-out`
- 还原：`source-over`，从原图采样
- 画笔大小可调（滑块 1–100px），光标圆圈实时同步尺寸
- 撤销/重做：mask 快照历史，最多 20 步

## 界面布局
左右分栏。左：画布区（棋盘格透明背景，居中，自适应缩放，内部按原图分辨率处理）。右：控制面板（描边大小、描边颜色、擦除/还原工具、画笔大小、撤销/重做、重新抠图）。顶栏：标题 + 上传 + 导出。
配色：深色 slate-900/950，面板 slate-800，强调色 indigo/violet，圆角 rounded-xl，毛玻璃质感。

## 文件结构
```
image-outline-tool/
├── index.html / package.json / vite.config.js
├── tailwind.config.js / postcss.config.js
└── src/
    ├── main.js / App.vue
    ├── components/ UploadZone.vue / CanvasEditor.vue / ControlPanel.vue
    └── composables/ useBackgroundRemoval.js / useMaskHistory.js / useOutline.js
```

## 边界处理
- 非图片文件 → 报错提示
- 大图 >4000px → 等比压缩到安全尺寸
- 模型加载中 → 进度提示，禁用操作
- 未上传 → 导出按钮禁用
