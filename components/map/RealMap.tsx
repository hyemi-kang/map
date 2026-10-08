"use client";

import { animate } from "motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { projection } from "@/lib/geo";
import type { View } from "./PaperMap";

/*
 * 紙の地図とまったく同じカメラ(中心・倍率)で重ねる「実際の地図」。
 * 紙の地図は d3 の geoMercator(= ウェブメルカトル)で描いているので、
 * 世界座標 → 緯度経度 → タイル座標の変換だけで、同じ縮尺・同じ位置にぴたりと重なる。
 * そのため紙の地図 → 実際の地図はクロスフェードするだけで自然に切り替わり、
 * ピンと毛糸(画面上の DOM)はそのまま同じ位置に残る。
 */

const TILE = 256;
const SCALE = projection.scale(); // 世界座標の単位 / ラジアン
const SPRING = { type: "spring", stiffness: 55, damping: 15, mass: 1 } as const;

/** 画面の高さ(px)と表示範囲の高さ(世界座標)から、ウェブメルカトルのズームを求める */
export function zoomFor(viewH: number, screenH: number) {
  return Math.log2(((screenH / viewH) * 2 * Math.PI * SCALE) / TILE);
}

function toTilePx(lng: number, lat: number, z: number) {
  const n = TILE * 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n };
}

type Props = {
  view: View;
  width: number;
  height: number;
  /** false の間はタイルを読み込まない */
  active: boolean;
  /** 紙の地図とのクロスフェード(0〜1) */
  visible: boolean;
  /** true の間は視点を即座に反映する(ドラッグ・ピンチ中) */
  instant?: boolean;
};

export default function RealMap({ view, width, height, active, visible, instant = false }: Props) {
  const [cam, setCam] = useState<View>(view);
  const camRef = useRef(view);
  camRef.current = cam;
  const ctlRef = useRef<{ stop: () => void } | null>(null);

  // 紙の地図と同じ spring で、同じ割合だけ動かす
  useEffect(() => {
    ctlRef.current?.stop();
    if (instant) {
      setCam(view);
      return;
    }
    const from = camRef.current;
    if (from.cx === view.cx && from.cy === view.cy && from.h === view.h) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lh0 = Math.log(from.h);
    const lh1 = Math.log(view.h);
    const ctl = animate(0, 1, {
      ...(reduce ? { duration: 0 } : SPRING),
      onUpdate: (t) => setCam({ cx: from.cx + (view.cx - from.cx) * t, cy: from.cy + (view.cy - from.cy) * t, h: Math.exp(lh0 + (lh1 - lh0) * t) }),
      onComplete: () => setCam(view),
    });
    ctlRef.current = ctl;
    return () => ctl.stop();
  }, [view, instant]);

  const tiles = useMemo(() => {
    if (!active) return [];
    const z = zoomFor(cam.h, height);
    const zi = Math.min(19, Math.max(2, Math.round(z)));
    const f = 2 ** (z - zi); // タイルの 1px が画面の何 px になるか
    const ll = projection.invert?.([cam.cx, cam.cy]);
    if (!ll) return [];
    const c = toTilePx(ll[0], ll[1], zi);
    const n = 2 ** zi;
    const x0 = Math.floor((c.x - width / 2 / f) / TILE);
    const x1 = Math.floor((c.x + width / 2 / f) / TILE);
    const y0 = Math.max(0, Math.floor((c.y - height / 2 / f) / TILE));
    const y1 = Math.min(n - 1, Math.floor((c.y + height / 2 / f) / TILE));
    const out: { key: string; src: string; left: number; top: number; size: number }[] = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const wrapped = ((tx % n) + n) % n;
        out.push({
          key: `${zi}/${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${zi}/${wrapped}/${ty}.png`,
          left: width / 2 + (tx * TILE - c.x) * f,
          top: height / 2 + (ty * TILE - c.y) * f,
          size: TILE * f,
        });
      }
    }
    return out;
  }, [active, cam, width, height]);

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none absolute inset-0 z-[9] overflow-hidden bg-[#e8e3d8]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 1.1s ease", filter: "saturate(0.88) sepia(0.1)" }}
    >
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.src}
          alt=""
          draggable={false}
          decoding="async"
          style={{ position: "absolute", left: t.left, top: t.top, width: t.size + 0.6, height: t.size + 0.6, maxWidth: "none" }}
        />
      ))}
      {/* 紙の地図と同じ、周辺の落ち込み */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(40,25,10,0.28) 100%)" }} />
      {visible && (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto absolute bottom-1 left-2 rounded bg-white/75 px-2 text-[12px] leading-[18px] text-[#333]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          © OpenStreetMap contributors
        </a>
      )}
    </div>
  );
}
