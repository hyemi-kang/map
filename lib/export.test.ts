import { describe, expect, it } from "vitest";
import { areaById } from "@/data/regions";
import { buildIcs, buildKml, nextSaturday } from "./export";
import { buildPlan, parseTime } from "./planner";

const kama = areaById("kamakura-enoshima");
const plan = buildPlan({
  start: kama.stations[0],
  end: kama.stations[0],
  spots: [kama.spots[0], kama.spots[2]],
  startTime: parseTime("09:30"),
  endTime: parseTime("17:30"),
  hints: kama.transit,
});

describe("buildIcs", () => {
  const ics = buildIcs("가마쿠라", plan, "2026-10-10", "t1");
  it("時刻は日本時間(UTC+9)から UTC に直される", () => {
    // 出発 09:30 JST = 00:30 UTC
    expect(ics).toContain("DTSTART:20261010T003000Z");
  });
  it("駅 2 つ + スポット 2 つ = 4 件のイベント", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });
  it("CRLF で、75 バイトを超える行がない", () => {
    expect(ics.includes("\r\n")).toBe(true);
    const enc = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  });
  it("カンマ・セミコロンはエスケープされる", () => {
    expect(ics).toMatch(/LOCATION:.*\,/);
  });
  it("日付をまたいで UTC が前日になるケース(00:30 JST → 前日 15:30 UTC)", () => {
    const p = buildPlan({ start: kama.stations[0], end: kama.stations[0], spots: [], startTime: 30, endTime: 600, hints: kama.transit });
    expect(buildIcs("x", p, "2026-10-10", "t2")).toContain("DTSTART:20261009T153000Z");
  });
});

describe("buildKml", () => {
  const kml = buildKml("가마쿠라 일정", plan);
  it("経度,緯度の順で座標が入る", () => {
    expect(kml).toContain(`${kama.spots[0].lng},${kama.spots[0].lat},0`);
  });
  it("番号つきの名前と、順序の線が入る", () => {
    expect(kml).toContain("<name>1. 鶴岡八幡宮</name>");
    expect(kml).toContain("<LineString>");
  });
  it("特殊文字が XML エスケープされる", () => {
    expect(buildKml("a & b <c>", plan)).toContain("a &amp; b &lt;c&gt;");
  });
});

describe("nextSaturday", () => {
  it("常に今日より後の土曜日", () => {
    const d = new Date(nextSaturday(new Date(2026, 9, 8)) + "T00:00:00");
    expect(d.getDay()).toBe(6);
    expect(d.getDate()).toBe(10);
    expect(new Date(nextSaturday(new Date(2026, 9, 10)) + "T00:00:00").getDate()).toBe(17);
  });
});
