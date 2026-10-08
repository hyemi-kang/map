import { describe, expect, it } from "vitest";
import { AREAS, areaById } from "@/data/regions";
import { buildPlan, optimizeOrder, parseTime, suggestAddition, suggestOrder, suggestRemoval, travel } from "./planner";

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

describe("lunch", () => {
  const lunch = { at: 11 * 60 + 30, latest: 14 * 60, stay: 60 };
  const spots = [sp("tsurugaoka"), sp("kotokuin"), sp("hasedera"), sp("komachi")];

  it("昼食は 11:30 以降の最初の区切りで入る", () => {
    const plan = buildPlan({ ...base, spots, lunch });
    const idx = plan.items.findIndex((i) => i.kind === "meal");
    expect(idx).toBeGreaterThan(0);
    const meal = plan.items[idx];
    expect(meal.depart - meal.arrive).toBe(60);
    expect(meal.arrive).toBeGreaterThanOrEqual(11 * 60 + 30);
    // 昼食の直前の場所と同じ座標(移動しない)
    expect(meal.place.lat).toBe(plan.items[idx - 1].place.lat);
    expect(plan.legs[idx - 1].minutes).toBe(0);
    // 区間の数は常に「件数 - 1」
    expect(plan.legs).toHaveLength(plan.items.length - 1);
  });

  it("昼食なしの設定なら入らない", () => {
    expect(buildPlan({ ...base, spots, lunch: null }).items.some((i) => i.kind === "meal")).toBe(false);
  });

  it("昼食の分だけ終了時刻が後ろにずれる", () => {
    const a = buildPlan({ ...base, spots, lunch: null }).arrival;
    const b = buildPlan({ ...base, spots, lunch }).arrival;
    expect(b - a).toBe(60);
  });

  it("14:00 を過ぎてから始めるなら昼食は入れない", () => {
    const plan = buildPlan({ ...base, startTime: parseTime("14:30"), endTime: parseTime("20:00"), spots: [sp("komachi")], lunch });
    expect(plan.items.some((i) => i.kind === "meal")).toBe(false);
  });
});

describe("suggestOrder / keepOrder", () => {
  // わざと遠回りになる並び(鎌倉 → 江ノ島 → 鎌倉大仏 → 鶴岡八幡宮 → 小町通り)
  const messy = [sp("enoshima-jinja"), sp("tsurugaoka"), sp("kotokuin"), sp("komachi")];

  it("keepOrder なら、ユーザーが選んだ順序のまま時刻表を作る", () => {
    const plan = buildPlan({ ...base, spots: messy, keepOrder: true });
    expect(plan.items.filter((i) => i.kind === "spot").map((i) => i.place.id)).toEqual(messy.map((s) => s.id));
  });

  it("より良い順序があれば提案し、適用すると到着が早まる", () => {
    const input = { ...base, spots: messy, keepOrder: true };
    const s = suggestOrder(input);
    expect(s).not.toBeNull();
    expect(s!.savedMin).toBeGreaterThanOrEqual(10);
    const applied = buildPlan({ ...input, spots: s!.order, keepOrder: true });
    expect(applied.arrival).toBeLessThan(buildPlan(input).arrival);
    // 同じ場所の集合
    expect(s!.order.map((x) => x.id).sort()).toEqual(messy.map((x) => x.id).sort());
  });

  it("すでに良い順序なら提案しない", () => {
    const best = optimizeOrder(base.start, messy, base.end, base.startTime, base.hints);
    expect(suggestOrder({ ...base, spots: best, keepOrder: true })).toBeNull();
  });

  it("1 か所だけなら提案しない", () => {
    expect(suggestOrder({ ...base, spots: [sp("komachi")], keepOrder: true })).toBeNull();
  });

  it("追加提案は、今の順序を崩さない位置に差し込む", () => {
    const input = { ...base, spots: [sp("tsurugaoka"), sp("kotokuin")], keepOrder: true };
    const s = suggestAddition(input, kama.spots, new Set());
    expect(s).not.toBeNull();
    const ids = s!.plan.items.filter((i) => i.kind === "spot").map((i) => i.place.id);
    expect(ids.indexOf("tsurugaoka")).toBeLessThan(ids.indexOf("kotokuin"));
    expect(ids[s!.index]).toBe(s!.spot.id);
  });
});
