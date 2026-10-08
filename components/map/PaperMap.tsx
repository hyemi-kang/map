"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { animate, frame, cancelFrame } from "motion";
import { threeEffect } from "motion/three";
import type { Rect } from "@/lib/geo";
import { fragmentShader, vertexShader } from "./mapShader";
import { pick, renderLayer, type LayerSpec } from "./mapTexture";

export type View = { cx: number; cy: number; h: number };
/** 机の上に置いた紙(シート)の状態。全画面表示のときは inset=0, tilt=0, wear=0 */
export type Sheet = { inset: number; tilt: number; wear: number };

type Props = {
  view: View;
  layer: LayerSpec;
  sheet: Sheet;
  /** クリックできる領域を押したとき */
  onPick?: (id: string) => void;
  /** シート内のどこかを押したとき(机の上にある状態で使う) */
  onSheetClick?: () => void;
  /** ズームが落ち着いたとき */
  onSettled?: () => void;
  interactive?: boolean;
  /** true の間は描画を止める(上に不透明な画面が重なっているとき) */
  paused?: boolean;
  className?: string;
};

type Slot = { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; bounds: Rect; spec: LayerSpec };

let effectRegistered = false;
const SPRING = { type: "spring", stiffness: 55, damping: 15, mass: 1 } as const;
const SHEET_SPRING = { type: "spring", stiffness: 70, damping: 16 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 表示範囲を scale 倍に広げた世界範囲(ズーム中も端が見えないように) */
function boundsFor(view: View, aspect: number, scale: number): Rect {
  const w = view.h * Math.max(aspect, 2) * scale;
  const h = view.h * scale;
  return { x: view.cx - w / 2, y: view.cy - h / 2, w, h };
}

/** 世界座標 → 画面(CSS px)。全画面表示(inset=0, tilt=0)のときのピン配置などに使う */
export function worldToScreen(view: View, width: number, height: number, wx: number, wy: number) {
  const aspect = width / height;
  return {
    x: ((wx - view.cx) / (view.h * aspect) + 0.5) * width,
    y: ((wy - view.cy) / view.h + 0.5) * height,
  };
}

export default function PaperMap({ view, layer, sheet, onPick, onSheetClick, onSettled, interactive = true, paused = false, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<{
    goTo: (v: View, l: LayerSpec) => void;
    setSheet: (s: Sheet) => void;
    setInteractive: (b: boolean) => void;
  } | null>(null);
  const cb = useRef({ onPick, onSettled, onSheetClick });
  cb.current = { onPick, onSettled, onSheetClick };
  const first = useRef({ view, layer, interactive, sheet });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const el = canvas.current!;
    const wrap = host.current!;
    if (!effectRegistered) {
      animate.addEffect(threeEffect);
      effectRegistered = true;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    let aspect = 1;
    let cssW = 1;
    const init = first.current;

    const makeSlot = (): Slot => {
      const c = document.createElement("canvas");
      c.width = c.height = 4;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return { canvas: c, tex, bounds: { x: 0, y: 0, w: 1, h: 1 }, spec: init.layer };
    };
    let a = makeSlot();
    let b = makeSlot();

    const uniforms = {
      texA: { value: a.tex },
      texB: { value: b.tex },
      boundsA: { value: new THREE.Vector4(0, 0, 1, 1) },
      boundsB: { value: new THREE.Vector4(0, 0, 1, 1) },
      mixT: { value: 0 },
      center: { value: new THREE.Vector2(init.view.cx, init.view.cy) },
      zoom: { value: Math.log(init.view.h) },
      aspect: { value: 1 },
      inset: { value: init.sheet.inset },
      tilt: { value: init.sheet.tilt },
      wear: { value: init.sheet.wear },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const camera = new THREE.Camera();

    const paint = (slot: Slot, spec: LayerSpec, bounds: Rect, hover: string | null, which: "A" | "B" | null, widthScale = 1) => {
      const widthPx = Math.min(4096, Math.max(512, Math.round(cssW * dpr * 1.25 * widthScale)));
      const heightPx = Math.round((widthPx * bounds.h) / bounds.w);
      if (slot.canvas.width !== widthPx || slot.canvas.height !== heightPx) {
        slot.canvas.width = widthPx;
        slot.canvas.height = heightPx;
        slot.tex.dispose();
      }
      slot.bounds = bounds;
      slot.spec = spec;
      renderLayer(slot.canvas, bounds, spec, hover);
      slot.tex.needsUpdate = true;
      if (which === "A") uniforms.boundsA.value.set(bounds.x, bounds.y, bounds.w, bounds.h);
      if (which === "B") uniforms.boundsB.value.set(bounds.x, bounds.y, bounds.w, bounds.h);
    };

    let current: View = init.view;
    let currentSpec: LayerSpec = init.layer;
    let hoverId: string | null = null;
    let canInteract = init.interactive;
    let token = 0;
    let busy = false;
    let sheetState: Sheet = init.sheet;
    let resizeTimer = 0;

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      cssW = w;
      aspect = w / h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.aspect.value = aspect;
      // 大きさが変わったら、落ち着いたところで解像度を合わせて描き直す
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (busy) return;
        paint(a, a.spec, boundsFor(current, aspect, 1.25), hoverId, "A");
      }, 160);
    };
    resize();
    paint(a, init.layer, boundsFor(init.view, aspect, 1.25), null, "A");
    paint(b, init.layer, a.bounds, null, "B");

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* ---------- ズーム(進み具合に合わせて精細なレイヤーへ切り替える) ---------- */
    let fade: { z0: number; z1: number; c0: THREE.Vector2; c1: THREE.Vector2 } | null = null;

    const goTo = async (v: View, spec: LayerSpec) => {
      const my = ++token;
      busy = true;
      const z0 = uniforms.zoom.value;
      const z1 = Math.log(v.h);
      const c0 = uniforms.center.value.clone();
      const c1 = new THREE.Vector2(v.cx, v.cy);
      current = v;
      currentSpec = spec;
      hoverId = null;
      el.dataset.hit = "";
      // 途中まで引いた絵が見えてもよいよう、ズーム量に応じて広めに描く
      const f = Math.min(2.4, Math.max(1, Math.exp(0.4 * Math.abs(z0 - z1))));
      paint(b, spec, boundsFor(v, aspect, 1.25 * f), null, "B", f);
      fade = { z0, z1, c0, c1 };
      uniforms.mixT.value = 0;
      const move = animate(material, { centerX: v.cx, centerY: v.cy, zoom: z1 }, reduce ? { duration: 0 } : SPRING);
      try {
        await (move as unknown as PromiseLike<unknown>);
      } catch {
        /* 中断されたとき */
      }
      if (my !== token) return;
      fade = null;
      uniforms.mixT.value = 1;
      // B を新しい A にして、混ぜ具合を戻す
      [a, b] = [b, a];
      uniforms.texA.value = a.tex;
      uniforms.texB.value = b.tex;
      uniforms.boundsA.value.set(a.bounds.x, a.bounds.y, a.bounds.w, a.bounds.h);
      uniforms.boundsB.value.set(b.bounds.x, b.bounds.y, b.bounds.w, b.bounds.h);
      uniforms.mixT.value = 0;
      busy = false;
      // 解像度が足りなければ A を描き直す
      paint(a, a.spec, boundsFor(current, aspect, 1.25), null, "A");
      cb.current.onSettled?.();
    };

    const setSheet = (s: Sheet) => {
      sheetState = s;
      animate(material, { inset: s.inset, tilt: s.tilt, wear: s.wear }, reduce ? { duration: 0 } : SHEET_SPRING);
    };

    api.current = { goTo, setSheet, setInteractive: (v) => (canInteract = v) };

    /* ---------- ポインター ---------- */
    const toWorld = (e: MouseEvent) => {
      const u = e.offsetX / Math.max(1, el.clientWidth);
      const vDown = e.offsetY / Math.max(1, el.clientHeight);
      // シェーダーと同じ計算(uv は y 上向き)
      const px = (u - 0.5) * aspect;
      const py = 1 - vDown - 0.5;
      const t = uniforms.tilt.value;
      const prx = Math.cos(t) * px - Math.sin(t) * py;
      const pry = Math.sin(t) * px + Math.cos(t) * py;
      const k = 1 - 2 * uniforms.inset.value;
      const sx = prx / (k * aspect) + 0.5;
      const sy = pry / k + 0.5;
      const h = Math.exp(uniforms.zoom.value);
      return {
        x: uniforms.center.value.x + (sx - 0.5) * aspect * h,
        y: uniforms.center.value.y + (0.5 - sy) * h,
        sx,
        sy,
        u,
        v: vDown,
      };
    };
    let raf = 0;
    const repaintHover = () => {
      raf = 0;
      paint(a, a.spec, a.bounds, hoverId, null, 1);
    };
    const onMove = (e: PointerEvent) => {
      const p = toWorld(e);
      if (!canInteract || busy) return;
      const id = sheetState.wear < 0.5 ? pick(currentSpec, p.x, p.y) : null;
      if (id !== hoverId) {
        hoverId = id;
        el.dataset.hit = id ? "1" : "";
        if (!raf) raf = requestAnimationFrame(repaintHover);
      }
    };
    const onLeave = () => {
      if (hoverId) {
        hoverId = null;
        el.dataset.hit = "";
        if (!raf) raf = requestAnimationFrame(repaintHover);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!canInteract) return;
      const p = toWorld(e);
      const inSheet = p.sx > 0 && p.sx < 1 && p.sy > 0 && p.sy < 1;
      if (sheetState.wear > 0.5) {
        if (inSheet) cb.current.onSheetClick?.();
        return;
      }
      const id = pick(currentSpec, p.x, p.y);
      if (id) cb.current.onPick?.(id);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    const render = () => {
      if (pausedRef.current) return;
      if (fade) {
        const dz = Math.abs(fade.z1 - fade.z0);
        const dc = fade.c0.distanceTo(fade.c1);
        const zRemain = dz > 1e-3 ? Math.abs(uniforms.zoom.value - fade.z1) / dz : 0;
        const cRemain = dc > 1e-2 ? uniforms.center.value.distanceTo(fade.c1) / dc : 0;
        const progress = 1 - Math.min(1, Math.max(zRemain, cRemain));
        uniforms.mixT.value = smooth(0.45, 0.8, progress);
      }
      renderer.render(scene, camera);
    };
    frame.render(render, true);

    return () => {
      token++;
      window.clearTimeout(resizeTimer);
      cancelFrame(render);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      a.tex.dispose();
      b.tex.dispose();
      material.dispose();
      renderer.dispose();
      api.current = null;
    };
  }, []);

  const prev = useRef({ view, layer });
  useEffect(() => {
    api.current?.setInteractive(interactive);
  }, [interactive]);
  useEffect(() => {
    api.current?.setSheet(sheet);
  }, [sheet.inset, sheet.tilt, sheet.wear]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = prev.current;
    const same =
      p.view.cx === view.cx && p.view.cy === view.cy && p.view.h === view.h && JSON.stringify(p.layer) === JSON.stringify(layer);
    if (same) return;
    prev.current = { view, layer };
    api.current?.goTo(view, layer);
  }, [view, layer]);

  return (
    <div ref={host} className={className}>
      <canvas
        ref={canvas}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </div>
  );
}
