"use client";

import { useEffect, useRef, type RefObject } from "react";
import { applyGesture, type Cam, type Px } from "@/lib/camera";

type Opts = {
  enabled: boolean;
  size: { w: number; h: number };
  /** いまのカメラ(ジェスチャー開始時に 1 回だけ読む) */
  getCam: () => Cam;
  onCam: (c: Cam) => void;
  /** 操作中かどうか(true の間、地図はスプリングを使わずに指へ即座についてくる) */
  onActive: (active: boolean) => void;
  minH: number;
  maxH: number;
};

/**
 * ドラッグで移動、ホイール・トラックパッド・2 本指ピンチで拡大縮小する。
 * 拡大縮小は指(カーソル)の下の場所を動かさない。
 */
export function useMapGestures(ref: RefObject<HTMLElement | null>, opts: Opts) {
  const o = useRef(opts);
  o.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el || !opts.enabled) return;

    const pointers = new Map<number, Px>();
    let cam: Cam | null = null;
    let wheelTimer = 0;
    let dragging = false;

    const local = (e: { clientX: number; clientY: number }): Px => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const apply = (pan: Px, zoom: number, anchor: Px) => {
      cam ??= o.current.getCam();
      cam = applyGesture(cam, o.current.size, pan, zoom, anchor, o.current.minH, o.current.maxH);
      o.current.onCam(cam);
    };
    const finish = () => {
      cam = null;
      dragging = false;
      o.current.onActive(false);
    };

    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      if (!dragging) {
        dragging = true;
        cam = o.current.getCam();
        o.current.onActive(true);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const now = local(e);
      if (pointers.size === 1) {
        apply({ x: now.x - prev.x, y: now.y - prev.y }, 1, prev);
        pointers.set(e.pointerId, now);
        return;
      }
      if (pointers.size === 2) {
        const [aId, bId] = [...pointers.keys()];
        const pa = pointers.get(aId)!;
        const pb = pointers.get(bId)!;
        const na = e.pointerId === aId ? now : pa;
        const nb = e.pointerId === bId ? now : pb;
        const prevMid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const mid = { x: (na.x + nb.x) / 2, y: (na.y + nb.y) / 2 };
        const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1;
        const d1 = Math.hypot(na.x - nb.x, na.y - nb.y) || 1;
        apply({ x: mid.x - prevMid.x, y: mid.y - prevMid.y }, d1 / d0, prevMid);
      }
      pointers.set(e.pointerId, now);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (pointers.size === 0) finish();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!dragging) {
        dragging = true;
        cam = o.current.getCam();
        o.current.onActive(true);
      }
      // ピンチ操作のトラックパッド(ctrlKey 付き)は deltaY が小さいので強めに効かせる
      const zoom = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016));
      apply({ x: 0, y: 0 }, zoom, local(e));
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        if (pointers.size === 0) finish();
      }, 160);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.clearTimeout(wheelTimer);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      if (dragging) o.current.onActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, opts.enabled]);
}
