"use client";

import { AnimatePresence, motion } from "motion/react";
import { CATEGORY_KO } from "@/data/regions";
import type { Area, Spot } from "@/data/types";
import { legUrl, routeUrl } from "@/lib/gmaps";
import { photoOf } from "@/lib/photos";
import { fmtTime, type Plan, type Suggestion } from "@/lib/planner";
import PlaceholderArt from "@/components/ui/PlaceholderArt";
import Write from "./Write";

export type Settings = { start: string; end: string; startStation: string; endStation: string };
export type Tab = "spots" | "plan";

type Props = {
  area: Area;
  settings: Settings;
  onSettings: (s: Settings) => void;
  selectedIds: string[];
  onToggle: (spotId: string) => void;
  plan: Plan;
  tab: Tab;
  onTab: (t: Tab) => void;
  suggestion: Suggestion | null;
  onAccept: () => void;
  onReject: () => void;
  removal: Spot | null;
  onRemove: (spotId: string) => void;
  onPhoto: (index: number) => void;
};

const fieldCls =
  "pen rounded-md border-b-2 border-dashed border-[#3b2f24]/50 bg-transparent px-1 text-[21px] leading-[30px] outline-none focus:bg-[rgba(255,230,120,0.45)]";

function Thumb({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  const photo = photoOf(spot.id);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${spot.ko} 사진`}
      className="pen relative block size-[46px] shrink-0 -rotate-3 overflow-hidden bg-[#fdfbf5] p-[3px] shadow-[0_2px_5px_rgba(30,20,10,0.45)] transition-transform hover:rotate-2 hover:scale-110"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt="" className="size-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <PlaceholderArt category={spot.category} label={spot.ja} />
      )}
    </button>
  );
}

const flip = {
  initial: { rotateY: -80, opacity: 0 },
  animate: { rotateY: 0, opacity: 1 },
  exit: { rotateY: 80, opacity: 0 },
  transition: { duration: 0.38, ease: [0.3, 0.7, 0.3, 1] as [number, number, number, number] },
};

export default function AreaPage(p: Props) {
  const { area, settings: s } = p;
  const nSelected = p.selectedIds.length;
  const stops = p.plan.items.map((i) => i.place);
  const totalMin = p.plan.arrival - p.plan.items[0].depart;

  return (
    <div>
      <h2 className="text-[42px] leading-[60px]" style={{ fontFamily: "var(--font-hand)" }}>
        <Write text={area.ko} speed={0.08} delay={0.2} />
        <span className="ml-3 text-[22px] opacity-60" style={{ fontFamily: "var(--font-ja)" }}>
          {area.ja}
        </span>
      </h2>

      <div role="tablist" className="mb-1 flex gap-1 text-[23px]" style={{ fontFamily: "var(--font-hand)" }}>
        {(
          [
            ["spots", `스팟 고르기 (${nSelected})`],
            ["plan", "일정표"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={p.tab === id}
            onClick={() => p.onTab(id)}
            className={`pen rounded-t-lg border-2 border-b-0 border-[#3b2f24]/60 px-3 leading-[32px] transition-colors ${p.tab === id ? "bg-[rgba(255,224,110,0.75)]" : "bg-white/50 hover:bg-white/80"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait" initial={false}>
          {p.tab === "spots" ? (
            <motion.div key="spots" style={{ transformOrigin: "left center" }} {...flip}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-[19px]">
                <label className="flex items-center gap-1">
                  출발
                  <select className={`${fieldCls} min-w-0 flex-1`} value={s.startStation} onChange={(e) => p.onSettings({ ...s, startStation: e.target.value })}>
                    {area.stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.ja}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  도착
                  <select className={`${fieldCls} min-w-0 flex-1`} value={s.endStation} onChange={(e) => p.onSettings({ ...s, endStation: e.target.value })}>
                    {area.stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.ja}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  시작
                  <input type="time" className={fieldCls} value={s.start} onChange={(e) => p.onSettings({ ...s, start: e.target.value })} />
                </label>
                <label className="flex items-center gap-1">
                  종료
                  <input type="time" className={fieldCls} value={s.end} onChange={(e) => p.onSettings({ ...s, end: e.target.value })} />
                </label>
              </div>

              <ul className="mt-2">
                {area.spots.map((sp, i) => {
                  const on = p.selectedIds.includes(sp.id);
                  return (
                    <li key={sp.id} className="flex items-center gap-2" style={{ minHeight: 68 }}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${sp.ko} ${on ? "빼기" : "넣기"}`}
                        onClick={() => p.onToggle(sp.id)}
                        className="pen grid size-[26px] shrink-0 place-items-center rounded-[5px] border-2 border-[#3b2f24] bg-white/70 text-[26px] leading-none text-[#c8402f]"
                      >
                        {on ? "✓" : ""}
                      </button>
                      <Thumb spot={sp} onClick={() => p.onPhoto(i)} />
                      <button type="button" onClick={() => p.onToggle(sp.id)} className="pen min-w-0 flex-1 text-left leading-[24px]">
                        <span className="block truncate text-[23px]" style={{ fontFamily: "var(--font-hand)" }}>
                          {sp.priority === 1 && <span className="mr-1 text-[#e0a100]">★</span>}
                          {sp.ko}
                        </span>
                        <span className="block truncate text-[15px] opacity-65">
                          <span style={{ fontFamily: "var(--font-ja)" }}>{sp.ja}</span> · {CATEGORY_KO[sp.category]} · {sp.stay}분
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => p.onTab("plan")}
                disabled={nSelected === 0}
                className="pen mt-3 rounded-full border-2 border-[#3b2f24] bg-[rgba(255,224,110,0.8)] px-5 text-[26px] leading-[44px] transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-40"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                일정 짜기 →
              </button>
              <p className="text-[16px] opacity-60">★는 처음 가는 사람에게 추천하는 곳이에요. 가고 싶은 곳에 체크해 보세요.</p>
            </motion.div>
          ) : (
            <motion.div key="plan" style={{ transformOrigin: "left center" }} {...flip}>
              <p className="text-[19px]">
                <b>{fmtTime(p.plan.items[0].depart)}</b> {p.plan.items[0].place.ko} 출발 →{" "}
                <b className={p.plan.overBy ? "text-[#c8402f]" : ""}>{fmtTime(p.plan.arrival)}</b> {p.plan.items.at(-1)!.place.ko} 도착
                <br />
                <span className="text-[16px] opacity-70">
                  총 {Math.floor(totalMin / 60)}시간 {totalMin % 60}분 ·{" "}
                  {p.plan.overBy > 0 ? `예정보다 ${p.plan.overBy}분 늦어요` : `여유 ${p.plan.slack}분`}
                </span>
              </p>

              <ol className="mt-1">
                {p.plan.items.map((it, i) => {
                  const leg = p.plan.legs[i];
                  const next = p.plan.items[i + 1];
                  return (
                    <li key={`${it.place.id}-${i}`}>
                      <div className="flex items-start gap-2">
                        <span className="w-[54px] shrink-0 text-right text-[19px] tabular-nums">{fmtTime(it.arrive)}</span>
                        <span
                          className="mt-[5px] grid size-[24px] shrink-0 place-items-center rounded-full text-[16px] leading-none text-white"
                          style={{ background: it.kind === "spot" ? "#d9534f" : "#3b6ea8" }}
                        >
                          {it.kind === "spot" ? i : "駅"}
                        </span>
                        <div className="min-w-0 flex-1 leading-[26px]">
                          <span className="block text-[23px]" style={{ fontFamily: "var(--font-hand)" }}>
                            {it.place.ko}
                          </span>
                          {it.kind === "spot" && (
                            <span className="block text-[15px] opacity-65">
                              {it.wait > 0 ? `${it.wait}분 기다린 뒤 ` : ""}
                              {it.stay}분 머물기 · {fmtTime(it.depart)} 출발
                              {it.issue && <span className="ml-1 text-[#c8402f]">⚠ 영업시간 확인</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      {leg && next && (
                        <div className="ml-[62px] flex items-center gap-2 border-l-2 border-dashed border-[#c8402f]/60 pl-3 text-[16px] leading-[34px] opacity-80">
                          <span>{leg.mode === "walk" ? "🚶 걸어서" : "🚃 전철·버스"} 약 {leg.minutes}분</span>
                          <a
                            href={legUrl(it.place, next.place, leg.mode === "walk" ? "walking" : "transit")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pen underline decoration-dotted"
                          >
                            Google 지도 ↗
                          </a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {p.removal && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-lg bg-[rgba(255,200,190,0.55)] px-3 py-1 text-[18px] leading-[26px]">
                  시간이 빠듯해요. <b>{p.removal.ko}</b>을(를) 뺄까요?
                  <div className="mt-1 flex gap-2">
                    <button type="button" className="pen rounded-full border-2 border-[#3b2f24] bg-white/70 px-3 leading-[28px]" onClick={() => p.onRemove(p.removal!.id)}>
                      응, 뺄게
                    </button>
                  </div>
                </motion.div>
              )}

              {p.suggestion && (
                <motion.div
                  key={p.suggestion.spot.id}
                  initial={{ opacity: 0, y: 8, rotate: -1 }}
                  animate={{ opacity: 1, y: 0, rotate: -0.6 }}
                  className="mt-3 flex items-start gap-3 rounded-lg bg-[rgba(255,238,150,0.7)] p-2 shadow-[0_3px_8px_rgba(60,40,10,0.25)]"
                >
                  <Thumb spot={p.suggestion.spot} onClick={() => p.onPhoto(area.spots.findIndex((x) => x.id === p.suggestion!.spot.id))} />
                  <div className="min-w-0 flex-1 leading-[26px]">
                    <Write text="여기는 어때요? 추가할까요?" speed={0.05} className="text-[21px]" style={{ fontFamily: "var(--font-hand)" }} />
                    <span className="block text-[20px]" style={{ fontFamily: "var(--font-hand)" }}>
                      {p.suggestion.spot.ko}
                    </span>
                    <span className="block text-[15px] opacity-70">
                      +{p.suggestion.addedMin}분이면 돌 수 있어요 · {p.suggestion.spot.desc}
                    </span>
                    <div className="mt-1 flex gap-2">
                      <button type="button" onClick={p.onAccept} className="pen rounded-full border-2 border-[#3b2f24] bg-white/80 px-4 text-[20px] leading-[30px] hover:bg-[#3b2f24] hover:text-white">
                        응
                      </button>
                      <button type="button" onClick={p.onReject} className="pen rounded-full border-2 border-[#3b2f24]/60 bg-white/50 px-4 text-[20px] leading-[30px] hover:bg-white/90">
                        아니
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {p.plan.issues.length > 0 && (
                <ul className="mt-2 text-[16px] leading-[22px] text-[#a33a2c]">
                  {p.plan.issues.map((t) => (
                    <li key={t}>⚠ {t}</li>
                  ))}
                </ul>
              )}

              <a
                href={routeUrl(stops)}
                target="_blank"
                rel="noopener noreferrer"
                className="pen mt-3 inline-block rounded-full border-2 border-[#3b2f24] bg-white/80 px-4 text-[22px] leading-[40px] hover:bg-[#3b2f24] hover:text-white"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                Google 지도에서 전체 경로 열기 ↗
              </a>
              <p className="text-[14px] leading-[20px] opacity-60">
                이동 시간은 거리로 계산한 대략적인 값이에요. 실제 환승 시간은 구간별 Google 지도 링크에서 확인하세요.
                전체 경로는 도보 기준이며, 경유지는 최대 9곳(모바일 3곳)까지 반영돼요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
