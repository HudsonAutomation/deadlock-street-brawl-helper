/** Restore the control window only when an 80 by 32 piece of the title strip is on a display. */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_BOUNDS = { width: 460, height: 640 }
export const MIN_BOUNDS = { width: 360, height: 300 }

export function titleStripOnDisplay(bounds: Rect, displays: Rect[]): boolean {
  const strip = { x: bounds.x, y: bounds.y, width: Math.min(80, bounds.width), height: Math.min(32, bounds.height) }
  return displays.some((display) => overlapArea(strip, display) >= 80 * 32 * 0.5 || containsPoint(display, strip.x + 40, strip.y + 16))
}

function overlapArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return x * y
}

function containsPoint(display: Rect, x: number, y: number): boolean {
  return x >= display.x && x < display.x + display.width && y >= display.y && y < display.y + display.height
}

export function restoreBounds(saved: Rect | null, displays: Rect[], harness: boolean, testModeMoved: boolean): Rect {
  const primary = displays[0] ?? { x: 0, y: 0, width: 1920, height: 1080 }
  const centred = {
    x: Math.round(primary.x + (primary.width - DEFAULT_BOUNDS.width) / 2),
    y: Math.round(primary.y + (primary.height - DEFAULT_BOUNDS.height) / 2),
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
  }
  if (harness || testModeMoved || !saved) return centred
  if (!titleStripOnDisplay(saved, displays)) return centred
  return {
    x: saved.x,
    y: saved.y,
    width: Math.max(MIN_BOUNDS.width, saved.width),
    height: Math.max(MIN_BOUNDS.height, saved.height),
  }
}
