/**
 * 描边合成算法
 * 思路：基于 mask 的 alpha 通道做形态学膨胀，得到向外扩张的轮廓区域，
 * 填充描边颜色作为底层，再把"原图按 mask 裁切出的主体"叠在上层。
 */

/** 将 #rrggbb 颜色字符串解析为 [r,g,b] */
const hexToRgb = (hex) => {
  const v = hex.replace('#', '')
  const num = parseInt(v.length === 3 ? v.replace(/(.)/g, '$1$1') : v, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/**
 * 基于 mask alpha 计算膨胀后的"描边覆盖"二值数组。
 * 采用分离式的切比雪夫距离变换（两次一维扫描）近似方形膨胀，性能远优于逐像素邻域遍历。
 * @param {Uint8ClampedArray} maskData mask 的 RGBA 像素
 * @param {number} w 宽
 * @param {number} h 高
 * @param {number} radius 膨胀半径（描边大小，像素）
 * @returns {Uint8Array} 长度 w*h，1 表示该像素在膨胀区域内
 */
const dilateMask = (maskData, w, h, radius) => {
  const size = w * h
  const INF = 1e9
  // dist[i] = 到最近"主体像素"的距离（用于判断是否在 radius 内）
  const dist = new Float32Array(size)

  // 初始化：主体像素(alpha>阈值)距离 0，其余 INF
  for (let i = 0; i < size; i++) {
    dist[i] = maskData[i * 4 + 3] > 128 ? 0 : INF
  }

  // 横向扫描（两遍：左→右、右→左），用切比雪夫距离更新
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 1; x < w; x++) {
      const i = row + x
      if (dist[i - 1] + 1 < dist[i]) dist[i] = dist[i - 1] + 1
    }
    for (let x = w - 2; x >= 0; x--) {
      const i = row + x
      if (dist[i + 1] + 1 < dist[i]) dist[i] = dist[i + 1] + 1
    }
  }

  // 纵向扫描（两遍：上→下、下→上）
  for (let x = 0; x < w; x++) {
    for (let y = 1; y < h; y++) {
      const i = y * w + x
      if (dist[i - w] + 1 < dist[i]) dist[i] = dist[i - w] + 1
    }
    for (let y = h - 2; y >= 0; y--) {
      const i = y * w + x
      if (dist[i + w] + 1 < dist[i]) dist[i] = dist[i + w] + 1
    }
  }

  // 距离 <= radius 的像素即落在描边膨胀区域内
  const out = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    out[i] = dist[i] <= radius ? 1 : 0
  }
  return out
}

/**
 * 合成最终输出：描边底 + 主体。
 * @param {Object} params
 * @param {HTMLCanvasElement} params.originalCanvas 原图 canvas
 * @param {HTMLCanvasElement} params.maskCanvas 蒙版 canvas
 * @param {HTMLCanvasElement} params.outputCanvas 输出 canvas（会被写入）
 * @param {number} params.strokeSize 描边大小（像素，0 表示不描边）
 * @param {string} params.strokeColor 描边颜色 #rrggbb
 */
export const composeOutline = ({ originalCanvas, maskCanvas, outputCanvas, strokeSize, strokeColor }) => {
  const w = originalCanvas.width
  const h = originalCanvas.height
  outputCanvas.width = w
  outputCanvas.height = h

  const octx = outputCanvas.getContext('2d')
  octx.clearRect(0, 0, w, h)

  const maskCtx = maskCanvas.getContext('2d')
  const maskData = maskCtx.getImageData(0, 0, w, h).data

  // 1) 绘制描边层（若 strokeSize > 0）
  if (strokeSize > 0) {
    const dilated = dilateMask(maskData, w, h, strokeSize)
    const [r, g, b] = hexToRgb(strokeColor)
    const strokeImage = octx.createImageData(w, h)
    const sd = strokeImage.data
    for (let i = 0; i < w * h; i++) {
      if (dilated[i]) {
        sd[i * 4] = r
        sd[i * 4 + 1] = g
        sd[i * 4 + 2] = b
        sd[i * 4 + 3] = 255
      }
    }
    octx.putImageData(strokeImage, 0, 0)
  }

  // 2) 叠加主体：用 mask 作为 alpha，从原图取色，画在描边之上
  //    借助离屏 canvas 完成 "原图 × mask" 的裁切
  const subjectCanvas = document.createElement('canvas')
  subjectCanvas.width = w
  subjectCanvas.height = h
  const sctx = subjectCanvas.getContext('2d')
  sctx.drawImage(originalCanvas, 0, 0)
  // destination-in：仅保留与 mask 不透明区域重叠的原图像素
  sctx.globalCompositeOperation = 'destination-in'
  sctx.drawImage(maskCanvas, 0, 0)

  // 主体盖在描边层上（source-over 默认）
  octx.drawImage(subjectCanvas, 0, 0)
}
