import { haversineKm } from "./geo";
import type { Place, Spot, Station } from "@/data/types";

/** 移動時間の目安(分)。公式の時刻表ではなく、距離からの推定 */
export const WALK_KMH = 4.5;
export const TRAIN_KMH = 22;
export const WALK_MAX_KM = 1.2;
export const TRANSIT_WAIT_MIN = 8;
/** この分数以上の余りがあるときに追加スポットを提案する */
export const SLACK_SUGGEST_MIN = 45;

export type Hints = Record<string, number> | undefined;
export type Mode = "walk" | "train";

export type Leg = { fromId: string; toId: string; minutes: number; mode: Mode; km: number };

export type Item = {
  place: Place;
  kind: "start" | "spot" | "end";
  arrive: number;
  /** 営業開始まで待つ時間 */
  wait: number;
  depart: number;
  stay: number;
  /** 営業時間外になる場合の問題 */
  issue?: "closed-before" | "closes-early";
};

export type Plan = {
  items: Item[];
  legs: Leg[];
  /** 終点の駅に着く時刻 */
  arrival: number;
  /** 終了時刻を超えた分(超えていなければ 0) */
  overBy: number;
  /** 終了時刻までの余り(超えていれば 0) */
  slack: number;
  walkKm: number;
  issues: string[];
};

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function travel(a: Place, b: Place, hints: Hints): Leg {
  const km = haversineKm([a.lng, a.lat], [b.lng, b.lat]);
  const hint = hints?.[key(a.id, b.id)];
  if (hint != null) return { fromId: a.id, toId: b.id, minutes: hint, mode: hint <= 12 && km <= WALK_MAX_KM * 1.5 ? "walk" : "train", km };
  if (km <= WALK_MAX_KM) return { fromId: a.id, toId: b.id, minutes: Math.max(1, Math.round(((km * 1.3) / WALK_KMH) * 60)), mode: "walk", km };
  return { fromId: a.id, toId: b.id, minutes: Math.round(TRANSIT_WAIT_MIN + ((km * 1.4) / TRAIN_KMH) * 60), mode: "train", km };
}

type Sim = { items: Item[]; legs: Leg[]; arrival: number; penalty: number };

/** 順序を決めたときの時刻表を積み上げる。営業開始前なら待ち、閉館に間に合わなければペナルティ */
function simulate(start: Station, order: Spot[], end: Station, startTime: number, hints: Hints): Sim {
  const items: Item[] = [{ place: start, kind: "start", arrive: startTime, wait: 0, depart: startTime, stay: 0 }];
  const legs: Leg[] = [];
  let t = startTime;
  let penalty = 0;
  let prev: Place = start;
  for (const s of order) {
    const leg = travel(prev, s, hints);
    legs.push(leg);
    const arrive = t + leg.minutes;
    const wait = Math.max(0, s.open - arrive);
    const depart = arrive + wait + s.stay;
    let issue: Item["issue"];
    if (arrive < s.open && wait > 90) {
      issue = "closed-before";
      penalty += 120;
    }
    if (depart > s.close) {
      issue = "closes-early";
      penalty += 200 + (depart - s.close);
    }
    items.push({ place: s, kind: "spot", arrive, wait, depart, stay: s.stay, issue });
    t = depart;
    prev = s;
  }
  const last = travel(prev, end, hints);
  legs.push(last);
  const arrival = t + last.minutes;
  items.push({ place: end, kind: "end", arrive: arrival, wait: 0, depart: arrival, stay: 0 });
  return { items, legs, arrival, penalty };
}

function* permutations<T>(arr: T[]): Generator<T[]> {
  const a = arr.slice();
  const c = new Array(a.length).fill(0);
  yield a.slice();
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) {
      const j = i % 2 === 0 ? 0 : c[i];
      [a[j], a[i]] = [a[i], a[j]];
      yield a.slice();
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

const cost = (s: Sim) => s.arrival + s.penalty;

/** 始点・終点の駅を固定したまま、訪問順を最適化する */
export function optimizeOrder(start: Station, spots: Spot[], end: Station, startTime: number, hints: Hints): Spot[] {
  if (spots.length <= 1) return spots.slice();
  if (spots.length <= 8) {
    let best = spots;
    let bestCost = Infinity;
    for (const p of permutations(spots)) {
      const c = cost(simulate(start, p, end, startTime, hints));
      if (c < bestCost) {
        bestCost = c;
        best = p;
      }
    }
    return best;
  }
  // 多いときは最近傍法 → 2-opt
  const remaining = spots.slice();
  const order: Spot[] = [];
  let cur: Place = start;
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((s, i) => {
      const d = travel(cur, s, hints).minutes;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const next = remaining.splice(bi, 1)[0];
    order.push(next);
    cur = next;
  }
  let improved = true;
  let bestC = cost(simulate(start, order, end, startTime, hints));
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
        const c = cost(simulate(start, cand, end, startTime, hints));
        if (c < bestC) {
          bestC = c;
          order.splice(0, order.length, ...cand);
          improved = true;
        }
      }
    }
  }
  return order;
}

export type PlanInput = {
  start: Station;
  end: Station;
  spots: Spot[];
  startTime: number;
  endTime: number;
  hints?: Record<string, number>;
  /** true なら spots の並びをそのまま使う */
  keepOrder?: boolean;
};

export function buildPlan(input: PlanInput): Plan {
  const { start, end, startTime, endTime, hints } = input;
  const order = input.keepOrder ? input.spots : optimizeOrder(start, input.spots, end, startTime, hints);
  const sim = simulate(start, order, end, startTime, hints);
  const issues: string[] = [];
  for (const it of sim.items) {
    if (it.issue === "closes-early") issues.push(`${it.place.ko}은(는) 도착·관람 시간대에 문을 닫을 수 있어요.`);
    if (it.issue === "closed-before") issues.push(`${it.place.ko}은(는) 열기 전에 도착해 오래 기다려야 해요.`);
  }
  const overBy = Math.max(0, sim.arrival - endTime);
  const slack = Math.max(0, endTime - sim.arrival);
  if (overBy > 0) issues.push(`돌아오는 시간이 ${overBy}분 늦어져요.`);
  return {
    items: sim.items,
    legs: sim.legs,
    arrival: sim.arrival,
    overBy,
    slack,
    walkKm: sim.legs.filter((l) => l.mode === "walk").reduce((s, l) => s + l.km * 1.3, 0),
    issues,
  };
}

export type Suggestion = { spot: Spot; plan: Plan; addedMin: number };

/** 余り時間に収まり、営業時間内で、増える時間が最も少ない候補を 1 件返す。なければ null */
export function suggestAddition(input: PlanInput, candidates: Spot[], rejected: ReadonlySet<string>): Suggestion | null {
  const base = buildPlan(input);
  if (base.overBy > 0 || base.slack < SLACK_SUGGEST_MIN) return null;
  const chosen = new Set(input.spots.map((s) => s.id));
  let best: Suggestion | null = null;
  for (const c of candidates) {
    if (chosen.has(c.id) || rejected.has(c.id)) continue;
    const plan = buildPlan({ ...input, spots: [...input.spots, c] });
    const item = plan.items.find((i) => i.place.id === c.id);
    if (plan.overBy > 0 || plan.issues.length > 0 || !item || item.issue) continue;
    const added = plan.arrival - base.arrival;
    // 同じくらいなら定番(priority が小さい方)を先に出す
    if (!best || added + c.priority * 3 < best.addedMin + best.spot.priority * 3) best = { spot: c, plan, addedMin: added };
  }
  return best;
}

/** 時間を超えたときに外す候補(優先度が低く、外すと最も時間が減るもの) */
export function suggestRemoval(input: PlanInput): Spot | null {
  const base = buildPlan(input);
  if (base.overBy === 0 || input.spots.length === 0) return null;
  let best: { spot: Spot; saved: number } | null = null;
  for (const s of input.spots) {
    const plan = buildPlan({ ...input, spots: input.spots.filter((x) => x.id !== s.id) });
    const saved = base.arrival - plan.arrival;
    const score = saved + s.priority * 25;
    if (!best || score > best.saved + best.spot.priority * 25) best = { spot: s, saved };
  }
  return best?.spot ?? null;
}

export const fmtTime = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const parseTime = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
