# 設計メモ — 도쿄 근교 여행 지도

実装の全体像と、判断の理由が分かりにくい部分をまとめます。要件は [requirements.md](requirements.md) を参照してください。

## 1. 全体構成

サーバー処理のない単一ページのクライアントアプリです(`app/page.tsx` → `components/App.tsx`)。
状態はすべて `App` が `useState` で持ち、子コンポーネントに props で渡します。外部の状態管理ライブラリは使いません。

```
data/regions.ts ─┐
data/geo/*.json ─┼→ lib/(planner, geo, views, gmaps, export) → components/App.tsx → 各 UI
data/photo-credits.json ┘
```

- `data/` と `lib/` は UI に依存しない純粋なデータ・ロジックで、`lib/` は Vitest でテストします。
- 計算(`lib/`)と描画(`components/`)を分け、`useMemo` で入力が変わったときだけ再計算します。

## 2. シーンとカメラ

`App` の `scene` は `room → desk → japan → pref → area` の 5 段階です。

- 地図は「世界座標」(東日本全体の幅を 1000 とした平面)で描き、**カメラ = 中心 `(cx, cy)` と表示高さ `h`** で表します(`lib/views.ts`)。
- シーンごとに `fitView` / `kantoView` / `areaRect` / `focusView` でカメラを計算し、`motion` のスプリングで補間します。
- ノート(右側、モバイルでは下側)に隠れる領域は `reserve` で除外し、見える領域の中央に被写体が来るようにします。
- 机は CSS 3D(`perspective`)で傾けて表示し、地図を開くと真上(傾き 0)に戻します。

## 3. 紙の地図と実際の地図

- 紙の地図は `d3-geo` の `geoMercator`(= ウェブメルカトル)で投影し、`PaperMap`(three.js のシェーダー)で紙の質感を付けて描画します。
- 実際の地図(`RealMap`)は OpenStreetMap のタイルを同じカメラで重ねます。両方がウェブメルカトルなので、世界座標 → 緯度経度 → タイル座標の変換だけで同じ位置・縮尺になり、クロスフェードするだけで切り替わります。
- ピンと毛糸は地図ではなく画面上の DOM として描くため、切り替えても位置がずれません。

## 4. 日程の計算(`lib/planner.ts`)

### 4.1 移動時間 `travel`

1. `transit` に 2 地点のヒント(分)があればそれを使う
2. なければ直線距離(haversine)から推定する
   - 1.2km 以内: 徒歩(直線距離の 1.3 倍 ÷ 4.5km/h)
   - それ以上: 電車(待ち 8 分 + 直線距離の 1.4 倍 ÷ 22km/h)

### 4.2 時刻表の積み上げ `simulate`

出発駅から順にスポットを回り、各スポットで以下を計算します。

- 到着 = 前の出発 + 移動時間、開館前なら開館まで待つ
- 出発 = 到着 + 待ち + 滞在
- 閉館に間に合わなければペナルティ(200 + 超過分)、開館前に 90 分超待つならペナルティ 120
- 昼食: 設定時刻以降の最初の区切りで挿入。締切(14:00)を過ぎていれば取らない

### 4.3 順序の最適化 `optimizeOrder`

- スポット 8 件以下: 全順列を試して「到着時刻 + ペナルティ」が最小の順序を採用
- 9 件以上: 最近傍法で初期解を作り、2-opt で改善

### 4.4 提案

| 関数 | 役割 |
| --- | --- |
| `suggestAddition` | 余り 45 分以上のとき、収まり、問題がなく、増える時間が最少の追加スポットを返す。定番ほど優先 |
| `suggestRemoval` | 超過時に、優先度が低く削ると最も時間が減るスポットを返す |
| `suggestOrder` | 10 分以上短縮、または営業時間の問題が減る順序があるときだけ返す |

`App` は `keepOrder: true` で計画を作るため、**ユーザーが決めた順序は勝手に変わりません**。順序の入れ替えは `suggestOrder` の提案を承認したときだけ行います。

## 5. Google との連携(API キー不要)

| 用途 | 方法 | 実装 |
| --- | --- | --- |
| 経路・検索を開く | Maps URLs(`https://www.google.com/maps/dir/?api=1...`) | `lib/gmaps.ts` |
| 独自スポットの取り込み | ユーザーが貼った Google マップ URL / 座標をブラウザ内で解析 | `parseMapsInput` |
| 行程を地図に持ち出す | KML ファイル → Google マイマップでインポート | `lib/export.ts` `buildKml` |
| 行程をカレンダーに持ち出す | ICS ファイル → Google カレンダーでインポート | `lib/export.ts` `buildIcs` |

- 全行程の経路 URL は徒歩を既定にしています。Maps URLs の `waypoints` は公式の上限が 9 件(モバイルブラウザでは 3 件)で、`transit` では無視されることがあるためです。電車・バスは区間ごと(`legUrl`)に開きます。
- 短縮 URL(`maps.app.goo.gl`)はブラウザから展開できないため、解析せずに利用者へ案内します。

## 6. データ生成スクリプト

| スクリプト | 内容 |
| --- | --- |
| `scripts/build-geo.mjs` | smartnews-smri/japan-topography から N03 の GeoJSON を取得し、mapshaper で簡略化して `data/geo/` に出力 |
| `scripts/fetch-photos.mjs` | `data/regions.ts` の各スポットについて Wikipedia の代表画像を取得し、Commons でライセンスを確認。許可ライセンスのみ `public/photos/` に保存し、`photo-credits.json` を更新。あわせて Wikipedia 座標との差を報告 |

## 7. 静的エクスポートと BASE_PATH

- `next.config.ts` は `output: "export"`、`trailingSlash: true`、`images.unoptimized: true`。
- GitHub Pages ではサブパス(`/map`)配下になるため、`BASE_PATH` を `basePath` / `assetPrefix` と `NEXT_PUBLIC_BASE_PATH` に渡します。
- `public/` 配下を参照するコード(写真・木目テクスチャ)は、`NEXT_PUBLIC_BASE_PATH` を前置してパスを組み立てます。**新しく `public/` の画像を参照するときは同じ扱いにしてください。**

## 8. テスト

| ファイル | 対象 |
| --- | --- |
| `lib/planner.test.ts` | 移動時間、時刻表、昼食、営業時間のペナルティ、順序最適化、各提案 |
| `lib/gmaps.test.ts` | Google マップ URL・座標の解析と URL 生成 |
| `lib/export.test.ts` | KML / ICS の生成 |

UI コンポーネントのテストは未整備です。`vitest.config.ts` の対象は `lib/**/*.test.ts` です。

## 9. 既知の注意点

- 状態は永続化しません(リロードで初期化)。
- 初期の日付(次の土曜日)は現在時刻に依存するため、ハイドレーション不一致を避けてマウント後に設定します。
- OSM のタイルは [タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/) に従って利用し、帰属表示(`RealMap`)を外さないでください。
