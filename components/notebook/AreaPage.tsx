"use client";

import { AnimatePresence, motion } from "motion/react";
import { CATEGORY_KO } from "@/data/regions";
import type { Area, Spot } from "@/data/types";
import { buildIcs, buildKml, download } from "@/lib/export";
import { legUrl, nearbyFoodUrl } from "@/lib/gmaps";
import { photoOf } from "@/lib/photos";
import { fmtTime, type OrderSuggestion, type Plan, type Suggestion } from "@/lib/planner";
import PlaceholderArt from "@/components/ui/PlaceholderArt";
import { DateChip, StationPicker, StepChip, TimeChip, ToggleChip } from "@/components/ui/Sketchy";
import AddPlace, { type NewPlace } from "./AddPlace";
import Write from "./Write";

export type Settings = {
  start: string;
  end: string;
  startStation: string;
  endStation: string;
  date: string;
  lunch: boolean;
  lunchMin: number;
};
export type Tab = "spots" | "plan";

type Props = {
  area: Area;
  /** エリアのスポット + ユーザーが追加した場所 */
  spots: Spot[];
  customIds: ReadonlySet<string>;
  settings: Settings;
  onSettings: (s: Settings) => void;
  selectedIds: string[];
  onToggle: (spotId: string) => void;
  onMove: (spotId: string, dir: -1 | 1) => void;
  plan: Plan;
  tab: Tab;
  onTab: (t: Tab) => void;
  suggestion: Suggestion | null;
  onAccept: () => void;
  onReject: () => void;
  orderSuggestion: OrderSuggestion | null;
  onApplyOrder: () => void;
  onKeepOrder: () => void;
  removal: Spot | null;
  onRemove: (spotId: string) => void;
  onPhoto: (spotId: string) => void;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  /** 寄った・動かした地図を最初の表示に戻せるか */
  canReset: boolean;
  onReset: () => void;
  onAddPlace: (p: NewPlace) => void;
  onDeleteCustom: (spotId: string) => void;
};

function Thumb({ spot, onClick }: { spot: Spot; onClick?: () => void }) {
  const photo = photoOf(spot.id);
  const inner = photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.src} alt="" className="size-full object-cover" loading="lazy" draggable={false} />
  ) : (
    <PlaceholderArt category={spot.category} label={spot.ja} />
  );
  const cls = "relative block size-[46px] shrink-0 -rotate-3 overflow-hidden bg-[#fdfbf5] p-[3px] shadow-[0_2px_5px_rgba(30,20,10,0.45)]";
  if (!onClick || !photo) return <span className={cls}>{inner}</span>;
  return (
    <button type="button" onClick={onClick} aria-label={`${spot.ko} 사진`} className={`pen ${cls} transition-transform hover:rotate-2 hover:scale-110`}>
      {inner}
    </button>
  );
}

const flip = {
  initial: { rotateY: -80, opacity: 0 },
  animate: { rotateY: 0, opacity: 1 },
  exit: { rotateY: 80, opacity: 0 },
  transition: { duration: 0.38, ease: [0.3, 0.7, 0.3, 1] as [number, number, number, number] },
};

const note = "rounded-lg px-3 py-1 text-[18px] leading-[26px] shadow-[0_3px_8px_rgba(60,40,10,0.22)]";

export default function AreaPage(p: Props) {
  const { area, settings: s } = p;
  const nSelected = p.selectedIds.length;
  const totalMin = p.plan.arrival - p.plan.items[0].depart;
  const centerLat = area.stations.reduce((a, x) => a + x.lat, 0) / area.stations.length;
  const centerLng = area.stations.reduce((a, x) => a + x.lng, 0) / area.stations.length;

  let spotNo = 0;
  const spotTotal = p.plan.items.filter((i) => i.kind === "spot").length;

  return (
    <div>
      <h2 className="text-[42px] leading-[60px]" style={{ fontFamily: "var(--font-hand)" }}>
        <Write text={area.ko} speed={0.08} delay={0.2} />
        <span className="ml-3 whitespace-nowrap text-[20px] opacity-60" style={{ fontFamily: "var(--font-ja)" }}>
          {area.ja}
        </span>
      </h2>

      <div className="mb-1 flex items-end justify-between gap-2">
        <div role="tablist" className="flex gap-1 text-[23px]" style={{ fontFamily: "var(--font-hand)" }}>
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
        <AnimatePresence>
          {p.canReset && (
            <motion.button
              key="unfocus"
              type="button"
              onClick={p.onReset}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pen mb-1 rounded-full border-2 border-[#3b2f24]/70 bg-white/70 px-3 text-[18px] leading-[28px] hover:bg-white"
            >
              🔍 전체 보기
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait" initial={false}>
          {p.tab === "spots" ? (
            <motion.div key="spots" style={{ transformOrigin: "left center" }} {...flip}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <StationPicker label="출발역" value={s.startStation} options={area.stations} onChange={(v) => p.onSettings({ ...s, startStation: v })} />
                <StationPicker label="도착역" value={s.endStation} options={area.stations} onChange={(v) => p.onSettings({ ...s, endStation: v })} />
                <TimeChip label="시작 시간" value={s.start} onChange={(v) => p.onSettings({ ...s, start: v })} />
                <TimeChip label="종료 시간" value={s.end} onChange={(v) => p.onSettings({ ...s, end: v })} />
                <ToggleChip on={s.lunch} onChange={(v) => p.onSettings({ ...s, lunch: v })}>
                  🍴 점심 먹기
                </ToggleChip>
                {s.lunch ? (
                  <StepChip
                    label="점심 시간"
                    text={`${s.lunchMin}분`}
                    onDec={() => p.onSettings({ ...s, lunchMin: Math.max(30, s.lunchMin - 15) })}
                    onInc={() => p.onSettings({ ...s, lunchMin: Math.min(120, s.lunchMin + 15) })}
                    decDisabled={s.lunchMin <= 30}
                    incDisabled={s.lunchMin >= 120}
                  />
                ) : (
                  <span />
                )}
              </div>

              <ul className="mt-2">
                {p.spots.map((sp) => {
                  const on = p.selectedIds.includes(sp.id);
                  const custom = p.customIds.has(sp.id);
                  return (
                    <li key={sp.id} className={`flex items-center gap-2 rounded-lg transition-colors ${p.focusId === sp.id ? "bg-[rgba(255,230,120,0.5)]" : ""}`} style={{ minHeight: 68 }}>
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
                      <Thumb spot={sp} onClick={custom ? undefined : () => p.onPhoto(sp.id)} />
                      <button type="button" onClick={() => p.onToggle(sp.id)} className="pen min-w-0 flex-1 text-left leading-[24px]">
                        <span className="block truncate text-[23px]" style={{ fontFamily: "var(--font-hand)" }}>
                          {sp.priority === 1 && !custom && <span className="mr-1 text-[#e0a100]">★</span>}
                          {custom && <span className="mr-1 text-[#2f6fb0]">＋</span>}
                          {sp.ko}
                        </span>
                        <span className="block truncate text-[15px] opacity-65">
                          <span style={{ fontFamily: "var(--font-ja)" }}>{custom ? "직접 추가" : sp.ja}</span> · {CATEGORY_KO[sp.category]} · {sp.stay}분
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => p.onFocus(p.focusId === sp.id ? null : sp.id)}
                        aria-label={`${sp.ko} 지도에서 보기`}
                        title="지도에서 보기"
                        className="pen grid size-[34px] shrink-0 place-items-center rounded-full text-[20px] hover:bg-[rgba(255,224,110,0.8)]"
                      >
                        📍
                      </button>
                      {custom && (
                        <button
                          type="button"
                          onClick={() => p.onDeleteCustom(sp.id)}
                          aria-label={`${sp.ko} 삭제`}
                          title="목록에서 지우기"
                          className="pen grid size-[30px] shrink-0 place-items-center rounded-full text-[22px] leading-none hover:bg-[rgba(255,170,160,0.7)]"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              <AddPlace centerLat={centerLat} centerLng={centerLng} onAdd={p.onAddPlace} />

              <button
                type="button"
                onClick={() => p.onTab("plan")}
                disabled={nSelected === 0}
                className="pen mt-3 rounded-full border-2 border-[#3b2f24] bg-[rgba(255,224,110,0.8)] px-5 text-[26px] leading-[44px] transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-40"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                일정 짜기 →
              </button>
              <p className="text-[16px] opacity-60">★는 처음 가는 사람에게 추천하는 곳이에요. 고른 순서대로 일정이 만들어져요.</p>
            </motion.div>
          ) : (
            <motion.div key="plan" style={{ transformOrigin: "left center" }} {...flip}>
              <p className="text-[19px]">
                <b>{fmtTime(p.plan.items[0].depart)}</b> {p.plan.items[0].place.ko} 출발 →{" "}
                <b className={p.plan.overBy ? "text-[#c8402f]" : ""}>{fmtTime(p.plan.arrival)}</b> {p.plan.items.at(-1)!.place.ko} 도착
                <br />
                <span className="text-[16px] opacity-70">
                  총 {Math.floor(totalMin / 60)}시간 {totalMin % 60}분 · {p.plan.overBy > 0 ? `예정보다 ${p.plan.overBy}분 늦어요` : `여유 ${p.plan.slack}분`}
                </span>
              </p>

              {p.orderSuggestion && (
                <motion.div initial={{ opacity: 0, y: 8, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} className={`${note} mt-2 bg-[rgba(190,225,255,0.7)]`}>
                  <Write text="추천 순서로 바꿔 줄까요?" speed={0.05} className="text-[22px]" style={{ fontFamily: "var(--font-hand)" }} />
                  <span className="block text-[16px] leading-[22px] opacity-80">
                    {p.orderSuggestion.savedMin > 0 ? `이동 시간이 약 ${p.orderSuggestion.savedMin}분 줄고, ` : ""}
                    돌아다니기 좋은 순서예요: {p.orderSuggestion.order.map((x, i) => `${i + 1}. ${x.ko}`).join("  ")}
                  </span>
                  <span className="mt-1 flex gap-2">
                    <button type="button" onClick={p.onApplyOrder} className="pen rounded-full border-2 border-[#3b2f24] bg-white/80 px-4 text-[20px] leading-[30px] hover:bg-[#3b2f24] hover:text-white">
                      응
                    </button>
                    <button type="button" onClick={p.onKeepOrder} className="pen rounded-full border-2 border-[#3b2f24]/60 bg-white/50 px-4 text-[20px] leading-[30px] hover:bg-white/90">
                      아니, 내 순서대로
                    </button>
                  </span>
                </motion.div>
              )}

              <ol className="mt-1">
                {p.plan.items.map((it, i) => {
                  const leg = p.plan.legs[i];
                  const next = p.plan.items[i + 1];
                  const isSpot = it.kind === "spot";
                  if (isSpot) spotNo++;
                  const no = spotNo;
                  const prevReal = [...p.plan.items.slice(0, i)].reverse().find((x) => x.kind !== "meal");
                  const focusTarget = it.kind === "meal" ? prevReal?.place.id : it.place.id;
                  const focused = !!focusTarget && p.focusId === focusTarget;
                  return (
                    <li key={`${it.place.id}-${i}`}>
                      <div className={`flex items-start gap-2 rounded-lg transition-colors ${focused ? "bg-[rgba(255,230,120,0.5)]" : ""}`}>
                        <span className="w-[54px] shrink-0 pt-[2px] text-right text-[19px] tabular-nums">{fmtTime(it.arrive)}</span>
                        <span
                          className="mt-[5px] grid size-[24px] shrink-0 place-items-center rounded-full text-[16px] leading-none text-white"
                          style={{ background: isSpot ? "#d9534f" : it.kind === "meal" ? "#e0903a" : "#3b6ea8" }}
                        >
                          {isSpot ? no : it.kind === "meal" ? "🍴" : "駅"}
                        </span>
                        <div className="min-w-0 flex-1 leading-[26px]">
                          <button
                            type="button"
                            onClick={() => focusTarget && p.onFocus(focused ? null : focusTarget)}
                            title="지도에서 보기"
                            className="pen block max-w-full truncate text-left text-[23px] underline decoration-dotted decoration-[#3b2f24]/30 underline-offset-4 hover:decoration-[#3b2f24]"
                            style={{ fontFamily: "var(--font-hand)" }}
                          >
                            {it.place.ko}
                          </button>
                          {isSpot && (
                            <span className="block text-[15px] opacity-65">
                              {it.wait > 0 ? `${it.wait}분 기다린 뒤 ` : ""}
                              {it.stay}분 머물기 · {fmtTime(it.depart)} 출발
                              {it.issue && <span className="ml-1 text-[#c8402f]">⚠ 영업시간 확인</span>}
                            </span>
                          )}
                          {it.kind === "meal" && prevReal && (
                            <span className="block text-[15px] opacity-75">
                              약 {it.stay}분 · {fmtTime(it.depart)}까지 ·{" "}
                              <a href={nearbyFoodUrl(prevReal.place)} target="_blank" rel="noopener noreferrer" className="pen underline decoration-dotted">
                                근처 식당 찾기 ↗
                              </a>
                            </span>
                          )}
                        </div>
                        {isSpot && (
                          <span className="flex shrink-0 flex-col pt-[2px]">
                            <button type="button" onClick={() => p.onMove(it.place.id, -1)} disabled={no === 1} aria-label={`${it.place.ko} 위로`} className="pen grid h-[18px] w-[26px] place-items-center text-[12px] leading-none hover:bg-[rgba(255,224,110,0.8)] disabled:opacity-25">
                              ▲
                            </button>
                            <button type="button" onClick={() => p.onMove(it.place.id, 1)} disabled={no === spotTotal} aria-label={`${it.place.ko} 아래로`} className="pen grid h-[18px] w-[26px] place-items-center text-[12px] leading-none hover:bg-[rgba(255,224,110,0.8)] disabled:opacity-25">
                              ▼
                            </button>
                          </span>
                        )}
                      </div>
                      {leg && next && leg.minutes > 0 && (
                        <div className="ml-[62px] flex items-center gap-2 border-l-2 border-dashed border-[#c8402f]/60 pl-3 text-[16px] leading-[34px] opacity-80">
                          <span>
                            {leg.mode === "walk" ? "🚶 걸어서" : "🚃 전철·버스"} 약 {leg.minutes}분
                          </span>
                          {next.kind !== "meal" && it.kind !== "meal" && (
                            <a href={legUrl(it.place, next.place, leg.mode === "walk" ? "walking" : "transit")} target="_blank" rel="noopener noreferrer" className="pen underline decoration-dotted">
                              Google 지도 ↗
                            </a>
                          )}
                        </div>
                      )}
                      {leg && next && leg.minutes === 0 && <div className="ml-[62px] h-[10px] border-l-2 border-dashed border-[#c8402f]/40" />}
                    </li>
                  );
                })}
              </ol>

              {p.removal && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`${note} mt-2 bg-[rgba(255,200,190,0.55)]`}>
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
                  <Thumb spot={p.suggestion.spot} onClick={() => p.onPhoto(p.suggestion!.spot.id)} />
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

              <section className="mt-4 rounded-xl border-2 border-dashed border-[#3b2f24]/50 bg-[rgba(255,255,255,0.45)] p-3">
                <h3 className="text-[24px] leading-[30px]" style={{ fontFamily: "var(--font-hand)" }}>
                  Google에 일정으로 가져가기
                </h3>
                <p className="text-[15px] leading-[21px] opacity-70">길찾기가 아니라, 장소와 시간이 들어간 일정표로 가져가요. 파일을 받아서 Google에 불러오면 돼요.</p>
                <div className="mt-2 max-w-[210px]">
                  <DateChip label="여행 날짜" value={s.date} onChange={(v) => p.onSettings({ ...s, date: v })} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => download(`${area.ko}-일정.kml`, buildKml(`${area.ko} 일정`, p.plan), "application/vnd.google-earth.kml+xml")}
                    className="pen rounded-full border-2 border-[#3b2f24] bg-white/80 px-4 text-[21px] leading-[38px] transition-colors hover:bg-[#3b2f24] hover:text-white"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    🗺 내 지도용 파일 (.kml)
                  </button>
                  <button
                    type="button"
                    onClick={() => download(`${area.ko}-일정.ics`, buildIcs(`${area.ko} 일정`, p.plan, s.date, `${area.id}-${s.date}`), "text/calendar")}
                    className="pen rounded-full border-2 border-[#3b2f24] bg-white/80 px-4 text-[21px] leading-[38px] transition-colors hover:bg-[#3b2f24] hover:text-white"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    📅 캘린더용 파일 (.ics)
                  </button>
                </div>
                <ul className="mt-2 text-[14px] leading-[20px] opacity-75">
                  <li>
                    <b>내 지도</b>: 번호가 붙은 핀과 방문 순서 선이 지도에 올라가요.{" "}
                    <a href="https://www.google.com/mymaps" target="_blank" rel="noopener noreferrer" className="pen underline decoration-dotted">
                      Google 내 지도 열기 ↗
                    </a>{" "}
                    → 새 지도 만들기 → 가져오기 → 받은 파일 선택
                  </li>
                  <li className="mt-1">
                    <b>캘린더</b>: 장소마다 시간대와 위치가 있는 일정이 만들어져요.{" "}
                    <a href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener noreferrer" className="pen underline decoration-dotted">
                      Google 캘린더 가져오기 ↗
                    </a>
                  </li>
                </ul>
              </section>
              <p className="mt-2 text-[14px] leading-[20px] opacity-60">이동 시간은 거리로 계산한 대략적인 값이에요. 실제 환승 시간은 구간별 Google 지도 링크에서 확인하세요.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
