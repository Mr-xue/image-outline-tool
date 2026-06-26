import { ref } from 'vue'
import { removeBackground } from '@imgly/background-removal'

/**
 * 封装 @imgly/background-removal 抠图能力
 * 返回响应式的处理状态与执行方法
 */
export const useBackgroundRemoval = () => {
  const isProcessing = ref(false) // 是否正在抠图
  const progress = ref(0) // 进度 0~100
  const error = ref('') // 错误信息

  /**
   * 对传入的图片（Blob / File / dataURL）执行抠图
   * @param {Blob|string} source 图片源
   * @returns {Promise<Blob|null>} 抠图后的 PNG Blob（透明背景），失败返回 null
   */
  const removeBg = async (source) => {
    isProcessing.value = true
    progress.value = 0
    error.value = ''

    try {
      const resultBlob = await removeBackground(source, {
        // 进度回调：模型下载 + 推理阶段都会触发
        progress: (key, current, total) => {
          if (total > 0) {
            progress.value = Math.round((current / total) * 100)
          }
        },
        output: { format: 'image/png', quality: 1 },
      })
      return resultBlob
    } catch (err) {
      // 抠图失败（模型加载失败、内存不足等）
      error.value = err?.message || '抠图失败，请重试'
      return null
    } finally {
      isProcessing.value = false
    }
  }

  return { isProcessing, progress, error, removeBg }
}
