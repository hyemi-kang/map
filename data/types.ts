import type { PrefId } from "@/lib/geo";

export type Category = "shrine" | "temple" | "nature" | "food" | "view" | "walk" | "museum" | "play";

export type Place = { id: string; ja: string; ko: string; lat: number; lng: number };
export type Station = Place;

export type Spot = Place & {
  /** 標準滞在時間(分) */
  stay: number;
  /** 営業時間(0:00からの分)。24時間アクセス可なら 0〜1440 */
  open: number;
  close: number;
  category: Category;
  /** 1=定番(最初から選択)、2=おすすめ、3=穴場 */
  priority: 1 | 2 | 3;
  desc: string;
};

export type Area = {
  id: string;
  pref: PrefId;
  ja: string;
  ko: string;
  /** 国土数値情報の行政区域コード(N03_007) */
  codes: string[];
  tagline: string;
  stations: Station[];
  spots: Spot[];
  /** "idA|idB"(辞書順) → 分。距離推定より優先する移動時間 */
  transit?: Record<string, number>;
};

export type Prefecture = { id: PrefId; ja: string; ko: string; note: string };
