"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

type Props = {
  text: string;
  delay?: number;
  /** 1 文字あたりの秒数 */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  onDone?: () => void;
};

/** ペンが文字を書いていくように、左から順に現れる */
export default function Write({ text, delay = 0, speed = 0.06, className, style, onDone }: Props) {
  const reduce = useReducedMotion();
  const p = useMotionValue(reduce ? 1 : 0);
  const clip = useTransform(p, (v) => `inset(-6px ${(1 - v) * 100}% -6px 0)`);
  const penLeft = useTransform(p, (v) => `${v * 100}%`);
  const penOpacity = useTransform(p, [0, 0.01, 0.985, 1], [0, 1, 1, 0]);

  useEffect(() => {
    if (reduce) {
      p.set(1);
      onDone?.();
      return;
    }
    p.set(0);
    const c = animate(p, 1, { duration: Math.max(0.2, text.length * speed), delay, ease: "linear", onComplete: onDone });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, speed, reduce]);

  return (
    <span className={`relative inline-block ${className ?? ""}`} style={style}>
      <motion.span className="inline-block whitespace-pre-wrap" style={{ clipPath: clip }}>
        {text}
      </motion.span>
      <motion.svg
        aria-hidden
        className="pointer-events-none absolute bottom-[-4px] z-10"
        width="26"
        height="26"
        viewBox="0 0 32 32"
        style={{ left: penLeft, opacity: penOpacity, x: -3, y: 2 }}
      >
        <path d="M3 29 L5 21 L22 4 L28 10 L11 27 Z" fill="#d9534f" stroke="#2b2118" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 29 L5 21 L11 27 Z" fill="#f5e2c4" stroke="#2b2118" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3 29 L4.3 25.6 L6.4 27.7 Z" fill="#2b2118" />
      </motion.svg>
    </span>
  );
}

/** 複数行を順に書くときの開始時刻を計算する */
export function chain(texts: string[], speed = 0.06, start = 0, gap = 0.12) {
  let t = start;
  return texts.map((s) => {
    const d = t;
    t += Math.max(0.2, s.length * speed) + gap;
    return d;
  });
}
