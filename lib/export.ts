import type { Place } from "@/data/types";
import { spotUrl } from "./gmaps";
import { fmtTime, type Item, type Plan } from "./planner";

/*
 * 完成した日程を Google に持ち出すためのファイルを作る(API キー不要)。
 *  - KML: Google マイマップ(https://www.google.com/mymaps)の「インポート」で読み込める
 *  - ICS: Google カレンダーの「設定 → インポート/エクスポート」で読み込める
 * 通常の Google マップのアプリは経路検索が中心で、日程表としては使いにくい。
 */

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const label = (it: Item, n: number) =>
  it.kind === "spot" ? `${n}. ${it.place.ja}` : it.kind === "meal" ? "점심 식사" : `${it.kind === "start" ? "출발" : "도착"} ${it.place.ja}`;

function describe(it: Item, plan: Plan, i: number) {
  const next = plan.legs[i];
  const lines = [it.place.ko];
  if (it.kind === "spot") lines.push(`${fmtTime(it.arrive + it.wait)} 도착 → ${fmtTime(it.depart)} 출발 (${it.stay}분)`);
  else if (it.kind === "meal") lines.push(`${fmtTime(it.arrive)}–${fmtTime(it.depart)} (${it.stay}분)`);
  else lines.push(`${fmtTime(it.arrive)}`);
  if (next && next.minutes > 0 && plan.items[i + 1]) lines.push(`다음 장소까지 ${next.mode === "walk" ? "도보" : "전철·버스"} 약 ${next.minutes}분`);
  return lines;
}

export function buildKml(title: string, plan: Plan): string {
  let n = 0;
  const marks = plan.items.map((it, i) => {
    if (it.kind === "meal") return "";
    if (it.kind === "spot") n++;
    const desc = describe(it, plan, i).join("\n") + (it.kind === "spot" ? `\n${spotUrl(it.place)}` : "");
    return `    <Placemark>
      <name>${xml(label(it, n))}</name>
      <description>${xml(desc)}</description>
      <Point><coordinates>${it.place.lng},${it.place.lat},0</coordinates></Point>
    </Placemark>`;
  });
  const line = plan.items.filter((it) => it.kind !== "meal").map((it) => `${it.place.lng},${it.place.lat},0`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xml(title)}</name>
    <Folder>
      <name>${xml(title)}</name>
${marks.filter(Boolean).join("\n")}
    </Folder>
    <Placemark>
      <name>${xml("방문 순서")}</name>
      <LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString>
    </Placemark>
  </Document>
</kml>
`;
}

/* ---------- ICS ---------- */

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** 75 オクテットを超える行は折り返す(RFC 5545)。日本語は 3 バイトなので文字単位で数える */
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 73) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** 日本時間(UTC+9、夏時間なし)の日付と分から UTC の日時文字列を作る */
function utc(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 0, minutes - 9 * 60, 0));
  const p = (v: number) => String(v).padStart(2, "0");
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00Z`;
}

export function buildIcs(title: string, plan: Plan, date: string, uidSeed: string): string {
  const stamp = utc(date, 0);
  let n = 0;
  const events = plan.items.map((it, i) => {
    if (it.kind === "spot") n++;
    const start = it.kind === "spot" ? it.arrive + it.wait : it.arrive;
    // 駅の予定は 15 分の枠にする
    const end = it.kind === "spot" || it.kind === "meal" ? it.depart : start + 15;
    const p: Place = it.place;
    const desc = [...describe(it, plan, i), `Google 지도: ${spotUrl(p)}`].join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${uidSeed}-${i}@tokyo-trip-map`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(date, start)}`,
      `DTEND:${utc(date, end)}`,
      `SUMMARY:${icsText(label(it, n))}`,
      `LOCATION:${icsText(`${p.ja} (${p.lat},${p.lng})`)}`,
      `GEO:${p.lat};${p.lng}`,
      `DESCRIPTION:${icsText(desc)}`,
      "END:VEVENT",
    ]
      .map(fold)
      .join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//tokyo-trip-map//KO", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${icsText(title)}`, "X-WR-TIMEZONE:Asia/Tokyo", ...events, "END:VCALENDAR", ""].join("\r\n");
}

/** ブラウザでファイルとして保存させる */
export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
