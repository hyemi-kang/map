import type { Place } from "@/data/types";

/*
 * Google マップの URL スキーム(API キー不要)。
 * 仕様: https://developers.google.com/maps/documentation/urls/get-started
 */
const ll = (p: Place) => `${p.lat},${p.lng}`;

export const spotUrl = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll(p))}`;

/**
 * 全行程。origin / destination 以外は waypoints に入れる。
 * 公式の上限は 9 件(モバイルブラウザでは 3 件)で、transit では waypoints が無視されることがある。
 * そのため全行程は walking を既定とし、電車・バスは legUrl で区間ごとに開く。
 */
export function routeUrl(stops: Place[], mode: "walking" | "transit" | "driving" = "walking") {
  if (stops.length < 2) return "";
  const [origin, ...rest] = stops;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1).slice(0, 9);
  const q = new URLSearchParams({ api: "1", origin: ll(origin), destination: ll(destination), travelmode: mode });
  if (waypoints.length) q.set("waypoints", waypoints.map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

/** 区間ごとの経路(電車・バスはこちらを使う。waypoints なしで transit が使える) */
export const legUrl = (a: Place, b: Place, mode: "walking" | "transit" = "transit") =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: ll(a), destination: ll(b), travelmode: mode }).toString()}`;

/** 近くのお店を探す検索(昼食用)。Maps URLs の search に「restaurants near 緯度,経度」を渡す */
export const nearbyFoodUrl = (p: Place) =>
  `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: `restaurants near ${p.lat},${p.lng}` }).toString()}`;

/** 地図を開いて場所を探してもらう(エリアの中心を表示) */
export const openMapAt = (lat: number, lng: number, zoom = 14) => `https://www.google.com/maps/@${lat},${lng},${zoom}z`;

export type Parsed =
  | { ok: true; lat: number; lng: number; name?: string }
  | { ok: false; reason: "empty" | "short" | "invalid" | "range" };

// 日本の範囲(沖縄〜北海道、小笠原を含めてゆるめに)
const inJapan = (lat: number, lng: number) => lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154;

/**
 * Google マップの URL や、右クリックでコピーした座標("35.3258, 139.5566")を読み取る。
 * API キー無しで、ユーザーが Google マップで探した場所を取り込むための入口。
 * 短縮 URL(maps.app.goo.gl)は中身を読めない(ブラウザから展開できない)ので案内する。
 */
export function parseMapsInput(input: string): Parsed {
  const s = input.trim();
  if (!s) return { ok: false, reason: "empty" };
  if (/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s)) return { ok: false, reason: "short" };

  const pair = /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/;
  let m: RegExpMatchArray | null;
  let lat: number | undefined;
  let lng: number | undefined;
  let name: string | undefined;

  if ((m = s.match(pair))) {
    lat = +m[1];
    lng = +m[2];
  } else if (/^https?:\/\//i.test(s) || s.includes("google.")) {
    // 場所そのものの座標(!3d緯度!4d経度)を優先し、なければ表示の中心(@緯度,経度)
    if ((m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) {
      lat = +m[1];
      lng = +m[2];
    } else if ((m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/))) {
      lat = +m[1];
      lng = +m[2];
    } else if ((m = s.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i))) {
      lat = +m[1];
      lng = +m[2];
    }
    const place = s.match(/\/maps\/place\/([^/@?]+)/);
    if (place) {
      try {
        const decoded = decodeURIComponent(place[1].replace(/\+/g, " ")).trim();
        // 座標だけの "35.3,139.5" は名前として使わない
        if (decoded && !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(decoded)) name = decoded;
      } catch {
        /* 壊れたエンコードのときは名前なし */
      }
    }
  }

  if (lat === undefined || lng === undefined) return { ok: false, reason: "invalid" };
  if (!inJapan(lat, lng)) return { ok: false, reason: "range" };
  return { ok: true, lat, lng, name };
}

export const PARSE_ERROR_KO: Record<"empty" | "short" | "invalid" | "range", string> = {
  empty: "링크나 좌표를 붙여넣어 주세요.",
  short: "짧은 링크(maps.app.goo.gl)는 읽을 수 없어요. 주소창에 보이는 긴 링크나, 지도를 우클릭해서 복사한 좌표를 붙여넣어 주세요.",
  invalid: "링크나 좌표를 읽지 못했어요. 예) 35.3258, 139.5566",
  range: "일본 안의 위치가 아니에요. 좌표를 다시 확인해 주세요.",
};
