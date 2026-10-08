import { featureRect, lngLatToWorld, muniByPref, WORLD_H, WORLD_W, type PrefId, type Rect } from "@/lib/geo";
import { areaById } from "@/data/regions";
import type { View } from "@/components/map/PaperMap";

export type Reserve = { right: number; bottom: number };

const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** rect が(ノートに隠れない側の領域に)収まる視点を返す */
export function fitView(rect: Rect, aspect: number, pad: number, reserve: Reserve = { right: 0, bottom: 0 }): View {
  const usableW = 1 - reserve.right;
  const usableH = 1 - reserve.bottom;
  const h = Math.max((rect.h * pad) / usableH, (rect.w * pad) / (aspect * usableW));
  const c = center(rect);
  // 見える領域の中心 = 画面中心 + (ノートの分だけ左上へ)
  return { cx: c.x + (h * aspect * reserve.right) / 2, cy: c.y + (h * reserve.bottom) / 2, h };
}

export const japanView = (aspect: number): View => fitView({ x: 0, y: 0, w: WORLD_W, h: WORLD_H }, aspect, 1.06);

export function prefRect(pref: PrefId): Rect {
  return featureRect(muniByPref[pref].features);
}

export function areaRect(areaId: string): Rect {
  const area = areaById(areaId);
  const feats = muniByPref[area.pref].features.filter((f) => area.codes.includes(f.properties.N03_007));
  const base = featureRect(feats);
  let x0 = base.x, y0 = base.y, x1 = base.x + base.w, y1 = base.y + base.h;
  for (const p of [...area.spots, ...area.stations]) {
    const [x, y] = lngLatToWorld(p.lng, p.lat);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
