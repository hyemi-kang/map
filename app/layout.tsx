import type { Metadata, Viewport } from "next";
import "@fontsource/nanum-pen-script/400.css";
import "@fontsource/gaegu/400.css";
import "@fontsource/gaegu/700.css";
import "@fontsource/yusei-magic/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "도쿄 근교 여행 지도",
  description: "코르크 보드 위의 종이 지도에서 도쿄 근교 여행지를 고르고, 핀과 털실로 하루 일정을 짜 보세요.",
};

export const viewport: Viewport = { themeColor: "#f4f1ea" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
