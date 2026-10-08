"use client";

import { motion, type Variants } from "motion/react";
import { useId, useState } from "react";
import { east, lngLatToWorld, pathGen, WORLD_H } from "@/lib/geo";
import { photoOf } from "@/lib/photos";

/*
 * 旅の計画を立てる書斎。落ち着いた色(グレージュの壁、ウォルナットの机、革の椅子)と、
 * 夕方の斜めの光。机をクリックすると(「始める」ボタンは無い)、椅子に座るように机へ近づく。
 * 影は blur フィルターではなくグラデーションで描く(重くならないように)。
 */

const GALLERY: { id: string; x: number; y: number; w: number; h: number }[] = [
  { id: "kotokuin", x: 96, y: 168, w: 104, h: 134 },
  { id: "sensoji", x: 214, y: 140, w: 134, h: 104 },
  { id: "enoshima-jinja", x: 214, y: 258, w: 104, h: 134 },
];

const BOOKS: [string, number, number][] = [
  ["#2f3d37", 15, 64],
  ["#6b4a3a", 13, 74],
  ["#c9b99b", 17, 58],
  ["#27313f", 14, 70],
  ["#8a6f4e", 16, 62],
  ["#3d4a52", 12, 76],
  ["#a0553d", 15, 56],
];

const chairVariants: Variants = {
  rest: { x: 0, y: 0, rotate: 0 },
  sit: { x: 150, y: -34, rotate: 6, transition: { duration: 0.8, ease: [0.3, 0.7, 0.3, 1] } },
};

export default function Room({ onSit }: { onSit: () => void }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState(false);
  const mapPath = pathGen(east as never) ?? "";
  const [tx, ty] = lngLatToWorld(139.69, 35.69);
  const g = (n: string) => `url(#${n}-${uid})`;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      role="img"
      aria-label="여행을 계획하는 서재. 책상을 누르면 앉아서 지도를 펼칩니다."
    >
      <defs>
        <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d3cab9" />
          <stop offset="0.6" stopColor="#c2b8a5" />
          <stop offset="1" stopColor="#a99d89" />
        </linearGradient>
        <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a1d" />
          <stop offset="1" stopColor="#5b4128" />
        </linearGradient>
        <linearGradient id={`walnut-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5233" />
          <stop offset="1" stopColor="#5a3a22" />
        </linearGradient>
        <linearGradient id={`walnut-d-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f2917" />
          <stop offset="1" stopColor="#5a3b22" />
        </linearGradient>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aebfd2" />
          <stop offset="0.55" stopColor="#ecd9c2" />
          <stop offset="1" stopColor="#f2c79c" />
        </linearGradient>
        <linearGradient id={`ray-${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3b0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffe3b0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`pool-${uid}`} cx="50%" cy="0%" r="62%">
          <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffe2a6" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffe2a6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shadow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#120a04" stopOpacity="0.62" />
          <stop offset="1" stopColor="#120a04" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="58%" r="78%">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#0d0805" stopOpacity="0.62" />
        </radialGradient>
        <linearGradient id={`curtain-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9e2d3" />
          <stop offset="0.25" stopColor="#d9d0be" />
          <stop offset="0.5" stopColor="#ece5d7" />
          <stop offset="0.75" stopColor="#d6ccb9" />
          <stop offset="1" stopColor="#e6dfd0" />
        </linearGradient>
        <linearGradient id={`brass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4c986" />
          <stop offset="0.5" stopColor="#b88f45" />
          <stop offset="1" stopColor="#8a6a2e" />
        </linearGradient>
        <linearGradient id={`leather-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8693a" />
          <stop offset="1" stopColor="#7d4a27" />
        </linearGradient>
        <pattern id={`weave-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0 L6 6 M6 0 L0 6" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <filter id={`plaster-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7 0.5" numOctaves="2" seed="5" />
          <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0.5 -0.12" />
        </filter>
        <clipPath id={`win-${uid}`}>
          <rect x="1156" y="128" width="278" height="310" />
        </clipPath>
        {GALLERY.map((f) => (
          <clipPath key={f.id} id={`fr-${uid}-${f.id}`}>
            <rect x={f.x + 12} y={f.y + 12} width={f.w - 24} height={f.h - 24} />
          </clipPath>
        ))}
        <clipPath id={`art-${uid}`}>
          <rect x="400" y="132" width="196" height="248" />
        </clipPath>
      </defs>

      {/* ── 壁 ── */}
      <rect width="1600" height="668" fill={g("wall")} />
      <rect width="1600" height="668" filter={`url(#plaster-${uid})`} opacity="0.55" />
      {/* 窓側からの夕方の光が壁に当たる */}
      <rect width="1600" height="668" fill={g("ray")} opacity="0.5" />
      {/* 幅木 */}
      <rect y="640" width="1600" height="30" fill="#2e211a" />
      <rect y="640" width="1600" height="3" fill="rgba(255,255,255,0.16)" />

      {/* ── 床(ダークオークの板張り) ── */}
      <rect y="668" width="1600" height="232" fill={g("floor")} />
      {Array.from({ length: 19 }, (_, i) => (
        <line key={i} x1="800" y1="640" x2={-1000 + i * 190} y2="900" stroke="rgba(0,0,0,0.38)" strokeWidth="1.6" />
      ))}
      {[700, 740, 796, 862].map((y) => (
        <line key={y} x1="0" y1={y} x2="1600" y2={y} stroke="rgba(0,0,0,0.16)" strokeWidth="1.2" />
      ))}
      {/* 床に伸びる窓の光 */}
      <polygon points="1130,668 1470,668 1190,900 560,900" fill={g("ray")} opacity="0.55" />

      {/* ── ラグ(くすんだ紺 + 生成りの縁) ── */}
      <polygon points="372,742 1228,742 1440,884 160,884" fill="#2f3948" />
      <polygon points="372,742 1228,742 1440,884 160,884" fill={g("weave")} />
      <polygon points="408,756 1192,756 1380,872 220,872" fill="none" stroke="#b9a984" strokeWidth="2.4" />
      <polygon points="436,766 1164,766 1332,862 268,862" fill="none" stroke="rgba(185,169,132,0.45)" strokeWidth="1.4" strokeDasharray="3 7" />

      {/* ── 窓(黒いスチールサッシ・夕景の富士山) ── */}
      <g>
        <rect x="1140" y="112" width="310" height="342" fill="#1d1d1f" />
        <g clipPath={`url(#win-${uid})`}>
          <rect x="1156" y="128" width="278" height="310" fill={g("sky")} />
          <polygon points="1130,372 1216,330 1262,282 1296,262 1330,282 1380,330 1470,372 1470,440 1130,440" fill="#98a8bd" opacity="0.7" />
          <polygon points="1272,284 1296,262 1320,284 1330,298 1316,292 1306,304 1296,294 1284,304 1276,292 1262,298" fill="#f4eee4" opacity="0.85" />
          <path d="M1130 396 q60 -26 130 -8 t140 0 t70 -4 v56 h-340z" fill="#6c7b72" opacity="0.9" />
          <path d="M1130 414 q80 -22 160 -4 t180 2 v28 h-340z" fill="#44514a" />
        </g>
        {/* 格子 */}
        {[1225, 1295, 1365].map((x) => (
          <rect key={x} x={x - 2.5} y="128" width="5" height="310" fill="#1d1d1f" />
        ))}
        {[230, 334].map((y) => (
          <rect key={y} x="1156" y={y - 2.5} width="278" height="5" fill="#1d1d1f" />
        ))}
        <rect x="1128" y="454" width="334" height="12" fill="#2e2018" />
        {/* リネンのカーテン */}
        <path d="M1082 84 h66 q12 250 -4 396 h-62z" fill={g("curtain")} />
        <path d="M1456 84 h62 v396 h-58 q-14 -146 -4 -396z" fill={g("curtain")} />
        <rect x="1060" y="78" width="470" height="8" rx="4" fill="#2a2a2c" />
      </g>

      {/* ── 壁: 額(白黒に近い写真) ── */}
      {GALLERY.map((f) => {
        const photo = photoOf(f.id);
        return (
          <g key={f.id}>
            <rect x={f.x + 3} y={f.y + 5} width={f.w} height={f.h} fill="rgba(20,10,4,0.35)" />
            <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#18181a" />
            <rect x={f.x + 5} y={f.y + 5} width={f.w - 10} height={f.h - 10} fill="#f1ede4" />
            {photo ? (
              <image
                href={photo.src}
                x={f.x + 12}
                y={f.y + 12}
                width={f.w - 24}
                height={f.h - 24}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#fr-${uid}-${f.id})`}
                style={{ filter: "saturate(0.45) contrast(1.05) sepia(0.18)" }}
              />
            ) : (
              <rect x={f.x + 12} y={f.y + 12} width={f.w - 24} height={f.h - 24} fill="#b9b3a4" />
            )}
          </g>
        );
      })}
      {/* ラインアートの地図(実際の東日本の形) */}
      <g>
        <rect x="396" y="116" width="212" height="280" fill="rgba(20,10,4,0.35)" transform="translate(4 6)" />
        <rect x="388" y="108" width="212" height="280" fill="#16181a" />
        <rect x="396" y="116" width="196" height="264" fill="#27382f" />
        <g clipPath={`url(#art-${uid})`}>
          <g transform="translate(400 134) scale(0.176)">
            <path d={mapPath} fill="none" stroke="#e5dcc3" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
            <circle cx={tx} cy={ty} r="10" fill="#c9a34d" />
            <circle cx={tx} cy={ty} r="26" fill="none" stroke="#c9a34d" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </g>
        </g>
        <text x="496" y="368" textAnchor="middle" fontSize="13" letterSpacing="4" fill="#d9cfb2" fontFamily="Yusei Magic, serif">
          東日本
        </text>
      </g>

      {/* ── 棚(ウォルナットの浮き棚) ── */}
      <g>
        <rect x="660" y="238" width="360" height="12" fill={g("walnut")} />
        <rect x="660" y="250" width="360" height="3" fill="rgba(0,0,0,0.35)" />
        <polygon points="662,253 1018,253 1010,266 670,266" fill="rgba(20,10,4,0.2)" />
        {(() => {
          let x = 684;
          return BOOKS.map(([c, w, h], i) => {
            const el = (
              <rect key={i} x={x} y={238 - h} width={w} height={h} fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" transform={i === 6 ? `rotate(7 ${x + w} 238)` : undefined} />
            );
            x += w + 1.5;
            return el;
          });
        })()}
        {/* 真鍮の地球儀 */}
        <g transform="translate(900 176)">
          <ellipse cx="0" cy="62" rx="26" ry="5" fill="rgba(20,10,4,0.4)" />
          <rect x="-16" y="54" width="32" height="8" rx="2" fill={g("brass")} />
          <rect x="-2" y="34" width="4" height="22" fill={g("brass")} />
          <circle r="40" fill="#6a8499" stroke="#a98a48" strokeWidth="3" />
          <path d="M-26 -14 q12 -16 28 -9 q8 11 -4 20 q-13 5 -24 -11z M10 8 q16 -5 24 8 q-3 14 -18 12 q-8 -9 -6 -20z" fill="#b6a679" />
          <circle r="40" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <ellipse rx="40" ry="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <path d="M-31 -26 A40 40 0 0 1 12 -38" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* パンパスグラスの花瓶 */}
        <g transform="translate(978 238)">
          <path d="M-9 0 q-3 -26 0 -44 h18 q3 18 0 44z" fill="#d8cdb8" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          {[-22, -12, -3, 6, 15, 24].map((a, i) => (
            <path key={i} d={`M0 -44 q${a * 0.5} ${-(40 + (i % 3) * 12)} ${a} ${-(74 + (i % 2) * 14)}`} fill="none" stroke={i % 2 ? "#cdbb94" : "#b9a479"} strokeWidth="2.4" strokeLinecap="round" />
          ))}
        </g>
      </g>

      {/* ── 観葉植物(フィカス) ── */}
      <g transform="translate(86 566)">
        <ellipse cx="0" cy="168" rx="52" ry="9" fill={g("shadow")} />
        <path d="M-34 96 h68 l-8 70 h-52z" fill="#7f8580" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
        <rect x="-38" y="88" width="76" height="12" rx="3" fill="#979d98" />
        <path d="M0 90 q-4 -60 6 -110" fill="none" stroke="#4d4331" strokeWidth="5" strokeLinecap="round" />
        {(
          [
            [-44, -10, 28, -24],
            [38, -34, 30, 20],
            [-36, -62, 30, -16],
            [34, -82, 30, 18],
            [-28, -112, 28, -12],
            [18, -126, 28, 10],
          ] as const
        ).map(([x, y, r, rot], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.62} transform={`rotate(${rot} ${x} ${y})`} fill={i % 2 ? "#586a4c" : "#4b5d41"} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        ))}
      </g>

      {/* ── ペンダントライト(マットブラック + 真鍮の内側) ── */}
      <g>
        <line x1="800" y1="0" x2="800" y2="190" stroke="#1d1d1f" strokeWidth="2.5" />
        <path d="M736 268 q64 -92 128 0z" fill="#222224" />
        <ellipse cx="800" cy="268" rx="64" ry="9" fill="#e9c37a" />
        <ellipse cx="800" cy="266" rx="40" ry="5" fill="#fff0c4" />
        <ellipse cx="800" cy="560" rx="360" ry="300" fill={g("pool")} />
      </g>

      {/* ── 床の小物: ヴィンテージのトランクと帽子箱 ── */}
      <g transform="translate(1262 704)">
        <ellipse cx="96" cy="170" rx="132" ry="14" fill={g("shadow")} />
        <rect x="0" y="40" width="190" height="124" rx="10" fill={g("leather")} stroke="#4d2c15" strokeWidth="2.5" />
        <rect x="0" y="40" width="190" height="14" rx="6" fill="rgba(255,255,255,0.12)" />
        <rect x="8" y="48" width="174" height="108" rx="6" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" />
        <rect x="30" y="40" width="12" height="124" fill="#4d2c15" />
        <rect x="148" y="40" width="12" height="124" fill="#4d2c15" />
        <rect x="80" y="82" width="30" height="22" rx="3" fill={g("brass")} stroke="#6b4f20" strokeWidth="1" />
        <circle cx="95" cy="93" r="3" fill="#2a1d0c" />
        <rect x="14" y="30" width="4" height="12" fill="#2a1d0c" />
        <rect x="172" y="30" width="4" height="12" fill="#2a1d0c" />
        <path d="M152 108 l22 4 l-4 26 l-22 -4z" fill="#e9e0c8" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
        <circle cx="160" cy="114" r="2" fill="#333" />
        {/* 帽子箱 */}
        <g transform="translate(26 -34)">
          <ellipse cx="62" cy="68" rx="64" ry="14" fill="#cfc2a5" />
          <rect x="0" y="22" width="124" height="46" fill="#d8ccb0" />
          <ellipse cx="62" cy="22" rx="62" ry="14" fill="#e6dcc3" />
          <ellipse cx="62" cy="22" rx="52" ry="10" fill="#c9bb9c" />
          <rect x="0" y="44" width="124" height="3" fill="#8a6f4e" />
        </g>
      </g>
      {/* 床の本 */}
      <g transform="translate(176 800)">
        <ellipse cx="62" cy="52" rx="92" ry="10" fill={g("shadow")} />
        <rect x="0" y="26" width="124" height="22" rx="2" fill="#2f3d37" />
        <rect x="6" y="6" width="108" height="22" rx="2" fill="#a0553d" transform="rotate(-2 60 17)" />
        <rect x="14" y="-14" width="96" height="21" rx="2" fill="#c9b99b" transform="rotate(3 60 -4)" />
      </g>

      {/* ── 机(クリックできる) ── */}
      <motion.g
        className="pen"
        onClick={onSit}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{ cursor: "pointer" }}
        tabIndex={0}
        role="button"
        aria-label="책상에 앉기"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") onSit();
        }}
      >
        <ellipse cx="800" cy="860" rx="520" ry="34" fill={g("shadow")} />
        {/* 脚の間も含めて、机のまわり全体をクリックできるようにする(透明) */}
        <rect x="396" y="584" width="808" height="286" fill="transparent" />
        {/* ミッドセンチュリーの細い脚(少し開いている) */}
        <polygon points="432,690 470,690 452,866 438,866" fill={g("walnut-d")} />
        <polygon points="1130,690 1168,690 1162,866 1148,866" fill={g("walnut-d")} />
        {/* 引き出し */}
        <rect x="940" y="692" width="190" height="118" fill="#4a2f1b" stroke="#2c1a0d" strokeWidth="2" />
        <rect x="952" y="704" width="166" height="44" fill="#5d3b22" stroke="#2c1a0d" strokeWidth="1.5" />
        <rect x="952" y="756" width="166" height="44" fill="#5d3b22" stroke="#2c1a0d" strokeWidth="1.5" />
        <rect x="1012" y="722" width="46" height="5" rx="2.5" fill={g("brass")} />
        <rect x="1012" y="774" width="46" height="5" rx="2.5" fill={g("brass")} />
        {/* 天板 */}
        <polygon points="470,588 1130,588 1204,650 396,650" fill={g("walnut")} />
        <polygon points="396,650 1204,650 1204,692 396,692" fill="#4a2f1b" />
        <rect x="396" y="650" width="808" height="3" fill="rgba(255,225,180,0.4)" />
        {[598, 611, 625, 639].map((y, i) => (
          <line key={y} x1={500 - i * 22} y1={y} x2={1100 + i * 22} y2={y} stroke="rgba(30,15,5,0.22)" strokeWidth="1.1" />
        ))}
        {/* 革のデスクマット */}
        <polygon points="510,598 1060,598 1100,642 470,642" fill="#24282a" stroke="#0f1112" strokeWidth="1.5" />
        <polygon points="510,598 1060,598 1056,602 514,602" fill="rgba(255,255,255,0.08)" />

        {/* 地図(実際の東日本の形) */}
        <g transform={`translate(584 601) scale(0.29 ${35 / (WORLD_H + 20)}) skewX(-10)`}>
          <rect x="-10" y="-10" width="1020" height={WORLD_H + 20} fill="#e8dfc6" stroke="#b6a581" strokeWidth="5" />
          <path d={mapPath} fill="#d7c9a3" stroke="#7f6e49" strokeWidth="4" />
        </g>
        {/* 真鍮のコンパス */}
        <g transform="translate(528 619)">
          <ellipse cx="2" cy="6" rx="19" ry="5" fill="rgba(0,0,0,0.5)" />
          <ellipse cx="0" cy="0" rx="18" ry="8" fill={g("brass")} stroke="#6b4f20" strokeWidth="1" />
          <ellipse cx="0" cy="-1" rx="14" ry="6" fill="#f2ead4" />
          <polygon points="-1,-1 11,-1 -1,-4" fill="#a0332c" />
          <polygon points="1,-1 -11,-1 1,2" fill="#2a2a2a" />
        </g>
        {/* 革のノートと万年筆 */}
        <g transform="translate(870 606) rotate(-6)">
          <rect width="82" height="26" rx="3" fill="#5a3a22" stroke="#2c1a0d" strokeWidth="1.2" />
          <rect x="3" y="3" width="76" height="20" rx="2" fill="none" stroke="rgba(255,225,180,0.25)" strokeWidth="1" />
          <rect x="70" y="0" width="5" height="26" fill="#3a2414" />
        </g>
        <g transform="translate(884 604) rotate(-18)">
          <rect width="62" height="4" rx="2" fill="#16161a" />
          <rect x="4" y="0.6" width="26" height="1.4" fill={g("brass")} />
          <polygon points="62,0 70,2 62,4" fill="#c9a24d" />
        </g>
        {/* 古いカメラ */}
        <g transform="translate(980 596)">
          <ellipse cx="32" cy="38" rx="38" ry="5" fill="rgba(0,0,0,0.5)" />
          <rect width="64" height="34" rx="4" fill="#1b1b1d" stroke="#000" strokeWidth="1" />
          <rect x="0" y="0" width="64" height="9" rx="3" fill="#b8bcc0" />
          <rect x="6" y="-5" width="16" height="6" rx="1.5" fill="#2a2a2c" />
          <circle cx="40" cy="20" r="12" fill="#101012" stroke="#9aa0a5" strokeWidth="2.5" />
          <circle cx="40" cy="20" r="6" fill="#26323f" />
          <circle cx="37" cy="17" r="2" fill="rgba(255,255,255,0.45)" />
        </g>
        {/* パスポート */}
        <g transform="translate(724 611) rotate(5)">
          <rect width="30" height="20" rx="2" fill="#1f2c45" stroke="#0e1626" strokeWidth="1" />
          <circle cx="15" cy="10" r="4.5" fill="none" stroke="#c9a24d" strokeWidth="1.2" />
        </g>
        {/* エスプレッソ */}
        <g transform="translate(446 606)">
          <ellipse cx="22" cy="14" rx="22" ry="6" fill="#e9e3d6" stroke="rgba(0,0,0,0.2)" />
          <rect x="8" y="-4" width="24" height="16" rx="5" fill="#f4efe4" stroke="rgba(0,0,0,0.2)" />
          <ellipse cx="20" cy="-3" rx="11" ry="3" fill="#3a2214" />
          <path d="M32 2 q8 1 5 8 q-2 3 -7 2" fill="none" stroke="#f4efe4" strokeWidth="3" />
        </g>
        {/* メモカード(ここを押すと座れる、というさりげない手がかり) */}
        <motion.g animate={hover ? { rotate: [-3, 2, -3], y: [0, -3, 0] } : { rotate: -3 }} transition={{ repeat: hover ? Infinity : 0, duration: 1.6 }} style={{ transformOrigin: "800px 612px" }}>
          <rect x="764" y="603" width="68" height="36" fill="#f2ecdc" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <text x="798" y="618" textAnchor="middle" fontSize="14" fill="#33281d" fontFamily="Nanum Pen Script, cursive">
            여행 계획
          </text>
          <path d="M772 628 q8 -5 16 0 t16 0 t14 -1" fill="none" stroke="#8a6a3a" strokeWidth="1.4" strokeLinecap="round" />
        </motion.g>
        {/* ホバー時は机に暖かい光が差す */}
        <polygon points="470,588 1130,588 1204,650 396,650" fill="#ffd9a0" opacity={hover ? 0.18 : 0} style={{ transition: "opacity .25s" }} />
        <polygon points="396,650 1204,650 1204,692 396,692" fill="#ffd9a0" opacity={hover ? 0.1 : 0} style={{ transition: "opacity .25s" }} />
      </motion.g>

      {/* ── 椅子(革の座面。引いてある。座るときに机へ寄る) ── */}
      <motion.g variants={chairVariants} style={{ pointerEvents: "none" }}>
        <ellipse cx="520" cy="862" rx="150" ry="18" fill={g("shadow")} />
        <g transform="rotate(-7 520 760)">
          {/* 脚(細い) */}
          <polygon points="430,774 440,774 436,862 428,862" fill="#2a1a0e" />
          <polygon points="600,774 610,774 612,862 604,862" fill="#2a1a0e" />
          <polygon points="460,764 468,764 472,832 466,832" fill="#3b2616" />
          <polygon points="574,764 582,764 580,832 574,832" fill="#3b2616" />
          {/* 座面(革) */}
          <ellipse cx="520" cy="762" rx="112" ry="25" fill="#3b2616" />
          <ellipse cx="520" cy="754" rx="104" ry="21" fill={g("leather")} />
          <ellipse cx="520" cy="750" rx="90" ry="15" fill="rgba(255,225,180,0.22)" />
          {/* 背もたれ(曲げ木 + 革) */}
          <path d="M432 740 q-8 -90 6 -170 q82 -24 164 0 q14 80 6 170" fill="#3b2616" />
          <path d="M446 726 q-6 -78 6 -148 q68 -18 136 0 q12 70 6 148 q-74 14 -148 0z" fill={g("leather")} />
          <path d="M456 600 q64 -14 128 0" fill="none" stroke="rgba(255,235,200,0.35)" strokeWidth="3" strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={470 + i * 26} cy="590" r="2.2" fill={g("brass")} />
          ))}
        </g>
      </motion.g>

      {/* ── 仕上げ: 夕方の暖色と周辺減光 ── */}
      <rect width="1600" height="900" fill="#ffb86b" opacity="0.06" pointerEvents="none" />
      <rect width="1600" height="900" fill={g("vig")} pointerEvents="none" />
    </svg>
  );
}
