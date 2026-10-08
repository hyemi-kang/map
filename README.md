# 도쿄 근교 여행 지도 (tokyo-trip-board)

部屋の机に座り、紙の地図を広げて、東京近郊(東京・神奈川・千葉・埼玉)の日帰り旅行の行程を組み立てる Web アプリです。
地図からエリアを選び、行きたいスポットを選ぶと、移動時間・営業時間・昼食を考慮した 1 日のスケジュールが自動で組まれます。
完成した行程は Google マイマップ(KML)や Google カレンダー(ICS)に持ち出せます。

UI の言語は韓国語、地名・スポット名は日本語と韓国語を併記しています。

## 主な機能

- **没入型の導線**: 部屋 → 机に座る → 日本地図 → 都県 → エリア、とカメラが寄っていく
- **紙の地図 ⇄ 実際の地図**: 同じカメラで OpenStreetMap のタイルをクロスフェードで重ねる
- **エリアとスポット**: 4 都県・18 エリア。スポットごとに滞在時間・営業時間・カテゴリ・優先度を保持
- **日程の自動作成**: 出発駅・到着駅・開始/終了時刻・昼食を指定すると、時刻表と移動手段(徒歩/電車)を算出
- **提案**: 余り時間に収まる追加スポット / 時間超過時に外す候補 / 移動が短くなる推奨順序
- **営業時間のチェック**: 閉館に間に合わない・開館前に長く待つ場合は警告
- **スポットの追加**: Google マップの URL や座標を貼り付けて独自の場所を追加(API キー不要)
- **書き出し**: Google マップの経路 URL、KML、ICS
- **写真**: スポットごとの写真(Wikimedia Commons、CC ライセンスのみ)と出典表記

詳細は [docs/requirements.md](docs/requirements.md)、設計は [docs/architecture.md](docs/architecture.md) を参照してください。

## 技術スタック

| 区分 | 使用技術 |
| --- | --- |
| フレームワーク | Next.js 15(App Router、静的エクスポート)、React 19、TypeScript |
| スタイル | Tailwind CSS 4、`@fontsource`(Nanum Pen Script / Gaegu / Yusei Magic) |
| アニメーション・3D | motion、three.js(地図シェーダー)、CSS 3D |
| 地図データ | d3-geo(Mercator 投影)、国土数値情報由来の GeoJSON(mapshaper で簡略化) |
| テスト | Vitest(`lib/` 配下のロジック) |

## セットアップ

必要なもの: Node.js 22 以上(CI は Node 22)、npm

```bash
npm install
npm run dev      # http://localhost:3000
```

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー(Turbopack) |
| `npm run build` | 静的ビルド(`out/` に出力) |
| `npm run lint` | 型チェック(`tsc --noEmit`) |
| `npm test` | 単体テスト(Vitest) |
| `npm run geo` | 行政区域の GeoJSON を取得して `data/geo/` を再生成 |
| `npm run photos` | スポット写真とライセンス情報を取得して `public/photos/` と `data/photo-credits.json` を更新 |

`geo` と `photos` は社内プロキシ等の証明書で失敗する場合、`NODE_OPTIONS=--use-system-ca` を付けて実行してください。

## ディレクトリ構成

```
app/            Next.js の入口(layout, page, グローバル CSS)
components/
  App.tsx       全体の状態管理とシーン遷移
  room/         部屋・机のシーン
  map/          紙の地図(PaperMap)、実際の地図(RealMap)、地図テクスチャ/シェーダー
  board/        ピンと毛糸
  notebook/     ノート UI(都県ページ、エリアページ、場所追加)
  photos/       ポラロイド写真とモーダル
  ui/           手描き風の共通部品(StationPicker、TimeChip など)
data/
  regions.ts    都県・エリア・駅・スポットのマスターデータ
  types.ts      データの型
  geo/          地図の GeoJSON(生成物)
  photo-credits.json  写真の出典・ライセンス
lib/
  planner.ts    日程の組み立て・最適化・提案
  geo.ts, views.ts    投影とカメラ視点の計算
  gmaps.ts      Google マップ URL の生成と解析
  export.ts     KML / ICS の生成
scripts/        データ生成スクリプト(geo, photos)
public/         写真・テクスチャ
```

## データの追加・更新

- **エリア・スポットの追加**: `data/regions.ts` の `AREAS` に追記します。座標・営業時間・滞在時間は公開情報をもとにした目安なので、追加時は公式サイトで確認してください。
- **写真の追加**: `scripts/fetch-photos.mjs` の `TITLE` に Wikipedia の記事名を対応付けて `npm run photos` を実行します。CC BY / CC BY-SA / CC0 / パブリックドメイン以外は取得しません。
- **地図データの更新**: `npm run geo`

## デプロイ(GitHub Pages)

`next.config.ts` は `output: "export"` で、環境変数 `BASE_PATH` にサブパスを指定できます。

```bash
BASE_PATH=/map npm run build   # out/ に出力。公開 URL は https://<ユーザー名>.github.io/map/
```

Windows の Git Bash では `/map` がパスに変換されるため、`MSYS_NO_PATHCONV=1` を前置してください。
GitHub Actions のワークフロー(`.github/workflows/deploy.yml`)で `main` への push 時に自動デプロイできます。リポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。

> 現状: ローカルで `BASE_PATH=/map` のビルドが `/_not-found` のエラーで失敗する事象が未解決です。原因の切り分け中です(詳細は [docs/requirements.md](docs/requirements.md) の「未解決の課題」)。

## 注意事項

- 移動時間は距離からの推定値です(公式の時刻表ではありません)。駅間など一部は `transit` で実測に近い値を上書きしています。
- スポットの営業時間・滞在時間は目安です。訪問前に各施設の公式情報を確認してください。
- 地図タイルは OpenStreetMap を利用しています。[タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/)の範囲内で使用し、帰属表示を残してください。
- 写真は各ライセンスの条件(作者表示など)に従って表示しています。出典は `data/photo-credits.json` を参照してください。

## ライセンス・出典

- 行政区域データ: 国土数値情報(行政区域データ N03)を [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography) 経由で利用
- 地図タイル: © OpenStreetMap contributors
- 写真: Wikimedia Commons(各ファイルのライセンスに従う)
- フォント: Nanum Pen Script / Gaegu / Yusei Magic(SIL OFL、`@fontsource` 経由)
