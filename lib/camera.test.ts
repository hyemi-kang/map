import { describe, expect, it } from "vitest";
import { applyGesture, minViewH, pxToWorld } from "./camera";

const size = { w: 1000, h: 500 };
const v = { cx: 300, cy: 400, h: 100 }; // 1px = 0.2 世界座標

describe("applyGesture", () => {
  it("ドラッグした分だけ、逆向きに中心が動く(地図が指についてくる)", () => {
    const r = applyGesture(v, size, { x: 50, y: -25 }, 1, { x: 500, y: 250 }, 0.001, 1e6);
    expect(r.h).toBe(100);
    expect(r.cx).toBeCloseTo(300 - 50 * 0.2);
    expect(r.cy).toBeCloseTo(400 + 25 * 0.2);
  });

  it("拡大しても、カーソルの下の場所は動かない", () => {
    const anchor = { x: 800, y: 100 };
    const before = pxToWorld(v, size, anchor);
    const r = applyGesture(v, size, { x: 0, y: 0 }, 2, anchor, 0.001, 1e6);
    expect(r.h).toBeCloseTo(50);
    const after = pxToWorld(r, size, anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("縮小も同様(2 本指のピンチ + 移動を同時に)", () => {
    const anchor = { x: 200, y: 300 };
    const r = applyGesture(v, size, { x: 30, y: 10 }, 0.5, anchor, 0.001, 1e6);
    expect(r.h).toBeCloseTo(200);
    // 指が (200,300) → (230,310) に動いたので、元の場所が新しい指の位置に来る
    const grabbed = pxToWorld(v, size, anchor);
    const now = pxToWorld(r, size, { x: 230, y: 310 });
    expect(now.x).toBeCloseTo(grabbed.x);
    expect(now.y).toBeCloseTo(grabbed.y);
  });

  it("拡大・縮小には上限と下限がある", () => {
    expect(applyGesture(v, size, { x: 0, y: 0 }, 1000, { x: 500, y: 250 }, 20, 400).h).toBe(20);
    expect(applyGesture(v, size, { x: 0, y: 0 }, 0.0001, { x: 500, y: 250 }, 20, 400).h).toBe(400);
  });
});

describe("minViewH", () => {
  it("画面が高いほど大きい", () => {
    expect(minViewH(1000)).toBeCloseTo(minViewH(500) * 2);
    expect(minViewH(800)).toBeGreaterThan(0);
  });
});
