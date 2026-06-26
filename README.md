# 🎨 主体抠图描边工具 · Image Outline Tool

> 浏览器端 AI 抠图描边工具，支持自定义描边与手动修正
> In-browser AI subject cutout with customizable outlines & manual refinement

纯前端运行的 AI 图像处理工具：自动识别并抠出图片主体，为主体轮廓添加可定制的描边，并支持手动擦除/还原来修正识别误差，最终一键导出透明背景 PNG。**所有处理均在浏览器本地完成，图片不会上传到任何服务器。**

A fully client-side AI image tool: automatically detects and extracts the subject from an image, adds a customizable outline, lets you manually erase/restore to fix inaccuracies, and exports a transparent PNG. **Everything runs locally in your browser — no image is ever uploaded.**

---

## ✨ 功能特性 · Features

- 🤖 **AI 自动抠图** — 基于 [`@imgly/background-removal`](https://github.com/imgly/background-removal-js)，浏览器端运行，无需后端、保护隐私
- 🖊️ **可定制描边** — 描边大小（0–50px）与颜色（预设色 + 自定义取色器）均可调，**所见即所得实时联动**
- 🩹 **手动修正** — 擦除多余区域 / 还原误删主体，画笔大小可调（1–100px），自定义光标实时反馈
- ↩️ **撤销 / 重做** — 最多 20 步历史快照
- 💾 **一键导出** — 导出透明背景 PNG
- 🎨 **现代界面** — 深色配色、毛玻璃质感、棋盘格透明背景展示

## 🛠️ 技术栈 · Tech Stack

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (`<script setup>`) |
| 构建 | Vite 5 |
| 样式 | TailwindCSS 3 |
| AI 抠图 | @imgly/background-removal |

## 🏗️ 核心设计 · Architecture

采用 **三层 Canvas** 架构：

```
1. originalCanvas  原图层 —— 还原操作时从此采样像素
2. maskCanvas      蒙版层 —— alpha 通道记录主体归属（唯一真相来源）
3. outputCanvas    输出层 —— 描边 + 主体的合成结果
```

蒙版（mask）是唯一真相来源，描边与最终图都由它派生，因此擦除/还原能**实时联动**描边。

**描边算法**：对蒙版 alpha 通道做形态学膨胀（两次一维距离变换近似方形膨胀），将轮廓向外扩张 N 像素生成描边区域，性能远优于逐像素邻域遍历，大图也不卡顿。

## 🚀 快速开始 · Quick Start

```bash
# 克隆项目
git clone https://github.com/Mr-xue/image-outline-tool.git
cd image-outline-tool

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build
```

## 📖 使用说明 · Usage

1. **上传图片** — 拖拽或点击上传区，支持 PNG / JPG / WEBP
2. **等待识别** — 首次使用需加载 AI 模型（约 24MB，带进度提示），之后浏览器缓存即可秒开
3. **调整描边** — 在右侧面板设置描边大小与颜色，实时预览
4. **手动修正**（可选）
   - **擦除**：抹掉 AI 多保留的背景残留
   - **还原**：刷回被误删的主体部分（如发丝）
5. **导出** — 点击「导出 PNG」保存透明背景图片

## ⚠️ 注意事项 · Notes

- 首次抠图需下载 AI 模型（约 24MB），请耐心等待
- 超过 2048px 的大图会自动等比压缩，防止浏览器内存溢出
- 推荐使用 Chrome / Edge 等现代浏览器以获得最佳性能

## 📁 项目结构 · Structure

```
image-outline-tool/
├── src/
│   ├── App.vue                      # 状态中枢
│   ├── components/
│   │   ├── UploadZone.vue           # 拖拽/点击上传
│   │   ├── CanvasEditor.vue         # 三层 canvas + 画笔交互
│   │   └── ControlPanel.vue         # 描边/工具控制面板
│   └── composables/
│       ├── useBackgroundRemoval.js  # 抠图封装
│       ├── useMaskHistory.js        # 撤销/重做
│       └── useOutline.js            # 描边膨胀算法
└── docs/plans/                      # 设计文档
```

## 📄 License

MIT
