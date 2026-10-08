"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";
import type { Spot } from "@/data/types";
import { photoOf } from "@/lib/photos";
import PlaceholderArt from "@/components/ui/PlaceholderArt";

type Props = {
  spot: Spot;
  /** 置いてあるときの傾き(度) */
  rotate?: number;
  width?: number;
  onClick?: () => void;
  /** ホバーでカードがポインターに追従して傾く量(度)。0 で無効 */
  tilt?: number;
  className?: string;
  selected?: boolean;
  /** 日本語名も添える */
  showJa?: boolean;
};

const SPRING = { stiffness: 220, damping: 20, mass: 0.6 };

/** ポインターの位置でカードが傾く(motion の useSpring)ポラロイド */
export default function Polaroid({ spot, rotate = 0, width = 140, onClick, tilt = 14, className, selected, showJa = true }: Props) {
  const photo = photoOf(spot.id);
  const px = useMotionValue(0); // -0.5 .. 0.5
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [tilt, -tilt]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-tilt, tilt]), SPRING);
  const glareX = useTransform(px, [-0.5, 0.5], ["20%", "80%"]);
  const glareY = useTransform(py, [-0.5, 0.5], ["15%", "85%"]);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`);

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerMove={move}
      onPointerLeave={leave}
      aria-label={`${spot.ko} 사진 보기`}
      className={`pen relative block shrink-0 text-left ${className ?? ""}`}
      style={{ width, rotate, rotateX, rotateY, transformPerspective: 700, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.08, zIndex: 20 }}
      whileTap={{ scale: 0.97 }}
      initial={false}
    >
      <span
        className="block bg-[#fdfbf5] p-[6%] pb-[5%]"
        style={{
          boxShadow: selected
            ? "0 0 0 3px #d9534f, 0 10px 18px rgba(40,25,10,0.38)"
            : "0 1px 1px rgba(40,25,10,0.25), 0 8px 16px rgba(40,25,10,0.32)",
        }}
      >
        <span className="relative block aspect-square w-full overflow-hidden bg-[#e8e1d0]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={spot.ko} className="size-full object-cover" draggable={false} loading="lazy" />
          ) : (
            <PlaceholderArt category={spot.category} label={spot.ja} />
          )}
          <motion.span className="pointer-events-none absolute inset-0" style={{ background: glare, mixBlendMode: "soft-light" }} />
        </span>
        <span className="mt-[7%] block text-center leading-tight" style={{ fontFamily: "var(--font-hand)", fontSize: Math.max(15, width * 0.15) }}>
          {spot.ko}
          {showJa && (
            <span className="block opacity-60" style={{ fontFamily: "var(--font-ja)", fontSize: Math.max(10, width * 0.085) }}>
              {spot.ja}
            </span>
          )}
        </span>
      </span>
    </motion.button>
  );
}
