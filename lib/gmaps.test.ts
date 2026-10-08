import { describe, expect, it } from "vitest";
import { legUrl, nearbyFoodUrl, parseMapsInput, routeUrl, spotUrl } from "./gmaps";

const p = (id: string, lat: number, lng: number) => ({ id, ja: id, ko: id, lat, lng });

describe("parseMapsInput", () => {
  it("右クリックでコピーした座標を読める(カンマ・スペース区切り)", () => {
    expect(parseMapsInput("35.3258, 139.5566")).toEqual({ ok: true, lat: 35.3258, lng: 139.5566, name: undefined });
    expect(parseMapsInput("35.3258 139.5566")).toMatchObject({ ok: true, lat: 35.3258, lng: 139.5566 });
    expect(parseMapsInput("  35.3258,139.5566  ")).toMatchObject({ ok: true });
  });

  it("場所の URL から、場所の座標(!3d!4d)と名前を取る", () => {
    const url = "https://www.google.com/maps/place/%E9%B6%B4%E5%B2%A1%E5%85%AB%E5%B9%A1%E5%AE%AE/@35.3258,139.5566,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d35.3259!4d139.5567";
    expect(parseMapsInput(url)).toEqual({ ok: true, lat: 35.3259, lng: 139.5567, name: "鶴岡八幡宮" });
  });

  it("!3d が無ければ @緯度,経度 を使う", () => {
    const r = parseMapsInput("https://www.google.com/maps/place/Kamakura+Station/@35.3192,139.5503,16z");
    expect(r).toEqual({ ok: true, lat: 35.3192, lng: 139.5503, name: "Kamakura Station" });
  });

  it("?q=緯度,経度 の形式も読める", () => {
    expect(parseMapsInput("https://www.google.com/maps?q=35.31,139.55")).toMatchObject({ ok: true, lat: 35.31, lng: 139.55 });
    expect(parseMapsInput("https://www.google.com/maps/search/?api=1&query=35.31%2C139.55")).toMatchObject({ ok: true, lat: 35.31 });
  });

  it("短縮 URL は案内用のエラーにする", () => {
    expect(parseMapsInput("https://maps.app.goo.gl/AbCdEf123")).toEqual({ ok: false, reason: "short" });
  });

  it("日本の外・空・意味不明は弾く", () => {
    expect(parseMapsInput("48.8584, 2.2945")).toEqual({ ok: false, reason: "range" });
    expect(parseMapsInput("")).toEqual({ ok: false, reason: "empty" });
    expect(parseMapsInput("鎌倉大仏")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("URL builders", () => {
  it("近くの食事の検索 URL", () => {
    const u = new URL(nearbyFoodUrl(p("a", 35.3, 139.5)));
    expect(u.searchParams.get("api")).toBe("1");
    expect(u.searchParams.get("query")).toBe("restaurants near 35.3,139.5");
  });
  it("場所・経路 URL", () => {
    expect(spotUrl(p("a", 35.3, 139.5))).toContain("query=35.3%2C139.5");
    const r = new URL(routeUrl([p("a", 35, 139), p("b", 35.1, 139.1), p("c", 35.2, 139.2)]));
    expect(r.searchParams.get("waypoints")).toBe("35.1,139.1");
    expect(legUrl(p("a", 35, 139), p("b", 35.1, 139.1))).toContain("travelmode=transit");
  });
});
