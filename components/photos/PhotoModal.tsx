"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { CATEGORY_KO } from "@/data/regions";
import type { Spot } from "@/data/types";
import { photoOf } from "@/lib/photos";
import { spotUrl } from "@/lib/gmaps";
import { fmtTime } from "@/lib/planner";
import Polaroid from "./Polaroid";

type Props = {
  spots: Spot[];
  index: number | null;
  onIndex: (i: number | null) => void;
  selectedIds: string[];
  onToggle: (spotId: string) => void;
  /** 日程への追加ボタンを出すか(机の上のポラロイドでは出さない) */
  actions?: boolean;
};

const variants = {
  enter: (dir: number) => ({ x: dir * 220, rotate: dir * 14, opacity: 0, scale: 0.9 }),
  center: { x: 0, rotate: -2, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir * -220, rotate: dir * -14, opacity: 0, scale: 0.9 }),
};

/** 透明なガラス調のモーダル。ポラロイドを左右に送って次の写真を選べる */
export default function PhotoModal({ spots, index, onIndex, selectedIds, onToggle, actions = true }: Props) {
  const [dir, setDir] = useState(1);
  const open = index !== null;
  const go = useCallback(
    (d: number) => {
      if (index === null) return;
      setDir(d);
      onIndex((index + d + spots.length) % spots.length);
    },
    [index, onIndex, spots.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onIndex(null);
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, go, onIndex]);

  const spot = index !== null ? spots[index] : null;
  const photo = spot ? photoOf(spot.id) : null;
  const chosen = spot ? selectedIds.includes(spot.id) : false;

  return (
    <AnimatePresence>
      {open && spot && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onIndex(null)}
        >
          <div className="absolute inset-0 bg-[rgba(30,20,10,0.28)] backdrop-blur-[6px]" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={spot.ko}
            className="relative grid w-full max-w-[860px] grid-cols-1 items-center gap-4 rounded-[28px] border border-white/60 bg-white/25 p-5 shadow-[0_30px_80px_rgba(30,20,10,0.45)] backdrop-blur-xl sm:grid-cols-[minmax(0,320px)_1fr] sm:p-8"
            initial={{ y: 40, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto flex h-[300px] w-full max-w-[320px] items-center justify-center sm:h-[380px]">
              <AnimatePresence custom={dir} initial={false} mode="popLayout">
                <motion.div
                  key={spot.id}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="absolute"
                >
                  <Polaroid spot={spot} width={260} tilt={10} showJa={false} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="text-[#2c2118]">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[40px] leading-none" style={{ fontFamily: "var(--font-hand)" }}>
                  {spot.ko}
                </h2>
                <span className="text-[18px] opacity-70" style={{ fontFamily: "var(--font-ja)" }}>
                  {spot.ja}
                </span>
              </div>
              <p className="mt-1 text-[16px] opacity-70">
                {CATEGORY_KO[spot.category]} · 보통 {spot.stay}분 · {fmtTime(spot.open)}–{spot.close >= 1440 ? "24:00" : fmtTime(spot.close)}
              </p>
              <p className="mt-3 text-[21px] leading-snug">{spot.desc}</p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {actions && (
                  <button
                    type="button"
                    onClick={() => onToggle(spot.id)}
                    className="pen rounded-full border-2 border-[#3b2f24] px-4 py-1 text-[19px] transition-colors hover:bg-[#3b2f24] hover:text-white"
                  >
                    {chosen ? "일정에서 빼기" : "일정에 넣기"}
                  </button>
                )}
                <a
                  href={spotUrl(spot)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pen rounded-full border-2 border-transparent bg-white/50 px-4 py-1 text-[19px] underline decoration-dotted"
                >
                  Google 지도에서 보기 ↗
                </a>
              </div>

              <p className="mt-5 text-[13px] leading-snug opacity-65" style={{ fontFamily: "system-ui, sans-serif" }}>
                {photo ? (
                  <>
                    사진: {photo.author} / {photo.license} /{" "}
                    <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline">
                      Wikimedia Commons
                    </a>
                  </>
                ) : (
                  "사진이 없어 일러스트로 대신했어요."
                )}
              </p>
            </div>

            {spots.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="이전 사진"
                  onClick={() => go(-1)}
                  className="pen absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/60 text-[26px] shadow-md backdrop-blur hover:bg-white/90 sm:-left-5"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="다음 사진"
                  onClick={() => go(1)}
                  className="pen absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/60 text-[26px] shadow-md backdrop-blur hover:bg-white/90 sm:-right-5"
                >
                  ›
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="닫기"
              onClick={() => onIndex(null)}
              className="pen absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/60 text-[22px] hover:bg-white/90"
            >
              ×
            </button>
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[15px] opacity-60">
              {(index ?? 0) + 1} / {spots.length}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
