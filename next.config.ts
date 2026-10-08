import type { NextConfig } from "next";

// GitHub Pages のようにサブパス配下で配信するときは BASE_PATH を指定する。
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  // 開発サーバーの出力先を変えたいとき(キャッシュが壊れたときなど)は NEXT_DIST_DIR を指定する
  distDir: process.env.NEXT_DIST_DIR || ".next",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
