"use client";

import { motion } from "motion/react";
import { useId } from "react";

export type Pt = { x: number; y: number };

type Props = {
  points: Pt[];
  width: number;
  height: number;
  /** 描き直しのきっかけ(順序が変わったら変える) */
  signature: string;
  color?: string;
};

/** 2 点間の毛糸。ぴんと張らず、少したるませる */
function segment(a: Pt, b: Pt, i: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const sag = Math.min(34, len * 0.14) * (i % 2 === 0 ? 1 : -0.6);
  const cx = mx + (-dy / len) * sag * 0.6;
  const cy = my + Math.abs(sag) * 0.8 + (dx / len) * sag * 0.3;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/** ピンに巻きつけた毛糸。始点から順に張られていく */
export default function Yarn({ points, width, height, signature, color = "#c8402f" }: Props) {
  const id = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  const segs = points.slice(0, -1).map((p, i) => ({
    d: segment(p, points[i + 1], i),
    len: Math.hypot(points[i + 1].x - p.x, points[i + 1].y - p.y),
  }));
  return (
    <svg className="pointer-events-none absolute inset-0 z-[2]" width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <filter id={`fuzz-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
        <filter id={`sh-${id}`} x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      {segs.map((s, i) => {
        const delay = segs.slice(0, i).reduce((t, x) => t + 0.2 + x.len / 900, 0.15);
        const dur = 0.2 + s.len / 900;
        const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay, duration: dur, ease: "easeOut" as const } };
        const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: delay + dur * 0.6, duration: 0.3 } };
        return (
          <g key={`${signature}-${i}`}>
            <motion.path d={s.d} fill="none" stroke="rgba(25,10,0,0.45)" strokeWidth={5} strokeLinecap="round" transform="translate(2.5 4)" filter={`url(#sh-${id})`} {...draw} />
            <g filter={`url(#fuzz-${id})`}>
              <motion.path d={s.d} fill="none" stroke={color} strokeWidth={4.4} strokeLinecap="round" {...draw} />
              {/* 撚りのしま */}
              <motion.path d={s.d} fill="none" stroke="rgba(255,225,215,0.55)" strokeWidth={4.4} strokeDasharray="1.6 4.2" {...fade} />
              <motion.path d={s.d} fill="none" stroke="rgba(110,20,10,0.35)" strokeWidth={4.4} strokeDasharray="1.2 4.6" strokeDashoffset={2.8} {...fade} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
