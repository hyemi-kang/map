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
