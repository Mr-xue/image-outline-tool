<script setup>
// 控制面板：描边设置 + 画笔工具 + 撤销重做 + 重新抠图
// 所有状态用 v-model 双向绑定到父组件

defineProps({
  strokeSize: Number,
  strokeColor: String,
  tool: String, // 'erase' | 'restore'
  brushSize: Number,
  canUndo: Boolean,
  canRedo: Boolean,
  disabled: Boolean, // 抠图进行中时禁用
})

const emit = defineEmits([
  'update:strokeSize',
  'update:strokeColor',
  'update:tool',
  'update:brushSize',
  'undo',
  'redo',
  'reprocess',
])

// 预设描边颜色
const presetColors = ['#ffffff', '#000000', '#f43f5e', '#22d3ee', '#a78bfa', '#facc15']
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 描边设置 -->
    <section class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>描边设置
      </h3>

      <!-- 描边大小 -->
      <div class="mb-4">
        <div class="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>描边大小</span>
          <span class="tabular-nums text-slate-300">{{ strokeSize }} px</span>
        </div>
        <input
          type="range" min="0" max="50" :value="strokeSize" :disabled="disabled"
          class="w-full"
          @input="emit('update:strokeSize', Number($event.target.value))"
        />
      </div>

      <!-- 描边颜色 -->
      <div>
        <div class="mb-2 text-xs text-slate-400">描边颜色</div>
        <div class="flex items-center gap-2">
          <!-- 预设色块 -->
          <button
            v-for="c in presetColors" :key="c"
            class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
            :class="strokeColor.toLowerCase() === c ? 'border-indigo-400' : 'border-slate-600'"
            :style="{ backgroundColor: c }"
            :disabled="disabled"
            @click="emit('update:strokeColor', c)"
          ></button>
          <!-- 自定义取色器 -->
          <label class="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-slate-600">
            <span class="absolute inset-0 bg-gradient-to-br from-rose-400 via-violet-400 to-cyan-400"></span>
            <input
              type="color" :value="strokeColor" :disabled="disabled"
              class="absolute inset-0 cursor-pointer opacity-0"
              @input="emit('update:strokeColor', $event.target.value)"
            />
          </label>
        </div>
      </div>
    </section>

    <!-- 修正工具 -->
    <section class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span class="h-1.5 w-1.5 rounded-full bg-violet-400"></span>修正工具
      </h3>

      <!-- 擦除 / 还原 切换 -->
      <div class="mb-4 grid grid-cols-2 gap-2">
        <button
          class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-all"
          :class="tool === 'erase'
            ? 'border-indigo-400 bg-indigo-500/15 text-indigo-200'
            : 'border-slate-600 text-slate-400 hover:border-slate-500'"
          :disabled="disabled"
          @click="emit('update:tool', 'erase')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" transform="rotate(45 12 12)"/></svg>
          擦除
        </button>
        <button
          class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-all"
          :class="tool === 'restore'
            ? 'border-violet-400 bg-violet-500/15 text-violet-200'
            : 'border-slate-600 text-slate-400 hover:border-slate-500'"
          :disabled="disabled"
          @click="emit('update:tool', 'restore')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          还原
        </button>
      </div>

      <!-- 画笔大小 -->
      <div>
        <div class="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>画笔大小</span>
          <span class="tabular-nums text-slate-300">{{ brushSize }} px</span>
        </div>
        <input
          type="range" min="1" max="100" :value="brushSize" :disabled="disabled"
          class="w-full"
          @input="emit('update:brushSize', Number($event.target.value))"
        />
      </div>

      <!-- 撤销 / 重做 -->
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 transition-colors enabled:hover:border-slate-500 disabled:opacity-40"
          :disabled="!canUndo || disabled"
          @click="emit('undo')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
          撤销
        </button>
        <button
          class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 transition-colors enabled:hover:border-slate-500 disabled:opacity-40"
          :disabled="!canRedo || disabled"
          @click="emit('redo')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/></svg>
          重做
        </button>
      </div>
    </section>

    <!-- 重新抠图 -->
    <button
      class="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700/40 disabled:opacity-40"
      :disabled="disabled"
      @click="emit('reprocess')"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
      重新识别主体
    </button>
  </div>
</template>
