import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import eastRaw from "@/data/geo/east-japan.json";
import tokyoRaw from "@/data/geo/tokyo.json";
import kanagawaRaw from "@/data/geo/kanagawa.json";
import chibaRaw from "@/data/geo/chiba.json";
import saitamaRaw from "@/data/geo/saitama.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Fc = { type: "FeatureCollection"; features: any[] };

export type PrefId = "tokyo" | "kanagawa" | "chiba" | "saitama";
export const PREF_IDS: PrefId[] = ["tokyo", "kanagawa", "chiba", "saitama"];

export const east = eastRaw as unknown as Fc;
export const muniByPref: Record<PrefId, Fc> = {
  tokyo: tokyoRaw as unknown as Fc,
  kanagawa: kanagawaRaw as unknown as Fc,
  chiba: chibaRaw as unknown as Fc,
  saitama: saitamaRaw as unknown as Fc,
};

export const PREF_NAME_JA: Record<PrefId, string> = {
  tokyo: "東京都",
  kanagawa: "神奈川県",
  chiba: "千葉県",
  saitama: "埼玉県",
};
export const prefIdOf = (nameJa: string): PrefId | null =>
  (PREF_IDS.find((p) => PREF_NAME_JA[p] === nameJa) ?? null) as PrefId | null;

/** 世界座標: 東日本全体の幅が WORLD_W、原点は左上、y は下向き */
export const WORLD_W = 1000;
export const projection: GeoProjection = geoMercator().fitWidth(WORLD_W, east as any);
export const pathGen = geoPath(projection);

const b = pathGen.bounds(east as any);
export const WORLD_H = Math.ceil(b[1][1]);

export type Rect = { x: number; y: number; w: number; h: number };
export const WORLD_RECT: Rect = { x: 0, y: 0, w: WORLD_W, h: WORLD_H };

export const lngLatToWorld = (lng: number, lat: number): [number, number] => {
  const p = projection([lng, lat]);
  return p ? [p[0], p[1]] : [0, 0];
};

export function featureRect(features: any[]): Rect {
  const fc = { type: "FeatureCollection", features } as any;
  const [[x0, y0], [x1, y1]] = pathGen.bounds(fc);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function haversineKm(a: [number, number], c: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(c[1] - a[1]);
  const dLng = toRad(c[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(c[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
