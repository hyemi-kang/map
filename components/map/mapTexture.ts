import { east, muniByPref, pathGen, prefIdOf, PREF_IDS, type PrefId, type Rect } from "@/lib/geo";
import { AREAS } from "@/data/regions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Level = "japan" | "pref" | "area";
export type LayerSpec = { level: Level; prefId?: PrefId; areaId?: string };

const SEA = "#c4d9d6";
const LAND = "#f3e9cd";
const LAND_DIM = "#e6dcc0";
const INK = "rgba(92, 70, 42, 0.55)";
const PREF_TINT: Record<PrefId, string> = {
  tokyo: "#f2c3a0",
  kanagawa: "#a7d2bd",
  chiba: "#efdb94",
  saitama: "#c6bfe0",
};
const AREA_TINTS = ["#f2c3a0", "#a7d2bd", "#efdb94", "#c6bfe0", "#f0b9b9", "#b5d3ea"];

const pathCache = new Map<any, Path2D>();
const path2d = (f: any) => {
  let p = pathCache.get(f);
  if (!p) {
    p = new Path2D(pathGen(f) ?? "");
    pathCache.set(f, p);
  }
  return p;
};

const areaOfCode = (code: string) => AREAS.find((a) => a.codes.includes(code));

export type HitTarget = { id: string; path: Path2D };

/** 現在のレベルでクリックできる領域 */
export function hitTargets(spec: LayerSpec): HitTarget[] {
  if (spec.level === "japan") {
    const out: HitTarget[] = [];
    for (const f of east.features) {
      const id = prefIdOf(f.properties.N03_001);
      if (id) out.push({ id, path: path2d(f) });
    }
    return out;
  }
  if (!spec.prefId) return [];
  const out = new Map<string, Path2D>();
  for (const f of muniByPref[spec.prefId].features) {
    const a = areaOfCode(f.properties.N03_007);
    if (!a || a.pref !== spec.prefId) continue;
    if (spec.level === "area" && a.id !== spec.areaId) continue;
    // 同じエリアの市区町村をまとめて 1 つの Path2D にする
    const merged = out.get(a.id) ?? new Path2D();
    merged.addPath(path2d(f));
    out.set(a.id, merged);
  }
  return [...out].map(([id, path]) => ({ id, path }));
}

let probe: CanvasRenderingContext2D | null = null;
export function pick(spec: LayerSpec, x: number, y: number): string | null {
  probe ??= document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  for (const t of hitTargets(spec)) if (probe.isPointInPath(t.path, x, y)) return t.id;
  return null;
}

/** 紙地図の 1 レイヤーを描く。bounds は世界座標で、描画先キャンバスの全面に対応する */
export function renderLayer(canvas: HTMLCanvasElement, bounds: Rect, spec: LayerSpec, hoverId: string | null) {
  const ctx = canvas.getContext("2d")!;
  const s = canvas.width / bounds.w;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(s, 0, 0, s, -bounds.x * s, -bounds.y * s);
  const px = 1 / s; // 1 デバイス px に相当する世界長
  ctx.lineJoin = "round";

  // 海岸線のにじみ(海側へ薄く広がるハッチ)
  ctx.save();
  ctx.strokeStyle = "rgba(120,160,165,0.28)";
  for (let i = 3; i >= 1; i--) {
    ctx.lineWidth = px * 5 * i;
    for (const f of east.features) ctx.stroke(path2d(f));
  }
  ctx.restore();

  // 陸地
  for (const f of east.features) {
    const id = prefIdOf(f.properties.N03_001);
    ctx.fillStyle = id ? LAND : LAND_DIM;
    ctx.fill(path2d(f));
  }

  const tint = (path: Path2D, color: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  };

  if (spec.level === "japan") {
    for (const f of east.features) {
      const id = prefIdOf(f.properties.N03_001);
      if (id) tint(path2d(f), PREF_TINT[id], hoverId === id ? 0.95 : 0.55);
    }
  } else if (spec.prefId) {
    const muni = muniByPref[spec.prefId].features;
    // 他の都県は薄く、対象の都県はエリアごとに色分け
    for (const id of PREF_IDS) {
      if (id === spec.prefId) continue;
      for (const f of muniByPref[id].features) {
        ctx.fillStyle = LAND_DIM;
        ctx.fill(path2d(f));
      }
    }
    muni.forEach((f) => {
      ctx.fillStyle = LAND;
      ctx.fill(path2d(f));
    });
    const targets = hitTargets(spec);
    targets.forEach((t, i) => {
      const dim = spec.level === "area" && spec.areaId !== t.id;
      tint(t.path, AREA_TINTS[AREAS.findIndex((a) => a.id === t.id) % AREA_TINTS.length], dim ? 0.25 : hoverId === t.id ? 0.95 : 0.6);
      void i;
    });
    // 市区町村の境界線
    ctx.strokeStyle = "rgba(110,88,58,0.38)";
    ctx.lineWidth = px * 1.1;
    for (const id of PREF_IDS) for (const f of muniByPref[id].features) ctx.stroke(path2d(f));
  }

  // 都県の境界線は太めのインクで
  ctx.strokeStyle = INK;
  ctx.lineWidth = px * (spec.level === "japan" ? 1.6 : 2.2);
  for (const f of east.features) ctx.stroke(path2d(f));
}
