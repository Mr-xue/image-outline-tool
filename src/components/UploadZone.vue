<script setup>
import { ref } from 'vue'

// 向父组件抛出选中的图片文件
const emit = defineEmits(['select'])

const isDragging = ref(false)

// 校验并提交文件
const handleFile = (file) => {
  if (!file) return
  // 仅接受图片类型
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件（PNG / JPG 等）')
    return
  }
  emit('select', file)
}

const handleDrop = (e) => {
  isDragging.value = false
  handleFile(e.dataTransfer.files?.[0])
}

const handleChange = (e) => {
  handleFile(e.target.files?.[0])
  e.target.value = '' // 允许重复选择同一文件
}
</script>

<template>
  <!-- 拖拽 / 点击上传区 -->
  <label
    class="group flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200"
    :class="
      isDragging
        ? 'border-indigo-400 bg-indigo-500/10'
        : 'border-slate-600 hover:border-indigo-400/60 hover:bg-slate-700/20'
    "
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <input type="file" accept="image/*" class="hidden" @change="handleChange" />

    <!-- 上传图标 -->
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105"
    >
      <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
      </svg>
    </div>

    <p class="text-lg font-medium text-slate-200">拖拽图片到此处，或点击上传</p>
    <p class="mt-1 text-sm text-slate-500">支持 PNG / JPG / WEBP，自动识别主体</p>
  </label>
</template>
