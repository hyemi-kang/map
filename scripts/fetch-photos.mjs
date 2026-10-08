// 各スポットの写真を Wikipedia(日本語)の代表画像から取得し、Wikimedia Commons でライセンスを確認して保存する。
// 使える画像: CC BY / CC BY-SA / CC0 / パブリックドメイン のみ。NC・ND・フェアユースは除外する。
// あわせて Wikipedia の座標を取得し、data/regions.ts の座標との差を報告する(座標の検証用)。
// 実行: NODE_OPTIONS=--use-system-ca npm run photos
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "photos");
mkdirSync(outDir, { recursive: true });

// regions.ts は TypeScript なので、一時ファイル(CommonJS)に変換してから読み込む
const require = createRequire(import.meta.url);
const ts = require("typescript");
const src = readFileSync(join(root, "data", "regions.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const tmp = join(os.tmpdir(), "tokyo-trip-regions.cjs");
writeFileSync(tmp, js);
const { AREAS } = require(tmp);

// Wikipedia の記事名が日本語表記と違うもの
const TITLE = {
  hasedera: "長谷寺 (鎌倉市)",
  kotokuin: "高徳院",
  tsurugaoka: "鶴岡八幡宮",
  komachi: "小町通り (鎌倉市)",
  "enoshima-jinja": "江島神社",
  "sea-candle": "江の島シーキャンドル",
  iwaya: "江の島岩屋",
  kamakurakokomae: "鎌倉高校前駅",
  yuigahama: "由比ヶ浜",
  kenchoji: "建長寺",
  meigetsuin: "明月院",
  enkakuji: "円覚寺",
  hokokuji: "報国寺 (鎌倉市)",
  zeniarai: "銭洗弁財天宇賀福神社",
  akarenga: "横浜赤レンガ倉庫",
  yamashita: "山下公園",
  chukagai: "横浜中華街",
  landmark: "横浜ランドマークタワー",
  cupnoodles: "カップヌードルミュージアム",
  minatonomieru: "港の見える丘公園",
  sankeien: "三渓園",
  odawarajo: "小田原城",
  hakonejinja: "箱根神社",
  ashinoko: "芦ノ湖",
  owakudani: "大涌谷",
  chokoku: "箱根彫刻の森美術館",
  goraparkm: "強羅公園",
  mikasa: "三笠 (戦艦)",
  verny: "ヴェルニー公園",
  misaki: "三崎港",
  jogashima: "城ヶ島",
  kannonzaki: "観音崎公園",
  sensoji: "浅草寺",
  skytree: "東京スカイツリー",
  "ueno-park": "上野恩賜公園",
  ameyoko: "アメヤ横丁",
  tnm: "東京国立博物館",
  "sumida-park": "隅田公園",
  scramble: "渋谷スクランブル交差点",
  "shibuya-sky": "渋谷スクランブルスクエア",
  meiji: "明治神宮",
  takeshita: "竹下通り",
  omotesando: "表参道",
  yoyogi: "代々木公園",
  gyoen: "新宿御苑",
  tocho: "東京都庁舎",
  omoide: "思い出横丁",
  hanazono: "花園神社 (新宿区)",
  kabukicho: "歌舞伎町",
  "tokyo-station": "東京駅",
  kokyo: "皇居外苑",
  ginza4: "銀座",
  tsukiji: "築地場外市場",
  hibiya: "日比谷公園",
  statue: "お台場海浜公園",
  gundam: "ダイバーシティ東京プラザ",
  teamlab: "チームラボプラネッツ",
  toyosu: "豊洲市場",
  kiyotaki: "高尾山ケーブルカー",
  yakuoin: "高尾山薬王院",
  "takao-top": "高尾山",
  beermount: "高尾山",
  shinshoji: "成田山新勝寺",
  "omotesando-narita": "成田山新勝寺",
  "narita-park": "成田山公園",
  "boso-mura": "千葉県立房総のむら",
  aviation: "航空科学博物館",
  onogawa: "佐原の町並み",
  inocho: "伊能忠敬旧宅",
  katori: "香取神宮",
  nihonji: "日本寺",
  "nokogiri-rope": "鋸山ロープウェー",
  nojima: "野島埼灯台",
  tateyamajo: "館山城",
  seaworld: "鴨川シーワールド",
  osenzara: "大山千枚田",
  tanjoji: "誕生寺 (鴨川市)",
  kurazukuri: "川越一番街",
  tokinokane: "時の鐘 (川越市)",
  kashiya: "菓子屋横丁",
  kitain: "喜多院",
  "hikawa-kawagoe": "川越氷川神社",
  "chichibu-jinja": "秩父神社",
  hitsujiyama: "羊山公園",
  mitsumine: "三峯神社",
  iwadatami: "長瀞渓谷",
  linekudari: "長瀞ライン下り",
  hodosan: "宝登山神社",
  "railway-museum": "鉄道博物館 (さいたま市)",
  "hikawa-omiya": "氷川神社 (さいたま市大宮区)",
  bonsai: "さいたま市大宮盆栽美術館",
};
// 画像が無かったものの代替記事名
Object.assign(TITLE, {
  komachi: "小町通り",
  iwaya: "江の島",
  cupnoodles: "安藤百福発明記念館",
  misaki: "三崎漁港",
  omotesando: "表参道 (東京都)",
  hanazono: "花園神社",
  "narita-park": "成田山公園",
  nihonji: "日本寺 (鋸南町)",
  kurazukuri: "川越市",
  linekudari: "長瀞町",
  "hikawa-omiya": "武蔵一宮氷川神社",
  mikasa: "記念艦三笠",
});

const ALLOWED = [/^cc[- ]by(?![- ]n)/i, /^cc[- ]by-sa/i, /^cc0/i, /public domain/i, /^pd/i];
const API = "https://ja.wikipedia.org/w/api.php";
const UA = { "User-Agent": "tokyo-trip-board/0.1 (educational project; contact kan_hemi@sun-m.co.jp)" };

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const strip = (html) => (html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function lookup(title) {
  const q = new URLSearchParams({
    action: "query", format: "json", redirects: "1", titles: title,
    prop: "pageimages|coordinates", piprop: "original|name", pilicense: "free", colimit: "1",
  });
  const data = await getJson(`${API}?${q}`);
  const page = Object.values(data.query.pages)[0];
  const file = page.pageimage;
  const coord = page.coordinates?.[0];
  return { title: page.title, file, original: page.original?.source, lat: coord?.lat, lng: coord?.lon };
}

async function license(file) {
  const q = new URLSearchParams({
    action: "query", format: "json", titles: `File:${file}`, prop: "imageinfo",
    iiprop: "extmetadata|url", iiurlwidth: "900",
  });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${q}`);
  const info = Object.values(data.query.pages)[0].imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  return {
    thumb: info.thumburl,
    page: info.descriptionurl,
    license: strip(m.LicenseShortName?.value),
    author: strip(m.Artist?.value) || "不明",
    title: strip(m.ObjectName?.value) || file,
  };
}

const km = (a, b) => {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
};

const creditsFile = join(root, "data", "photo-credits.json");
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, "utf8")) : {};
const report = { noPage: [], noImage: [], badLicense: [], coordFar: [] };

const spots = AREAS.flatMap((a) => a.spots);
for (const spot of spots) {
  const title = TITLE[spot.id] ?? spot.ja.replace(/（.*?）/g, "");
  try {
    const r = await lookup(title);
    if (r.lat != null && km([spot.lat, spot.lng], [r.lat, r.lng]) > 0.6) {
      report.coordFar.push(`${spot.id} (${spot.ja}): data=${spot.lat},${spot.lng} wiki=${r.lat.toFixed(4)},${r.lng.toFixed(4)} ${km([spot.lat, spot.lng], [r.lat, r.lng]).toFixed(1)}km [${r.title}]`);
    }
    if (credits[spot.id] && existsSync(join(outDir, credits[spot.id].file))) continue;
    if (!r.file) { report.noImage.push(`${spot.id} (${r.title})`); continue; }
    const lic = await license(r.file);
    if (!lic || !ALLOWED.some((re) => re.test(lic.license))) { report.badLicense.push(`${spot.id}: ${lic?.license ?? "?"}`); continue; }
    const img = await fetch(lic.thumb, { headers: UA });
    if (!img.ok) throw new Error(`image ${img.status}`);
    const file = `${spot.id}.jpg`;
    writeFileSync(join(outDir, file), Buffer.from(await img.arrayBuffer()));
    credits[spot.id] = { file, author: lic.author, license: lic.license, source: lic.page, title: lic.title };
    console.log("ok", spot.id, lic.license);
  } catch (e) {
    report.noPage.push(`${spot.id} (${title}): ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 120));
}

writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
console.log("\n=== report ===");
for (const [k, v] of Object.entries(report)) console.log(k, v.length, "\n  " + v.join("\n  "));
console.log(`photos: ${Object.keys(credits).length}/${spots.length}`);
