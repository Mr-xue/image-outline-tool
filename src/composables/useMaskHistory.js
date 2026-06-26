import { ref } from 'vue'

/**
 * 蒙版历史管理：支持撤销/重做
 * 保存 mask canvas 的 ImageData 快照，最多 maxSteps 步
 */
export const useMaskHistory = (maxSteps = 20) => {
  const history = ref([]) // 快照栈
  const pointer = ref(-1) // 当前指针位置

  const canUndo = ref(false)
  const canRedo = ref(false)

  // 根据指针更新可撤销/重做状态
  const updateFlags = () => {
    canUndo.value = pointer.value > 0
    canRedo.value = pointer.value < history.value.length - 1
  }

  /**
   * 压入一个新快照（会丢弃当前指针之后的重做分支）
   * @param {ImageData} imageData mask 当前像素数据
   */
  const push = (imageData) => {
    // 丢弃 redo 分支
    history.value = history.value.slice(0, pointer.value + 1)
    history.value.push(imageData)

    // 超出上限则移除最旧快照
    if (history.value.length > maxSteps) {
      history.value.shift()
    }
    pointer.value = history.value.length - 1
    updateFlags()
  }

  /** 撤销：返回上一步快照，无则返回 null */
  const undo = () => {
    if (!canUndo.value) return null
    pointer.value -= 1
    updateFlags()
    return history.value[pointer.value]
  }

  /** 重做：返回下一步快照，无则返回 null */
  const redo = () => {
    if (!canRedo.value) return null
    pointer.value += 1
    updateFlags()
    return history.value[pointer.value]
  }

  /** 重置历史（重新抠图时调用） */
  const reset = () => {
    history.value = []
    pointer.value = -1
    updateFlags()
  }

  return { push, undo, redo, reset, canUndo, canRedo }
}
