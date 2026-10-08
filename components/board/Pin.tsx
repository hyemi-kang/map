"use client";

import { motion } from "motion/react";
import { useId } from "react";

type Props = {
  /** 針の先端が置かれる画面座標 */
  x: number;
  y: number;
  color?: string;
  label?: string;
  size?: number;
  delay?: number;
  ghost?: boolean;
  title?: string;
  onClick?: () => void;
  zIndex?: number;
  /** ピンの上に付ける名前札(フォーカスしたとき) */
  callout?: string;
};

const W = 28;
const H = 46;

/** プラスチックの頭と金属の針。針の先端が (x, y) に刺さる */
export default function Pin({ x, y, color = "#d9534f", label, size = 1, delay = 0, ghost, title, onClick, zIndex = 1, callout }: Props) {
  const id = useId().replace(/:/g, "");
  const w = W * size;
  const h = H * size;
  const common = {
    className: onClick ? "pen pointer-events-auto absolute" : "pointer-events-none absolute",
    style: { left: x - w / 2, top: y - h, width: w, height: h, zIndex, transformOrigin: "50% 100%" },
    initial: { y: -46, scale: 1.7, opacity: 0 },
    animate: { y: 0, scale: 1, opacity: ghost ? 0.55 : 1 },
    exit: { y: -20, scale: 1.2, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 380, damping: 17, delay },
  };
  const tag = callout ? (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#fffdf6] px-2 text-[20px] leading-[28px] text-[#3b2f24] shadow-[0_3px_8px_rgba(30,15,0,0.4)]"
      style={{ fontFamily: "var(--font-hand)", transform: "translateX(-50%) rotate(-2deg)" }}
    >
      {callout}
    </span>
  ) : null;
  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <radialGradient id={`h-${id}`} cx="35%" cy="28%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.25" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.78" />
        </radialGradient>
        <linearGradient id={`n-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d949b" />
          <stop offset="0.45" stopColor="#f4f6f8" />
          <stop offset="1" stopColor="#7a8188" />
        </linearGradient>
      </defs>
      {/* 紙に落ちる影 */}
      <ellipse cx="19" cy={H - 1} rx="9" ry="2.3" fill="rgba(30,15,5,0.32)" />
      {/* 針 */}
      <polygon points={`12.4,26 15.6,26 14,${H}`} fill={`url(#n-${id})`} stroke="#6a7178" strokeWidth="0.4" />
      {/* 金属の台座 */}
      <rect x="6" y="22.5" width="16" height="4" rx="1.6" fill={`url(#n-${id})`} stroke="#6a7178" strokeWidth="0.5" />
      {/* プラスチックの首と頭 */}
      <path d="M9.5 17.5 H18.5 L20.6 22.8 H7.4 Z" fill={color} opacity="0.85" />
      <circle cx="14" cy="10" r="9.6" fill={`url(#h-${id})`} stroke="rgba(0,0,0,0.22)" strokeWidth="0.6" />
      <ellipse cx="10.6" cy="5.8" rx="3.3" ry="2" fill="#fff" opacity="0.7" transform="rotate(-28 10.6 5.8)" />
      {label && (
        <text x="14" y="14.6" textAnchor="middle" fontSize="12.5" fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" paintOrder="stroke" fontFamily="Gaegu, cursive" fontWeight="700">
          {label}
        </text>
      )}
    </svg>
  );
  if (onClick) {
    return (
      <motion.button type="button" onClick={onClick} title={title} aria-label={title} whileHover={{ y: -4, opacity: 1 }} {...common}>
        {tag}
        {svg}
      </motion.button>
    );
  }
  return (
    <motion.div {...common}>
      {tag}
      {svg}
    </motion.div>
  );
}
