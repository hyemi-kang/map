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

/** 4 都県が大きく見える、関東中心の視点(周りの県も少し見える) */
export function kantoView(aspect: number, reserve?: Reserve): View {
  const rects = (["tokyo", "kanagawa", "chiba", "saitama"] as PrefId[]).map(prefRect);
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return fitView({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, aspect, 1.9, reserve);
}

export function prefRect(pref: PrefId): Rect {
  return featureRect(muniByPref[pref].features);
}

export function areaRect(areaId: string, extra: { lat: number; lng: number }[] = []): Rect {
  const area = areaById(areaId);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of [...area.spots, ...area.stations, ...extra]) {
    const [x, y] = lngLatToWorld(p.lng, p.lat);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  // 点が 1〜2 個しかないエリアでも潰れないよう、最低限の大きさを確保する
  const minSize = 6;
  const w = Math.max(minSize, x1 - x0);
  const h = Math.max(minSize, y1 - y0);
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}

/** 1 か所に寄る視点(ノートに隠れない側の中央に置く) */
export function focusView(wx: number, wy: number, h: number, aspect: number, reserve: Reserve = { right: 0, bottom: 0 }): View {
  return { cx: wx + (h * aspect * reserve.right) / 2, cy: wy + (h * reserve.bottom) / 2, h };
}
