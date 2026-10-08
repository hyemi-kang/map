import { describe, expect, it } from "vitest";
import { AREAS, areaById } from "@/data/regions";
import { buildPlan, optimizeOrder, parseTime, suggestAddition, suggestRemoval, travel } from "./planner";

const kama = areaById("kamakura-enoshima");
const st = (id: string) => kama.stations.find((s) => s.id === id)!;
const sp = (id: string) => kama.spots.find((s) => s.id === id)!;

const base = {
  start: st("st-kamakura"),
  end: st("st-kamakura"),
  startTime: parseTime("09:30"),
  endTime: parseTime("17:30"),
  hints: kama.transit,
};

describe("travel", () => {
  it("近いと徒歩、遠いと電車になる", () => {
    expect(travel(st("st-kamakura"), sp("komachi"), kama.transit).mode).toBe("walk");
    expect(travel(st("st-kamakura"), st("st-enoshima"), kama.transit).mode).toBe("train");
  });
  it("hints があれば距離推定より優先する", () => {
    expect(travel(st("st-kamakura"), st("st-hase"), kama.transit).minutes).toBe(5);
    expect(travel(st("st-hase"), st("st-kamakura"), kama.transit).minutes).toBe(5);
  });
});

describe("buildPlan", () => {
  it("始点と終点は駅で固定される", () => {
    const plan = buildPlan({ ...base, spots: [sp("tsurugaoka"), sp("kotokuin"), sp("hasedera")] });
    expect(plan.items[0].place.id).toBe("st-kamakura");
    expect(plan.items.at(-1)!.place.id).toBe("st-kamakura");
    expect(plan.items).toHaveLength(5);
    expect(plan.legs).toHaveLength(4);
  });

  it("総移動時間が全順列の最小になる", () => {
    const spots = [sp("tsurugaoka"), sp("kotokuin"), sp("hasedera"), sp("komachi"), sp("yuigahama")];
    const best = optimizeOrder(base.start, spots, base.end, base.startTime, base.hints);
    const total = (order: typeof spots) => buildPlan({ ...base, spots: order, keepOrder: true }).arrival;
    const perms = (a: typeof spots): (typeof spots)[] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
    const min = Math.min(...perms(spots).map(total));
    expect(total(best)).toBe(min);
  });

  it("営業開始前に着くなら待ち時間を入れる", () => {
    const plan = buildPlan({ ...base, startTime: parseTime("06:00"), spots: [sp("kotokuin")], keepOrder: true });
    const item = plan.items[1];
    expect(item.wait).toBeGreaterThan(0);
    expect(item.depart).toBe(sp("kotokuin").open + sp("kotokuin").stay);
  });

  it("終了時刻を超えたら overBy と警告が出る", () => {
    const plan = buildPlan({ ...base, endTime: parseTime("11:00"), spots: [sp("tsurugaoka"), sp("kotokuin"), sp("hasedera")] });
    expect(plan.overBy).toBeGreaterThan(0);
    expect(plan.slack).toBe(0);
    expect(plan.issues.length).toBeGreaterThan(0);
  });
});

describe("suggestAddition", () => {
  const input = { ...base, spots: [sp("tsurugaoka")] };

  it("余りが十分なら、収まる候補を 1 件提案する", () => {
    const s = suggestAddition(input, kama.spots, new Set());
    expect(s).not.toBeNull();
    expect(s!.spot.id).not.toBe("tsurugaoka");
    expect(s!.plan.overBy).toBe(0);
  });

  it("断った候補は二度と出ない", () => {
    const rejected = new Set<string>();
    const seen: string[] = [];
    for (let i = 0; i < kama.spots.length; i++) {
      const s = suggestAddition(input, kama.spots, rejected);
      if (!s) break;
      expect(seen).not.toContain(s.spot.id);
      seen.push(s.spot.id);
      rejected.add(s.spot.id);
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(suggestAddition(input, kama.spots, new Set(kama.spots.map((x) => x.id)))).toBeNull();
  });

  it("余りが少ないときは提案しない", () => {
    const tight = { ...input, endTime: parseTime("11:00") };
    expect(suggestAddition(tight, kama.spots, new Set())).toBeNull();
  });
});

describe("suggestRemoval", () => {
  it("時間超過のとき、優先度の低いものを外す候補にする", () => {
    const spots = [sp("tsurugaoka"), sp("kotokuin"), sp("enkakuji"), sp("hokokuji")];
    const input = { ...base, endTime: parseTime("13:00"), spots };
    const r = suggestRemoval(input);
    expect(r).not.toBeNull();
    expect(r!.priority).toBeGreaterThanOrEqual(2);
  });
  it("超過していなければ null", () => {
    expect(suggestRemoval({ ...base, spots: [sp("komachi")] })).toBeNull();
  });
});

describe("data", () => {
  it("全エリアのスポット営業時間と滞在時間が妥当", () => {
    for (const a of AREAS) {
      expect(a.stations.length).toBeGreaterThan(0);
      for (const s of a.spots) {
        expect(s.close).toBeGreaterThan(s.open);
        expect(s.stay).toBeGreaterThan(0);
      }
    }
  });
});
