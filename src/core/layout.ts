/** Draft geometry. Reference frame is 2560 by 1440. Other 16:9 frames scale independently. */

export const REF_W = 2560
export const REF_H = 1440

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export const CARD_CENTRES: Point[] = [
  { x: 712, y: 855 },
  { x: 1280, y: 527 },
  { x: 1848, y: 855 },
]

export const ICON_EDGE = 185
export const ICON_SCALE = 0.95
export const CHOICE_BOX = { x: 238, y: 380, w: 30, h: 48 }
export const ROUND_BOX = { x: 1318, y: 50, w: 34, h: 32 }
export const SLACK = 4
export const REROLL_PILL = { x: 1140, y: 913, w: 280, h: 83 }
export const REROLL_CAPTION = { x: 1150, y: 1030, w: 65, h: 60 }
export const PORTRAIT_Y = 72
export const PORTRAIT_D = 100
export const PORTRAIT_X = [725, 840, 957, 1075, 1480, 1595, 1710, 1825]

export interface Calibration {
  centres?: Point[]
  choice?: Box
  round?: Box
  reroll?: Box
  caption?: Box
}

export function scaleX(frameW: number, x: number): number {
  return (x * frameW) / REF_W
}

export function scaleY(frameH: number, y: number): number {
  return (y * frameH) / REF_H
}

export function scaleBox(frameW: number, frameH: number, box: Box, slack = 0): Box {
  const x = scaleX(frameW, box.x - slack)
  const y = scaleY(frameH, box.y - slack)
  const r = scaleX(frameW, box.x + box.w + slack)
  const b = scaleY(frameH, box.y + box.h + slack)
  return { x, y, w: r - x, h: b - y }
}

export function cardSquare(frameW: number, frameH: number, slot: number, calibration?: Calibration | null): Box {
  const centre = calibration?.centres?.[slot] ?? {
    x: scaleX(frameW, CARD_CENTRES[slot].x),
    y: scaleY(frameH, CARD_CENTRES[slot].y),
  }
  const edge = scaleX(frameW, ICON_EDGE * ICON_SCALE)
  return { x: centre.x - edge / 2, y: centre.y - edge / 2, w: edge, h: edge }
}

export function isSixteenByNine(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false
  const ratio = width / height
  return Math.abs(ratio - 16 / 9) < 0.02
}

/** U1. Built-in boxes stay the default. Non-16:9 is refused only when asked. */
export function layoutFor(frameW: number, frameH: number, calibration: Calibration | null, strictAspect: boolean): { ok: boolean; reason?: string } {
  if (strictAspect && !isSixteenByNine(frameW, frameH) && !calibration) {
    return { ok: false, reason: 'This frame is not 16:9. Line up the boxes before advice is drawn.' }
  }
  return { ok: true }
}
