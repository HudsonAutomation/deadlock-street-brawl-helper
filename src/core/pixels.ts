/** Colour tests for rare, enhanced, loading-screen cream, and a black probe. */

export interface Rgba {
  width: number
  height: number
  data: Uint8Array
}

function at(image: Rgba, x: number, y: number): [number, number, number] {
  const i = (y * image.width + x) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2]]
}

export function fraction(image: Rgba, pred: (r: number, g: number, b: number) => boolean): number {
  const pixels = image.width * image.height
  if (!pixels) return 0
  let hit = 0
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const [r, g, b] = at(image, x, y)
      if (pred(r, g, b)) hit++
    }
  }
  return hit / pixels
}

export function greenDominant(r: number, g: number, b: number): boolean {
  return g > 150 && g >= r + 50 && b > r + 30 && Math.abs(g - b) <= 20
}

export function blueDominant(r: number, g: number, b: number): boolean {
  return b > 150 && b >= r + 60 && b >= g + 20
}

export function cream(r: number, g: number, b: number): boolean {
  return r > 215 && g > 195 && b > 160 && r - b >= 10 && r - b <= 80
}

export function dark(r: number, g: number, b: number): boolean {
  return r < 60 && g < 60 && b < 60
}

export function isRareMark(sample: Rgba): boolean {
  return fraction(sample, greenDominant) > 0.08
}

export function isEnhancedMark(sample: Rgba): boolean {
  return fraction(sample, blueDominant) > 0.06
}

export function looksLikeLoadingName(sample: Rgba): boolean {
  const creamFrac = fraction(sample, cream)
  const darkFrac = fraction(sample, dark)
  return creamFrac >= 0.1 && creamFrac <= 0.55 && darkFrac > 0.4
}

export function isBlack(sample: Rgba): boolean {
  return fraction(sample, (r, g, b) => r < 8 && g < 8 && b < 8) > 0.98
}

/** A tall thin mark is the digit 1. Anything else, while the reader is down, is 0. */
export function rerollGlyphIsOne(sample: Rgba): boolean {
  let minX = sample.width
  let maxX = -1
  let minY = sample.height
  let maxY = -1
  for (let y = 0; y < sample.height; y++) {
    for (let x = 0; x < sample.width; x++) {
      const [r, g, b] = at(sample, x, y)
      if (r + g + b > 400) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (maxX < 0) return false
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  return h >= 8 && w / h <= 0.45
}

export function crop(image: Rgba, x: number, y: number, w: number, h: number): Rgba {
  const data = new Uint8Array(w * h * 4)
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const sx = Math.min(image.width - 1, Math.max(0, x + col))
      const sy = Math.min(image.height - 1, Math.max(0, y + row))
      const si = (sy * image.width + sx) * 4
      const di = (row * w + col) * 4
      data[di] = image.data[si]
      data[di + 1] = image.data[si + 1]
      data[di + 2] = image.data[si + 2]
      data[di + 3] = image.data[si + 3]
    }
  }
  return { width: w, height: h, data }
}
