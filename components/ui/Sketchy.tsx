"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* 手描き風の少し歪んだ枠(角ばらず、線もまっすぐでない) */
const WOBBLE = "255px 18px 225px 18px / 18px 225px 18px 255px";
const WOBBLE_B = "18px 235px 20px 245px / 245px 20px 235px 18px";

type Option = { id: string; ja: string; ko: string };

type PickerProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
};

/** 駅などを選ぶ、紙のカードが開くタイプの選択ボックス */
export function StationPicker({ label, value, options, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const listId = useId();
  const current = options.find((o) => o.id === value) ?? options[0];

  /* ノートの overflow に切られないよう、一覧は body 直下に出して画面基準で位置決めする */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 200 && above > below;
      const maxH = Math.max(120, Math.min(320, up ? above : below));
      const width = Math.max(r.width, 220);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos(up ? { left, width, bottom: window.innerHeight - r.top + 4, maxH } : { left, width, top: r.bottom + 4, maxH });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={box} className="relative min-w-0">
      <span className="block text-[15px] leading-[18px] opacity-60">{label}</span>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="pen group flex w-full items-center gap-2 border-2 border-[#3b2f24] bg-[rgba(255,250,225,0.85)] px-3 text-left transition-colors hover:bg-[rgba(255,230,120,0.6)]"
        style={{ borderRadius: WOBBLE, minHeight: 40 }}
      >
        <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#2f6fb0] text-[13px] leading-none text-white" style={{ fontFamily: "var(--font-ja)" }}>
          駅
        </span>
        <span className="min-w-0 flex-1 text-[20px] leading-[26px] py-1" style={{ fontFamily: "var(--font-hand)" }}>
          {current.ko}
        </span>
        <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} className="text-[14px] opacity-60">
          ▼
        </motion.span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
      <AnimatePresence>
        {open && pos && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            className="fixed z-[1000] overflow-y-auto border-2 border-[#3b2f24] bg-[#fffdf2] p-1"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, borderRadius: WOBBLE_B, transformOrigin: pos.top === undefined ? "bottom left" : "top left", boxShadow: "0 10px 22px rgba(40,25,10,0.35), 0 2px 3px rgba(40,25,10,0.3)", lineHeight: "26px" }}
            initial={{ opacity: 0, scale: 0.92, y: -6, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            {options.map((o) => {
              const on = o.id === value;
              return (
                <li key={o.id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                    className={`pen flex w-full items-baseline gap-2 rounded-[10px] px-2 py-[3px] text-left transition-colors ${on ? "bg-[rgba(255,224,110,0.8)]" : "hover:bg-[rgba(255,230,120,0.45)]"}`}
                  >
                    <span className="w-[16px] shrink-0 text-[#c8402f]">{on ? "✓" : ""}</span>
                    <span className="min-w-0 break-keep text-[19px]" style={{ fontFamily: "var(--font-hand)" }}>
                      {o.ko}
                    </span>
                    <span className="ml-auto shrink-0 text-[13px] opacity-55" style={{ fontFamily: "var(--font-ja)" }}>
                      {o.ja}
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

type TimeProps = { label: string; value: string; onChange: (v: string) => void; step?: number };

const toMin = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
};
const toStr = (m: number) => {
  const c = Math.min(23 * 60 + 30, Math.max(0, m));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};

/** 30 分刻みで ‹ › を押して時刻を変える(ネイティブの時刻入力の代わり) */
export function TimeChip({ label, value, onChange, step = 30 }: TimeProps) {
  const m = toMin(value || "09:30");
  const btn = "pen grid size-[30px] place-items-center rounded-full text-[22px] leading-none transition-colors hover:bg-[rgba(255,224,110,0.8)] disabled:opacity-30";
  return (
    <div className="min-w-0">
      <span className="block text-[15px] leading-[18px] opacity-60">{label}</span>
      <div
        className="flex items-center justify-between border-2 border-[#3b2f24] bg-[rgba(255,250,225,0.85)] px-1"
        style={{ borderRadius: WOBBLE_B, minHeight: 40 }}
        role="group"
        aria-label={label}
      >
        <button type="button" aria-label={`${label} ${step}분 앞으로`} className={btn} disabled={m <= 0} onClick={() => onChange(toStr(m - step))}>
          ‹
        </button>
        <motion.span key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[24px] tabular-nums leading-[34px]" style={{ fontFamily: "var(--font-hand)" }}>
          {toStr(m)}
        </motion.span>
        <button type="button" aria-label={`${label} ${step}분 뒤로`} className={btn} disabled={m >= 23 * 60 + 30} onClick={() => onChange(toStr(m + step))}>
          ›
        </button>
      </div>
    </div>
  );
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** 日付を 1 日ずつ前後に動かす(ネイティブの日付入力の代わり) */
export function DateChip({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const base = value ? new Date(value + "T00:00:00") : new Date();
  const shift = (d: number) => {
    const n = new Date(base);
    n.setDate(n.getDate() + d);
    const p = (v: number) => String(v).padStart(2, "0");
    onChange(`${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`);
  };
  const btn = "pen grid size-[30px] place-items-center rounded-full text-[22px] leading-none transition-colors hover:bg-[rgba(255,224,110,0.8)]";
  return (
    <div className="min-w-0">
      <span className="block text-[15px] leading-[18px] opacity-60">{label}</span>
      <div
        className="flex items-center justify-between border-2 border-[#3b2f24] bg-[rgba(255,250,225,0.85)] px-1"
        style={{ borderRadius: WOBBLE, minHeight: 40 }}
        role="group"
        aria-label={label}
      >
        <button type="button" aria-label="하루 전" className={btn} onClick={() => shift(-1)}>
          ‹
        </button>
        <motion.span key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[22px] tabular-nums leading-[34px]" style={{ fontFamily: "var(--font-hand)" }}>
          {base.getMonth() + 1}/{base.getDate()} ({DOW[base.getDay()]})
        </motion.span>
        <button type="button" aria-label="하루 뒤" className={btn} onClick={() => shift(1)}>
          ›
        </button>
      </div>
    </div>
  );
}

/** ON / OFF を切り替える手描き風のチップ */
export function ToggleChip({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`pen flex items-center gap-2 border-2 border-[#3b2f24] px-3 text-left transition-colors ${on ? "bg-[rgba(255,224,110,0.85)]" : "bg-[rgba(255,250,225,0.6)] opacity-80 hover:opacity-100"}`}
      style={{ borderRadius: WOBBLE, minHeight: 40 }}
    >
      <span className="grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-[#3b2f24] bg-white/80 text-[15px] leading-none text-[#c8402f]">{on ? "✓" : ""}</span>
      <span className="text-[20px] leading-[34px]" style={{ fontFamily: "var(--font-hand)" }}>
        {children}
      </span>
    </button>
  );
}

/** ‹ 値 › で増減するチップ(分など) */
export function StepChip({
  label,
  text,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  text: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  const btn = "pen grid size-[30px] place-items-center rounded-full text-[22px] leading-none transition-colors hover:bg-[rgba(255,224,110,0.8)] disabled:opacity-30";
  return (
    <div className="min-w-0">
      <span className="block text-[15px] leading-[18px] opacity-60">{label}</span>
      <div className="flex items-center justify-between border-2 border-[#3b2f24] bg-[rgba(255,250,225,0.85)] px-1" style={{ borderRadius: WOBBLE_B, minHeight: 40 }} role="group" aria-label={label}>
        <button type="button" aria-label={`${label} 줄이기`} className={btn} disabled={decDisabled} onClick={onDec}>
          ‹
        </button>
        <span className="text-[22px] tabular-nums leading-[34px]" style={{ fontFamily: "var(--font-hand)" }}>
          {text}
        </span>
        <button type="button" aria-label={`${label} 늘리기`} className={btn} disabled={incDisabled} onClick={onInc}>
          ›
        </button>
      </div>
    </div>
  );
}
