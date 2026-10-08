import { projection } from "./geo";

/** 画面の中心が指す世界座標(cx, cy)と、画面の高さに対応する世界座標の高さ h */
export type Cam = { cx: number; cy: number; h: number };
export type Px = { x: number; y: number };

const SCALE = projection.scale();

/** 実際の地図タイルの最大ズーム(19)で、画面の高さに対応する h。これより寄ると、実際の地図がぼやける */
export const minViewH = (screenH: number) => (screenH * 2 * Math.PI * SCALE) / (256 * 2 ** 19);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * ドラッグ(pan: 画面上で動いた px)と拡大縮小(zoom: 2 なら 2 倍に拡大)を、anchor(画面上の点)を基準に適用する。
 * 拡大縮小しても anchor の下にある場所は動かない。
 */
export function applyGesture(v: Cam, size: { w: number; h: number }, pan: Px, zoom: number, anchor: Px, minH: number, maxH: number): Cam {
  const k = v.h / size.h; // 1px あたりの世界座標
  const ax = v.cx + (anchor.x - size.w / 2) * k;
  const ay = v.cy + (anchor.y - size.h / 2) * k;
  const h2 = clamp(v.h / zoom, minH, maxH);
  const k2 = h2 / size.h;
  return { cx: ax - (anchor.x + pan.x - size.w / 2) * k2, cy: ay - (anchor.y + pan.y - size.h / 2) * k2, h: h2 };
}

/** 画面上の点 → 世界座標 */
export const pxToWorld = (v: Cam, size: { w: number; h: number }, p: Px) => ({
  x: v.cx + ((p.x - size.w / 2) * v.h) / size.h,
  y: v.cy + ((p.y - size.h / 2) * v.h) / size.h,
});
