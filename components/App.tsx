"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AREAS, PREFECTURES, areaById, areasOf } from "@/data/regions";
import type { Spot } from "@/data/types";
import { nextSaturday } from "@/lib/export";
import { lngLatToWorld, type PrefId } from "@/lib/geo";
import { buildPlan, parseTime, suggestAddition, suggestRemoval, type PlanInput } from "@/lib/planner";
import { areaRect, fitView, japanView, kantoView, prefRect } from "@/lib/views";
import Pin from "./board/Pin";
import Room from "./room/Room";
import { Mug, Pencil, TapeLabel } from "./desk/DeskProps";
import Yarn from "./board/Yarn";
import PaperMap, { worldToScreen, type Sheet } from "./map/PaperMap";
import type { LayerSpec } from "./map/mapTexture";
import AreaPage, { type Settings, type Tab } from "./notebook/AreaPage";
import Notebook from "./notebook/Notebook";
import PrefPage from "./notebook/PrefPage";
import Write from "./notebook/Write";
import PhotoModal from "./photos/PhotoModal";
import Polaroid from "./photos/Polaroid";

type Scene = "room" | "desk" | "japan" | "pref" | "area";

/** 机を斜めに見下ろす角度(度)。地図を開くと 0(真上)になる */
const DESK_TILT = 38;
const TILT_SPRING = { type: "spring", stiffness: 55, damping: 15 } as const;
/** 部屋 → 机に座る: 机のほうへ近づき、最後に机の上の景色へ溶ける */
const roomVariants = {
  hidden: { opacity: 0, scale: 1.04 },
  rest: { opacity: 1, scale: 1, transition: { duration: 0.9 } },
  sit: { scale: 3.3, y: "-14%", opacity: 0, transition: { duration: 1.5, ease: [0.55, 0.05, 0.3, 1] as [number, number, number, number], opacity: { delay: 0.85, duration: 0.6 } } },
};
const DESK_SHEET: Sheet = { inset: 0.1, tilt: -0.03, wear: 1 };
const FULL_SHEET: Sheet = { inset: 0, tilt: 0, wear: 0 };
const PIN_COLORS = ["#d9534f", "#e8833a", "#d6a800", "#4c9a5a", "#3b8fc4", "#8a5fbf", "#c2548f"];


const defaultSettings = (areaId: string, date = ""): Settings => {
  const a = areaById(areaId);
  return { start: "09:30", end: "17:30", startStation: a.stations[0].id, endStation: a.stations[0].id, date };
};
const defaultSelection = (areaId: string) =>
  areaById(areaId)
    .spots.filter((s) => s.priority === 1)
    .slice(0, 5)
    .map((s) => s.id);

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 800 });
  const [mounted, setMounted] = useState(false);
  const [scene, setScene] = useState<Scene>("room");
  const [prefId, setPrefId] = useState<PrefId>("kanagawa");
  const [areaId, setAreaId] = useState<string>("kamakura-enoshima");
  const [settled, setSettled] = useState(true);

  const [settings, setSettings] = useState<Settings>(() => defaultSettings("kamakura-enoshima"));
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultSelection("kamakura-enoshima"));
  const [rejected, setRejected] = useState<ReadonlySet<string>>(new Set());
  const [tab, setTab] = useState<Tab>("spots");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  // 日付は現在時刻に依存するので、ハイドレーション後に入れる
  useEffect(() => {
    setSettings((s) => (s.date ? s : { ...s, date: nextSaturday() }));
  }, []);

  useEffect(() => {
    const el = root.current!;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    setMounted(true);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mobile = size.w < 820;
  const aspect = size.w / size.h;
  const nbW = mobile ? size.w : Math.min(470, Math.max(360, size.w * 0.36));
  const reserve = mobile ? { right: 0, bottom: 0.55 } : { right: nbW / size.w, bottom: 0 };

  /* ---------- 地図の視点 ---------- */
  const view = useMemo(() => {
    if (scene === "pref") return fitView(prefRect(prefId), aspect, 1.15, reserve);
    if (scene === "area") return fitView(areaRect(areaId), aspect, 1.28, reserve);
    if (scene === "japan") return kantoView(aspect);
    return japanView(aspect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, prefId, areaId, aspect, reserve.right, reserve.bottom]);

  const layer = useMemo<LayerSpec>(() => {
    if (scene === "pref") return { level: "pref", prefId };
    if (scene === "area") return { level: "area", prefId, areaId };
    return { level: "japan" };
  }, [scene, prefId, areaId]);

  /* ---------- 日程 ---------- */
  const area = areaById(areaId);
  const selectedSpots = useMemo(() => selectedIds.map((id) => area.spots.find((s) => s.id === id)).filter((s): s is Spot => !!s), [selectedIds, area]);
  const planInput = useMemo<PlanInput>(() => {
    const st = (id: string) => area.stations.find((x) => x.id === id) ?? area.stations[0];
    return {
      start: st(settings.startStation),
      end: st(settings.endStation),
      spots: selectedSpots,
      startTime: parseTime(settings.start || "09:30"),
      endTime: parseTime(settings.end || "17:30"),
      hints: area.transit,
    };
  }, [area, settings, selectedSpots]);
  const plan = useMemo(() => buildPlan(planInput), [planInput]);
  const suggestion = useMemo(() => suggestAddition(planInput, area.spots, rejected), [planInput, area, rejected]);
  const removal = useMemo(() => suggestRemoval(planInput), [planInput]);

  const orderedSpotIds = plan.items.filter((i) => i.kind === "spot").map((i) => i.place.id);

  /* ---------- 操作 ---------- */
  const pickArea = useCallback((id: string) => {
    setAreaId(id);
    setSettings((prev) => defaultSettings(id, prev.date));
    setSelectedIds(defaultSelection(id));
    setRejected(new Set());
    setTab("spots");
    setSettled(false);
    setScene("area");
  }, []);

  const onPick = useCallback(
    (id: string) => {
      if (scene === "japan") {
        setPrefId(id as PrefId);
        setSettled(false);
        setScene("pref");
      } else if (scene === "pref") {
        pickArea(id);
      }
    },
    [scene, pickArea],
  );

  const back = useCallback(() => {
    setSettled(false);
    setScene((s) => (s === "area" ? "pref" : s === "pref" ? "japan" : s === "japan" ? "desk" : s === "desk" ? "room" : s));
    setTab("spots");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  /* ---------- 画面上のピン位置 ---------- */
  const screen = useCallback((lat: number, lng: number) => {
    const [x, y] = lngLatToWorld(lng, lat);
    return worldToScreen(view, size.w, size.h, x, y);
  }, [view, size.w, size.h]);

  const showPins = scene === "area" && settled;
  const yarnPoints = useMemo(() => (tab === "plan" ? plan.items.map((i) => screen(i.place.lat, i.place.lng)) : []), [tab, plan, screen]);
  const yarnSig = `${areaId}:${plan.items.map((i) => i.place.id).join(",")}`;

  const inRegion = scene === "japan" || scene === "pref";
  /** 机の上に置かれた紙(斜めに見下ろす)かどうか */
  const onDesk = scene === "room" || scene === "desk";
  const prefecture = PREFECTURES.find((p) => p.id === prefId)!;
  const nbStyle = mobile ? { left: 8, right: 8, bottom: 8, height: "50%" } : { right: 18, top: 18, bottom: 18, width: nbW - 18 };
  const nbInitial = mobile ? { y: "110%", rotate: 2 } : { x: "115%", rotate: 9, y: 30 };
  const nbAnimate = mobile ? { y: 0, rotate: 0 } : { x: 0, y: 0, rotate: 0.8 };

  const stationPinsToShow = area.stations.filter((s) => s.id === settings.startStation || s.id === settings.endStation);

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-[#24130a]" style={{ perspective: 1500, perspectiveOrigin: "50% 38%" }}>
      {/* 机の天板(斜めに見下ろす → 真上から見る) */}
      <motion.div
        aria-hidden
        className="desk absolute"
        style={{ backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/textures/wood.jpg)`, left: -size.w * 0.35, top: -size.h * 0.5, width: size.w * 1.7, height: size.h * 2.1, transformOrigin: `${size.w * 0.85}px ${size.h * (0.72 + 0.5)}px` }}
        initial={false}
        animate={{ rotateX: onDesk ? DESK_TILT : 0 }}
        transition={TILT_SPRING}
      />
      {/* 窓からの光 */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[12]"
        style={{ background: "radial-gradient(ellipse at 18% 8%, rgba(255,238,200,0.42), rgba(255,238,200,0) 58%), linear-gradient(180deg, rgba(24,12,3,0.72) 0%, rgba(24,12,3,0) 34%)" }}
        initial={false}
        animate={{ opacity: onDesk ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />
      {/* 机の上に置いたもの(地図・ポラロイド・小物)は同じ角度で傾く */}
      <motion.div
        className="absolute inset-0 z-10"
        style={{ transformOrigin: "50% 72%" }}
        initial={false}
        animate={{ rotateX: onDesk ? DESK_TILT : 0 }}
        transition={TILT_SPRING}
      >
      <PaperMap
        className={`map-canvas absolute inset-0 ${inRegion ? "is-region" : ""}`}
        view={view}
        layer={layer}
        sheet={onDesk ? DESK_SHEET : FULL_SHEET}
        interactive={scene === "japan" || scene === "pref" || scene === "desk"}
        paused={scene === "room"}
        onPick={onPick}
        onSheetClick={() => setScene("japan")}
        onSettled={() => setSettled(true)}
      />

      {/* 机の上: タイトル・ヒント・小物・ポラロイド */}
      <AnimatePresence>
        {scene === "desk" && mounted && (
          <motion.div
            key="desk-props"
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute left-1/2 top-[1.6%] -translate-x-1/2">
              <TapeLabel>
                <h1 className="text-[clamp(30px,4.6vw,56px)] leading-[1.15]" style={{ fontFamily: "var(--font-hand)" }}>
                  <Write text="도쿄 근교 여행 지도" speed={0.1} delay={0.4} />
                </h1>
              </TapeLabel>
            </div>
            {/* 머그컵과 연필 */}
            <motion.div className="absolute" style={{ left: "17%", top: "2%" }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
              <Mug size={mobile ? 56 : 92} />
            </motion.div>
            <motion.div className="absolute" style={{ right: "15%", bottom: "2.5%", rotate: -14 }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
              <Pencil length={mobile ? 110 : 190} />
            </motion.div>
            <motion.p
              className="absolute bottom-[3%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[clamp(18px,2.4vw,28px)] text-[#fff3d6]"
              style={{ fontFamily: "var(--font-hand)", textShadow: "0 2px 6px rgba(30,15,0,0.65)" }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            >
              ↑ 지도를 눌러서 펼쳐 보세요
            </motion.p>

            {/* 紙を留めたピン */}
            <div className="absolute inset-0" style={{ filter: "drop-shadow(0 4px 4px rgba(20,10,0,0.3))" }}>
              {[
                { x: size.w * 0.17, y: size.h * 0.2, c: "#d9534f" },
                { x: size.w * 0.84, y: size.h * 0.78, c: "#3b8fc4" },
              ].map((p, i) => (
                <Pin key={i} x={p.x} y={p.y} color={p.c} delay={0.9 + i * 0.15} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>

      {/* 戻る */}
      <AnimatePresence>
        {scene !== "room" && (
          <motion.button
            key="back"
            type="button"
            onClick={back}
            className="pen absolute left-4 top-4 z-40 rounded-full border-2 border-[#3b2f24]/70 bg-[#fffdf6]/90 px-4 text-[24px] leading-[40px] shadow-md hover:bg-white"
            style={{ fontFamily: "var(--font-hand)" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            ← 뒤로 <span className="text-[15px] opacity-50">(Esc)</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 日本地図の案内 */}
      <AnimatePresence>
        {scene === "japan" && (
          <motion.p
            key="japan-hint"
            className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full bg-[#fffdf6]/85 px-5 text-[26px] leading-[44px] shadow-md"
            style={{ fontFamily: "var(--font-hand)" }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
          >
            색칠된 곳을 눌러 확대해 보세요
          </motion.p>
        )}
      </AnimatePresence>

      {/* ピンと毛糸(エリア) */}
      {showPins && (
        <div className="pointer-events-none absolute inset-0 z-[22]">
          <AnimatePresence>{yarnPoints.length > 1 && <Yarn key={yarnSig} points={yarnPoints} width={size.w} height={size.h} signature={yarnSig} />}</AnimatePresence>
          <div className="pointer-events-auto absolute inset-0" style={{ filter: "drop-shadow(0 3px 3px rgba(20,10,0,0.28))" }}>
            {stationPinsToShow.map((st) => {
              const p = screen(st.lat, st.lng);
              return <Pin key={st.id} x={p.x} y={p.y} color="#2f6fb0" label="駅" size={1.1} title={st.ko} zIndex={4} />;
            })}
            {area.spots.map((sp, i) => {
              const p = screen(sp.lat, sp.lng);
              const order = orderedSpotIds.indexOf(sp.id);
              const on = order >= 0;
              return (
                <Pin
                  key={sp.id}
                  x={p.x}
                  y={p.y}
                  color={on ? PIN_COLORS[order % PIN_COLORS.length] : "#9a928a"}
                  label={on ? String(order + 1) : undefined}
                  ghost={!on}
                  size={on ? 1 : 0.8}
                  delay={0.1 + i * 0.05}
                  title={`${sp.ko} (${on ? "클릭하면 뺄 수 있어요" : "클릭하면 일정에 넣어요"})`}
                  onClick={() => toggle(sp.id)}
                  zIndex={on ? 5 : 3}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 写真(エリア): 地図の左下に置いたポラロイド */}
      <AnimatePresence>
        {scene === "area" && settled && !mobile && (
          <motion.div
            key="strip"
            className="absolute bottom-3 left-4 z-[24] flex items-end overflow-x-auto overflow-y-visible px-3 pb-2 pt-12"
            style={{ maxWidth: size.w - nbW - 32, scrollbarWidth: "none" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {area.spots.map((sp, i) => (
              <motion.div
                key={sp.id}
                className="-mr-5 shrink-0"
                initial={{ y: 120, opacity: 0, rotate: 20 }}
                animate={{ y: 0, opacity: 1, rotate: ((i * 37) % 11) - 5 }}
                transition={{ type: "spring", stiffness: 180, damping: 17, delay: 0.3 + i * 0.07 }}
              >
                <Polaroid spot={sp} width={112} tilt={12} selected={selectedIds.includes(sp.id)} onClick={() => setPhotoIndex(i)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ノート(メモ帳)が机の上に置かれる */}
      <AnimatePresence mode="wait">
        {(scene === "pref" || scene === "area") && (
          <motion.div
            key="notebook"
            className="absolute z-30"
            style={nbStyle}
            initial={nbInitial}
            animate={nbAnimate}
            exit={mobile ? { y: "110%" } : { x: "115%", rotate: 8 }}
            transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.35 }}
          >
            <Notebook>
              <AnimatePresence mode="wait" initial={false}>
                {scene === "pref" ? (
                  <motion.div key={`pref-${prefId}`} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <PrefPage pref={prefecture} areas={areasOf(prefId)} onPick={pickArea} />
                  </motion.div>
                ) : (
                  <motion.div key={`area-${areaId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <AreaPage
                      area={area}
                      settings={settings}
                      onSettings={setSettings}
                      selectedIds={selectedIds}
                      onToggle={toggle}
                      plan={plan}
                      tab={tab}
                      onTab={setTab}
                      suggestion={tab === "plan" ? suggestion : null}
                      onAccept={() => suggestion && setSelectedIds((c) => [...c, suggestion.spot.id])}
                      onReject={() => suggestion && setRejected((r) => new Set([...r, suggestion.spot.id]))}
                      removal={tab === "plan" ? removal : null}
                      onRemove={(id) => setSelectedIds((c) => c.filter((x) => x !== id))}
                      onPhoto={setPhotoIndex}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Notebook>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 旅の部屋(最初の画面)。机をクリックすると椅子に座るように近づく */}
      <AnimatePresence>
        {scene === "room" && mounted && (
          <motion.div key="room" className="absolute inset-0 z-[60] overflow-hidden" style={{ transformOrigin: "50% 66%" }} variants={roomVariants} initial="hidden" animate="rest" exit="sit">
            <Room onSit={() => setScene("desk")} />
            <motion.p
              className="pointer-events-none absolute bottom-[4%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[clamp(20px,2.6vw,30px)] text-[#fff3d6]"
              style={{ fontFamily: "var(--font-hand)", textShadow: "0 2px 8px rgba(30,15,0,0.75)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, -4, 0] }}
              transition={{ opacity: { delay: 1.4 }, y: { repeat: Infinity, duration: 2.4, delay: 1.4 } }}
            >
              여행 갈 곳, 책상에서 정해 볼까?
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 写真モーダル */}
      <PhotoModal spots={area.spots} index={photoIndex} onIndex={setPhotoIndex} selectedIds={selectedIds} onToggle={toggle} />
    </div>
  );
}
