// 東日本の都県境界と、東京・神奈川・千葉・埼玉の市区町村境界を取得して簡略化する。
// 出典: smartnews-smri/japan-topography（国土数値情報 行政区域データ N03 を加工したもの）
// 実行: NODE_OPTIONS=--use-system-ca npm run geo
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data", "geo");
const work = join(tmpdir(), "tokyo-trip-geo");
mkdirSync(outDir, { recursive: true });
mkdirSync(work, { recursive: true });

const BASE =
  "https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010";
const mapshaper = join(root, "node_modules", "mapshaper", "bin", "mapshaper");

async function download(name, dest) {
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function simplify(src, dest, pct, extra = []) {
  execFileSync(
    process.execPath,
    [mapshaper, src, ...extra, "-simplify", `${pct}%`, "keep-shapes", "-o", dest, "format=geojson", "precision=0.0005", "force"],
    { stdio: "inherit" },
  );
}

// 東日本として表示する都県（北海道・関西以西は除く）
const EAST = [
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県",
  "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県",
];
const FOCUS = { 11: "saitama", 12: "chiba", 13: "tokyo", 14: "kanagawa" };

// 1. 都県境界
const prefsRaw = join(work, "prefectures.json");
await download("prefectures.json", prefsRaw);
const prefs = JSON.parse(readFileSync(prefsRaw, "utf8"));
prefs.features = prefs.features.filter((f) => EAST.includes(f.properties.N03_001));
const prefsFiltered = join(work, "prefs-east.json");
writeFileSync(prefsFiltered, JSON.stringify(prefs));
simplify(prefsFiltered, join(outDir, "east-japan.json"), 4);

// 2. 市区町村境界（4都県）
for (const [code, id] of Object.entries(FOCUS)) {
  const raw = join(work, `m${code}.json`);
  await download(`N03-21_${code}_210101.json`, raw);
  const gj = JSON.parse(readFileSync(raw, "utf8"));
  // 所属未定地・離島（東京の島嶼部）は地図の見栄えを損なうので除く
  gj.features = gj.features.filter(
    (f) => f.properties.N03_007 && !["13361", "13362", "13363", "13364", "13381", "13382", "13401", "13402", "13421"].includes(f.properties.N03_007),
  );
  const filtered = join(work, `m${code}-f.json`);
  writeFileSync(filtered, JSON.stringify(gj));
  simplify(filtered, join(outDir, `${id}.json`), 30);
}

// 3. 4 都県の外形は市区町村を溶かして作り直す(海岸線が市区町村の境界データと食い違わないように)
{
  const eastFile = join(outDir, "east-japan.json");
  const eastGj = JSON.parse(readFileSync(eastFile, "utf8"));
  for (const [code, id] of Object.entries(FOCUS)) {
    const dissolved = join(work, `d${code}.json`);
    execFileSync(process.execPath, [mapshaper, join(outDir, `${id}.json`), "-dissolve", "-o", dissolved, "format=geojson", "precision=0.0005", "force"], { stdio: "inherit" });
    const out = JSON.parse(readFileSync(dissolved, "utf8"));
    // 属性が無いと mapshaper は FeatureCollection ではなく図形だけを書き出す
    const geom =
      out.type === "FeatureCollection" ? out.features[0].geometry : out.type === "GeometryCollection" ? out.geometries[0] : out;
    const name = { 11: "埼玉県", 12: "千葉県", 13: "東京都", 14: "神奈川県" }[code];
    const f = eastGj.features.find((x) => x.properties.N03_001 === name);
    f.geometry = geom;
  }
  writeFileSync(eastFile, JSON.stringify(eastGj));
}

// d3-geo は外周が時計回りであることを前提にする(GeoJSON 標準は反時計回り)ので、全ての環を反転する
const flip = (g) => {
  if (g.type === "Polygon") g.coordinates = g.coordinates.map((r) => r.slice().reverse());
  else if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map((p) => p.map((r) => r.slice().reverse()));
};
for (const name of ["east-japan", ...Object.values(FOCUS)]) {
  const file = join(outDir, `${name}.json`);
  const gj = JSON.parse(readFileSync(file, "utf8"));
  gj.features.forEach((f) => flip(f.geometry));
  writeFileSync(file, JSON.stringify(gj));
}

console.log("done ->", outDir);
