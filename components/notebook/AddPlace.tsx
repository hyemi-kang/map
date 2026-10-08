"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { StepChip } from "@/components/ui/Sketchy";
import { openMapAt, parseMapsInput, PARSE_ERROR_KO } from "@/lib/gmaps";

export type NewPlace = { name: string; lat: number; lng: number; stay: number };

type Props = {
  /** 地図を開くときの中心(エリアの中心) */
  centerLat: number;
  centerLng: number;
  onAdd: (p: NewPlace) => void;
};

const WOBBLE = "255px 18px 225px 18px / 18px 225px 18px 255px";
const input = "w-full border-2 border-[#3b2f24] bg-[rgba(255,250,225,0.85)] px-3 text-[19px] leading-[36px] outline-none placeholder:opacity-45 focus:bg-[rgba(255,238,160,0.7)]";

/**
 * Google マップで探した場所を、リンクまたは座標の貼り付けで取り込む(API キー不要)。
 * 地図アプリの検索や右クリック「座標をコピー」など、ユーザーがふだん使う操作をそのまま使ってもらう。
 */
export default function AddPlace({ centerLat, centerLng, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [stay, setStay] = useState(45);
  const [touched, setTouched] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseMapsInput(text) : null), [text]);
  const error = touched && parsed && !parsed.ok ? PARSE_ERROR_KO[parsed.reason] : touched && !parsed ? PARSE_ERROR_KO.empty : "";
  const shownName = name || (parsed?.ok ? (parsed.name ?? "") : "");

  const submit = () => {
    setTouched(true);
    if (!parsed || !parsed.ok) return;
    const finalName = (name || parsed.name || "").trim();
    if (!finalName) return;
    onAdd({ name: finalName, lat: parsed.lat, lng: parsed.lng, stay });
    setText("");
    setName("");
    setStay(45);
    setTouched(false);
    setOpen(false);
  };

  return (
    <section className="mt-3 rounded-xl border-2 border-dashed border-[#3b2f24]/50 bg-[rgba(255,255,255,0.4)] p-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="pen flex w-full items-center justify-between text-left" style={{ fontFamily: "var(--font-hand)" }}>
        <span className="text-[24px] leading-[34px]">＋ 가고 싶은 곳 직접 추가</span>
        <span className="text-[14px] opacity-60">{open ? "닫기" : "Google 지도에서 고르기"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ol className="mt-1 list-decimal pl-6 text-[16px] leading-[24px] opacity-85">
              <li>
                <a href={openMapAt(centerLat, centerLng)} target="_blank" rel="noopener noreferrer" className="pen underline decoration-dotted">
                  Google 지도 열기 ↗
                </a>
                에서 가고 싶은 곳을 검색해요.
              </li>
              <li>주소창의 <b>링크</b>를 복사하거나, 지도에서 마우스 오른쪽 버튼을 눌러 나오는 <b>좌표</b>를 복사해요.</li>
              <li>아래에 붙여넣으면 위치를 읽어 와요.</li>
            </ol>

            <label className="mt-2 block">
              <span className="block text-[15px] leading-[18px] opacity-60">링크 또는 좌표</span>
              <input
                className={input}
                style={{ borderRadius: WOBBLE }}
                value={text}
                placeholder="예) 35.3258, 139.5566 또는 https://www.google.com/maps/place/…"
                onChange={(e) => setText(e.target.value)}
                onBlur={() => text && setTouched(true)}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {parsed?.ok && (
              <p className="text-[15px] leading-[22px] text-[#2f6a3a]">
                ✓ 위치를 읽었어요 ({parsed.lat.toFixed(4)}, {parsed.lng.toFixed(4)})
              </p>
            )}
            <label className="mt-1 block">
              <span className="block text-[15px] leading-[18px] opacity-60">장소 이름</span>
              <input className={input} style={{ borderRadius: WOBBLE }} value={shownName} placeholder="예) 가마쿠라 카페" onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </label>
            <div className="mt-1 max-w-[190px]">
              <StepChip label="머무는 시간" text={`${stay}분`} onDec={() => setStay((s) => Math.max(15, s - 15))} onInc={() => setStay((s) => Math.min(240, s + 15))} decDisabled={stay <= 15} incDisabled={stay >= 240} />
            </div>
            {error && (
              <p role="alert" className="text-[15px] leading-[21px] text-[#a33a2c]">
                {error}
              </p>
            )}
            {touched && parsed?.ok && !shownName.trim() && (
              <p role="alert" className="text-[15px] leading-[21px] text-[#a33a2c]">
                장소 이름을 적어 주세요.
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              className="pen mt-2 rounded-full border-2 border-[#3b2f24] bg-[rgba(255,224,110,0.85)] px-5 text-[22px] leading-[40px] transition-transform hover:-rotate-1 hover:scale-105"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              일정에 추가
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
