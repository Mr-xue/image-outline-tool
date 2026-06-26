<script setup>
import { ref, reactive } from 'vue'
import UploadZone from './components/UploadZone.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import ControlPanel from './components/ControlPanel.vue'
import { useBackgroundRemoval } from './composables/useBackgroundRemoval'
import { useMaskHistory } from './composables/useMaskHistory'

// ===== 抠图能力 =====
const { isProcessing, progress, error, removeBg } = useBackgroundRemoval()

// ===== 历史管理 =====
const { push, undo, redo, reset, canUndo, canRedo } = useMaskHistory(20)

// ===== 离屏 canvas（原图 / 蒙版）=====
// 用普通对象持有，避免响应式深代理影响 canvas 性能
const layers = reactive({
  originalCanvas: null,
  maskCanvas: null,
})

const hasImage = ref(false) // 是否已成功抠图
const editorRef = ref(null) // CanvasEditor 实例引用

// ===== 控制参数 =====
const strokeSize = ref(8)
const strokeColor = ref('#ffffff')
const tool = ref('erase')
const brushSize = ref(30)

let currentFile = null // 当前原始文件（重新抠图用）

const MAX_DIMENSION = 2048 // 大图安全上限，超出则等比压缩

/**
 * 将 File 读取为 HTMLImageElement
 */
const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })

/**
 * 把图片绘制到原图 canvas，超大图等比缩放
 * @returns {{canvas: HTMLCanvasElement, blob: Promise<Blob>}}
 */
const prepareOriginalCanvas = async (img) => {
  let { width, height } = img
  // 等比压缩到安全尺寸，防止浏览器内存溢出
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)
  return canvas
}

/**
 * 主流程：选中文件 → 准备原图 → 抠图 → 生成 mask → 首帧合成
 */
const handleSelect = async (file) => {
  currentFile = file
  reset()

  const img = await loadImage(file)
  const originalCanvas = await prepareOriginalCanvas(img)
  layers.originalCanvas = originalCanvas

  // 将（可能已缩放的）原图转为 blob 交给抠图模型
  const blob = await new Promise((res) => originalCanvas.toBlob(res, 'image/png'))
  const resultBlob = await removeBg(blob)
  if (!resultBlob) return // 失败时 error 已被设置

  // 抠图结果（透明背景 PNG）即为初始 mask
  const maskImg = await loadImage(new File([resultBlob], 'mask.png'))
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = originalCanvas.width
  maskCanvas.height = originalCanvas.height
  maskCanvas.getContext('2d').drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height)
  layers.maskCanvas = maskCanvas

  hasImage.value = true
  // 压入初始历史快照
  saveSnapshot()
  // 等 DOM 更新后触发首帧合成
  requestAnimationFrame(() => editorRef.value?.scheduleCompose())
}

/** 读取当前 mask 像素，压入历史 */
const saveSnapshot = () => {
  const ctx = layers.maskCanvas.getContext('2d')
  const data = ctx.getImageData(0, 0, layers.maskCanvas.width, layers.maskCanvas.height)
  push(data)
}

/** 将某个历史快照写回 mask 并重绘 */
const restoreSnapshot = (imageData) => {
  if (!imageData) return
  const ctx = layers.maskCanvas.getContext('2d')
  ctx.putImageData(imageData, 0, 0)
  editorRef.value?.scheduleCompose()
}

const handleUndo = () => restoreSnapshot(undo())
const handleRedo = () => restoreSnapshot(redo())

/** 重新抠图：用原文件再跑一次 */
const handleReprocess = () => {
  if (currentFile) handleSelect(currentFile)
}

/** 导出透明 PNG */
const handleExport = () => {
  const canvas = editorRef.value?.$el?.querySelector('canvas')
  if (!canvas) return
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outline-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-950 text-slate-100">
    <!-- 顶栏 -->
    <header
      class="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-3 backdrop-blur"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
          <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"/></svg>
        </div>
        <div>
          <h1 class="text-base font-semibold leading-tight">主体抠图描边工具</h1>
          <p class="text-xs text-slate-500">AI 识别主体 · 智能描边 · 手动修正</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- 重新上传 -->
        <label
          v-if="hasImage"
          class="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          <input type="file" accept="image/*" class="hidden" @change="(e) => e.target.files[0] && handleSelect(e.target.files[0])" />
          重新上传
        </label>
        <!-- 导出 -->
        <button
          class="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!hasImage || isProcessing"
          @click="handleExport"
        >
          导出 PNG
        </button>
      </div>
    </header>

    <!-- 主体区域 -->
    <main class="flex min-h-0 flex-1">
      <!-- 左：画布区 -->
      <div class="relative flex min-w-0 flex-1 items-center justify-center p-6">
        <!-- 未上传：上传区 -->
        <div v-if="!hasImage && !isProcessing" class="h-full w-full max-w-3xl">
          <UploadZone @select="handleSelect" />
        </div>

        <!-- 已上传：编辑器 -->
        <CanvasEditor
          v-else-if="hasImage"
          ref="editorRef"
          :original-canvas="layers.originalCanvas"
          :mask-canvas="layers.maskCanvas"
          :stroke-size="strokeSize"
          :stroke-color="strokeColor"
          :tool="tool"
          :brush-size="brushSize"
          @stroke-end="saveSnapshot"
        />

        <!-- 抠图中：进度遮罩 -->
        <div
          v-if="isProcessing"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/70 backdrop-blur-sm"
        >
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-400"></div>
          <div class="text-center">
            <p class="text-sm font-medium text-slate-200">正在识别主体…</p>
            <p class="mt-1 text-xs text-slate-500">首次使用需加载 AI 模型，请稍候 {{ progress }}%</p>
          </div>
        </div>

        <!-- 错误提示 -->
        <div
          v-if="error"
          class="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-200"
        >
          {{ error }}
        </div>
      </div>

      <!-- 右：控制面板 -->
      <aside class="w-72 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-900/40 p-5">
        <ControlPanel
          v-model:stroke-size="strokeSize"
          v-model:stroke-color="strokeColor"
          v-model:tool="tool"
          v-model:brush-size="brushSize"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :disabled="!hasImage || isProcessing"
          @undo="handleUndo"
          @redo="handleRedo"
          @reprocess="handleReprocess"
        />
      </aside>
    </main>
  </div>
</template>
