<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { composeOutline } from '../composables/useOutline'

const props = defineProps({
  originalCanvas: Object, // 原图 canvas（离屏，由父组件持有）
  maskCanvas: Object, // 蒙版 canvas（离屏）
  strokeSize: Number,
  strokeColor: String,
  tool: String, // 'erase' | 'restore'
  brushSize: Number,
})

// 通知父组件：一次涂抹笔画结束（用于压入历史快照）
const emit = defineEmits(['stroke-end'])

const outputCanvas = ref(null) // 模板里的可见输出 canvas
const wrapperRef = ref(null) // 画布外层容器（用于计算缩放比例）

const isDrawing = ref(false)
const cursorPos = ref({ x: 0, y: 0, visible: false }) // 自定义画笔光标位置（CSS 像素）

let rafId = null // requestAnimationFrame 句柄，用于描边重算防抖

/**
 * 重新合成输出（描边 + 主体），用 rAF 防抖避免高频重算卡顿
 */
const scheduleCompose = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    if (!props.originalCanvas || !outputCanvas.value) return
    composeOutline({
      originalCanvas: props.originalCanvas,
      maskCanvas: props.maskCanvas,
      outputCanvas: outputCanvas.value,
      strokeSize: props.strokeSize,
      strokeColor: props.strokeColor,
    })
  })
}

// 暴露给父组件：抠图完成 / 撤销重做后强制重绘
defineExpose({ scheduleCompose })

// 描边参数变化时实时联动重算
watch(() => [props.strokeSize, props.strokeColor], scheduleCompose)

/**
 * 将鼠标事件坐标换算到原图像素坐标
 * （显示尺寸经过 CSS 缩放，需按比例还原到 canvas 内部分辨率）
 */
const getCanvasPoint = (e) => {
  const rect = outputCanvas.value.getBoundingClientRect()
  const scaleX = outputCanvas.value.width / rect.width
  const scaleY = outputCanvas.value.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

/**
 * 在 mask 上绘制一笔。
 * 擦除：destination-out 抹掉 mask alpha；
 * 还原：从原图对应区域采样并以圆形画回 mask。
 */
const drawAt = (x, y) => {
  const ctx = props.maskCanvas.getContext('2d')
  const radius = props.brushSize / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.closePath()

  if (props.tool === 'erase') {
    // 擦除：删除该圆形区域的 mask 像素
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fill()
  } else {
    // 还原：把原图对应圆形区域画回 mask（裁剪到圆内）
    ctx.globalCompositeOperation = 'source-over'
    ctx.clip()
    ctx.drawImage(props.originalCanvas, 0, 0)
  }
  ctx.restore()
}

/**
 * 拖动过程中直接把当前笔刷增量画到可见输出画布上，实现主体实时跟随。
 * 只绘制单个圆形区域，复杂度 O(笔刷面积)，与图片总尺寸无关，避免每帧全图重算描边导致的卡顿。
 * 描边轮廓在此期间暂不更新，松手后由 scheduleCompose 一次性重算。
 */
const drawStrokeToOutput = (x, y) => {
  const ctx = outputCanvas.value.getContext('2d')
  const radius = props.brushSize / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.closePath()

  if (props.tool === 'erase') {
    // 擦除：同步抹掉输出画布上对应圆形区域的像素（含残留描边），主体实时消失
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fill()
  } else {
    // 还原：把原图对应圆形区域画回输出画布（裁剪到圆内），主体实时长出
    ctx.globalCompositeOperation = 'source-over'
    ctx.clip()
    ctx.drawImage(props.originalCanvas, 0, 0)
  }
  ctx.restore()
}

const handlePointerDown = (e) => {
  if (!props.originalCanvas) return
  isDrawing.value = true
  const p = getCanvasPoint(e)
  drawAt(p.x, p.y) // 更新 mask（真实数据）
  drawStrokeToOutput(p.x, p.y) // 实时增量显示，拖动中不重算描边
}

const handlePointerMove = (e) => {
  // 更新自定义光标位置（相对容器的 CSS 坐标）
  const rect = wrapperRef.value.getBoundingClientRect()
  cursorPos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    visible: true,
  }

  if (!isDrawing.value) return
  const p = getCanvasPoint(e)
  drawAt(p.x, p.y) // 更新 mask（真实数据）
  drawStrokeToOutput(p.x, p.y) // 实时增量显示，拖动中不重算描边
}

const endStroke = () => {
  if (!isDrawing.value) return
  isDrawing.value = false
  scheduleCompose() // 松手后一次性重算完整描边并合成，贴合新边界
  emit('stroke-end') // 一笔结束，压入历史
}

// 光标显示直径（CSS 像素）：按当前缩放比换算画笔大小
const cursorSize = computed(() => {
  if (!outputCanvas.value) return props.brushSize
  const rect = outputCanvas.value.getBoundingClientRect()
  const scale = rect.width / outputCanvas.value.width || 1
  return props.brushSize * scale
})

onMounted(scheduleCompose)
</script>

<template>
  <div
    ref="wrapperRef"
    class="relative flex h-full w-full items-center justify-center"
    @mouseleave="cursorPos.visible = false"
  >
    <!-- 可见输出画布（棋盘格背景透出透明区域） -->
    <canvas
      ref="outputCanvas"
      class="checkerboard max-h-full max-w-full rounded-md border border-gray-200 shadow-sm"
      style="cursor: none; object-fit: contain"
      @mousedown="handlePointerDown"
      @mousemove="handlePointerMove"
      @mouseup="endStroke"
      @mouseleave="endStroke"
    ></canvas>

    <!-- 自定义画笔光标圆圈（mix-blend-difference 保证在任意底色上可见） -->
    <div
      v-show="cursorPos.visible"
      class="pointer-events-none absolute rounded-full border-2 border-white mix-blend-difference"
      :style="{
        width: cursorSize + 'px',
        height: cursorSize + 'px',
        left: cursorPos.x + 'px',
        top: cursorPos.y + 'px',
        transform: 'translate(-50%, -50%)',
      }"
    ></div>
  </div>
</template>
