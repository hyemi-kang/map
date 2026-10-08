"use client";

import { motion, type Variants } from "motion/react";
import { useId, useState } from "react";
import { east, pathGen } from "@/lib/geo";
import { photoOf } from "@/lib/photos";

/*
 * 旅の準備をしている部屋。窓の外には富士山、棚には地球儀や本、床にはスーツケース。
 * 机をクリックすると(「始める」ボタンは無い)、椅子に座るように机へ近づく。
 */

const frames: { id: string; x: number; y: number; w: number; h: number; rot: number }[] = [
  { id: "kotokuin", x: 96, y: 150, w: 118, h: 150, rot: -3 },
  { id: "sensoji", x: 232, y: 118, w: 150, h: 112, rot: 2 },
  { id: "enoshima-jinja", x: 232, y: 248, w: 118, h: 150, rot: -1.5 },
];

const BOOK_COLORS = ["#c8553d", "#3f6f8f", "#e0b04a", "#5f8a5a", "#8a5fa0", "#d98b4a", "#2f4a63"];

const chairVariants: Variants = {
  rest: { x: 0, y: 0, rotate: 0 },
  sit: { x: 150, y: -34, rotate: 6, transition: { duration: 0.8, ease: [0.3, 0.7, 0.3, 1] } },
};

export default function Room({ onSit }: { onSit: () => void }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState(false);
  const mapPath = pathGen(east as never) ?? "";

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      role="img"
      aria-label="여행 준비를 하는 방. 책상을 누르면 앉아서 지도를 펼칩니다."
    >
      <defs>
        <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e8d3" />
          <stop offset="1" stopColor="#e4d2b4" />
        </linearGradient>
        <pattern id={`paper-${uid}`} width="46" height="46" patternUnits="userSpaceOnUse">
          <rect width="46" height="46" fill="none" />
          <path d="M23 8 q5 7 0 14 q-5 -7 0 -14z M0 31 q5 7 0 14 q-5 -7 0 -14z M46 31 q5 7 0 14 q-5 -7 0 -14z" fill="rgba(150,110,70,0.1)" />
        </pattern>
        <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4f2d" />
          <stop offset="1" stopColor="#a8754a" />
        </linearGradient>
        <linearGradient id={`desktop-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98556" />
          <stop offset="1" stopColor="#a06d41" />
        </linearGradient>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc4ea" />
          <stop offset="1" stopColor="#e9f3f8" />
        </linearGradient>
        <radialGradient id={`lamp-${uid}`} cx="50%" cy="0%" r="90%">
          <stop offset="0" stopColor="#fff0b8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff0b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ray-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7d6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="55%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1c0e04" stopOpacity="0.55" />
        </radialGradient>
        <filter id={`soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`glow-${uid}`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#ffe08a" floodOpacity="0.95" />
        </filter>
        <clipPath id={`win-${uid}`}>
          <rect x="1150" y="130" width="290" height="300" />
        </clipPath>
        {frames.map((f) => (
          <clipPath key={f.id} id={`fr-${uid}-${f.id}`}>
            <rect x={f.x + 9} y={f.y + 9} width={f.w - 18} height={f.h - 18} />
          </clipPath>
        ))}
      </defs>

      {/* ── 壁と床 ── */}
      <rect width="1600" height="660" fill={`url(#wall-${uid})`} />
      <rect width="1600" height="660" fill={`url(#paper-${uid})`} />
      <rect y="480" width="1600" height="180" fill="rgba(140,100,60,0.16)" />
      <rect y="478" width="1600" height="6" fill="rgba(255,255,255,0.45)" />
      <rect y="640" width="1600" height="26" fill="#f6efe0" />
      <rect y="664" width="1600" height="4" fill="rgba(60,35,10,0.35)" />
      <rect y="666" width="1600" height="234" fill={`url(#floor-${uid})`} />
      {Array.from({ length: 17 }, (_, i) => {
        const x = -800 + i * 200;
        return <line key={i} x1="800" y1="640" x2={x + 400} y2="900" stroke="rgba(30,12,0,0.28)" strokeWidth="2" />;
      })}
      {[690, 722, 770, 835].map((y) => (
        <line key={y} x1="0" y1={y} x2="1600" y2={y} stroke="rgba(30,12,0,0.18)" strokeWidth="1.5" />
      ))}
      {/* ラグ */}
      <ellipse cx="800" cy="800" rx="480" ry="62" fill="#b24a3a" opacity="0.9" />
      <ellipse cx="800" cy="800" rx="440" ry="52" fill="none" stroke="#f1d9a8" strokeWidth="4" strokeDasharray="14 9" />
      <ellipse cx="800" cy="800" rx="380" ry="40" fill="#c9604d" opacity="0.8" />

      {/* ── 窓(富士山) ── */}
      <g>
        <rect x="1136" y="116" width="318" height="328" rx="6" fill="#fffaf0" stroke="#d8c8a8" strokeWidth="3" />
        <g clipPath={`url(#win-${uid})`}>
          <rect x="1150" y="130" width="290" height="300" fill={`url(#sky-${uid})`} />
          <g>
            <ellipse cx="1230" cy="190" rx="52" ry="15" fill="#fff" opacity="0.92" />
            <ellipse cx="1262" cy="178" rx="34" ry="14" fill="#fff" opacity="0.92" />
            <ellipse cx="1370" cy="240" rx="44" ry="12" fill="#fff" opacity="0.85" />
          </g>
          <polygon points="1130,430 1255,262 1292,236 1330,262 1465,430" fill="#6f86a8" />
          <polygon points="1292,236 1268,266 1281,262 1292,274 1304,262 1318,267" fill="#fff" />
          <rect x="1130" y="400" width="340" height="40" fill="#7ea36a" />
          <path d="M1130 408 q40 -16 90 -4 t90 0 t90 -4 t70 8 v30 h-340z" fill="#5f8a55" />
        </g>
        <rect x="1136" y="116" width="318" height="328" rx="6" fill="none" stroke="#fffaf0" strokeWidth="14" />
        <line x1="1295" y1="130" x2="1295" y2="430" stroke="#fffaf0" strokeWidth="9" />
        <line x1="1150" y1="280" x2="1440" y2="280" stroke="#fffaf0" strokeWidth="9" />
        <rect x="1118" y="440" width="354" height="16" rx="4" fill="#efe3cb" stroke="#d8c8a8" strokeWidth="2" />
        {/* カーテン */}
        <path d="M1090 100 q22 10 28 150 q6 150 -20 200 h-40 v-350z" fill="#e8a39a" opacity="0.92" />
        <path d="M1500 100 q-22 10 -28 150 q-6 150 20 200 h40 v-350z" fill="#e8a39a" opacity="0.92" />
        {/* 窓からの光 */}
        <polygon points="1150,430 1440,430 1180,760 640,760" fill={`url(#ray-${uid})`} opacity="0.55" />
      </g>

      {/* ── 壁の額(行った場所の写真)と旅行ポスター ── */}
      {frames.map((f) => {
        const photo = photoOf(f.id);
        return (
          <g key={f.id} transform={`rotate(${f.rot} ${f.x + f.w / 2} ${f.y + f.h / 2})`}>
            <rect x={f.x + 4} y={f.y + 6} width={f.w} height={f.h} fill="rgba(60,35,10,0.3)" filter={`url(#soft-${uid})`} />
            <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fbf6ea" stroke="#c9b48c" strokeWidth="3" />
            {photo ? (
              <image href={photo.src} x={f.x + 9} y={f.y + 9} width={f.w - 18} height={f.h - 18} preserveAspectRatio="xMidYMid slice" clipPath={`url(#fr-${uid}-${f.id})`} />
            ) : (
              <rect x={f.x + 9} y={f.y + 9} width={f.w - 18} height={f.h - 18} fill="#c9d8d2" />
            )}
          </g>
        );
      })}
      <g transform="rotate(2 530 190)">
        <rect x="414" y="96" width="232" height="190" fill="#f7e9c8" stroke="#a7855a" strokeWidth="4" />
        <circle cx="530" cy="190" r="56" fill="#d9534f" />
        <text x="530" y="272" textAnchor="middle" fontSize="26" fill="#3b2f24" fontFamily="Yusei Magic, serif">TOKYO 東京</text>
        <path d="M424 128 h212" stroke="#3b2f24" strokeWidth="2" />
        <text x="530" y="122" textAnchor="middle" fontSize="16" fill="#3b2f24" fontFamily="Yusei Magic, serif">TRAVEL</text>
      </g>

      {/* ── 棚(本・地球儀・飛行機・観葉植物) ── */}
      <g>
        <rect x="690" y="232" width="320" height="16" rx="3" fill="#a06d41" />
        <rect x="690" y="246" width="320" height="6" fill="rgba(0,0,0,0.25)" />
        <rect x="716" y="248" width="10" height="24" fill="#8a5a34" />
        <rect x="974" y="248" width="10" height="24" fill="#8a5a34" />
        {BOOK_COLORS.map((c, i) => (
          <rect key={i} x={706 + i * 17} y={232 - (60 + ((i * 13) % 22))} width="15" height={60 + ((i * 13) % 22)} fill={c} stroke="rgba(0,0,0,0.25)" strokeWidth="1" transform={i === 6 ? "rotate(8 826 232)" : undefined} />
        ))}
        {/* 地球儀 */}
        <g transform="translate(900 168)">
          <rect x="-22" y="52" width="44" height="10" rx="3" fill="#6d4426" />
          <rect x="-3" y="30" width="6" height="26" fill="#8a5a34" />
          <circle r="42" fill="#5b9bc9" stroke="#2f5f86" strokeWidth="3" />
          <path d="M-30 -12 q14 -18 30 -10 q10 12 -4 22 q-14 6 -26 -12z M8 6 q18 -6 26 8 q-4 16 -20 14 q-8 -10 -6 -22z" fill="#8bbf6a" />
          <ellipse rx="42" ry="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <ellipse rx="14" ry="42" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <circle r="42" fill="none" stroke="#c9a05a" strokeWidth="2" strokeDasharray="1 0" transform="rotate(-23)" opacity="0.7" />
        </g>
        {/* 紙飛行機 */}
        <g transform="translate(970 190) rotate(-18)">
          <polygon points="0,0 54,-12 20,18" fill="#fff" stroke="#9a9a9a" strokeWidth="1.5" />
          <polygon points="20,18 54,-12 26,6" fill="#e5e5e5" stroke="#9a9a9a" strokeWidth="1.5" />
        </g>
      </g>
      {/* 観葉植物 */}
      <g transform="translate(80 560)">
        <path d="M-30 90 h60 l-8 70 h-44z" fill="#c8704a" stroke="#8a4a2a" strokeWidth="2" />
        <rect x="-34" y="82" width="68" height="14" rx="4" fill="#d98a62" />
        {[-48, -26, -6, 14, 34, 54].map((a, i) => (
          <path key={i} d={`M0 84 q${a * 0.7} ${-(70 + (i % 3) * 18)} ${a * 1.2} ${-(108 + (i % 2) * 24)} q${-(a * 0.1 + 12)} 60 ${-(a * 1.2 - 4)} 108z`} fill={i % 2 ? "#5f8a55" : "#74a064"} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        ))}
      </g>

      {/* ── ペンダントライト ── */}
      <g>
        <line x1="800" y1="0" x2="800" y2="196" stroke="#4a3a2a" strokeWidth="3" />
        <path d="M744 266 q56 -80 112 0z" fill="#e6b95a" stroke="#a37c2a" strokeWidth="3" />
        <ellipse cx="800" cy="266" rx="56" ry="9" fill="#ffe9a8" />
        <ellipse cx="800" cy="560" rx="330" ry="260" fill={`url(#lamp-${uid})`} opacity="0.92" />
      </g>

      {/* ── スーツケースと床の小物 ── */}
      <g transform="translate(1280 700)">
        <ellipse cx="80" cy="170" rx="110" ry="14" fill="rgba(30,12,0,0.45)" filter={`url(#soft-${uid})`} />
        <rect x="0" y="20" width="160" height="140" rx="14" fill="#2f6fb0" stroke="#1e4a78" strokeWidth="3" />
        <rect x="8" y="28" width="144" height="124" rx="10" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <rect x="40" y="0" width="80" height="24" rx="8" fill="none" stroke="#1e4a78" strokeWidth="9" />
        <rect x="22" y="20" width="14" height="140" fill="#d9a84a" opacity="0.9" />
        <rect x="124" y="20" width="14" height="140" fill="#d9a84a" opacity="0.9" />
        <circle cx="86" cy="62" r="17" fill="#fff" />
        <circle cx="86" cy="62" r="9" fill="#d9534f" />
        <rect x="56" y="104" width="48" height="26" rx="4" fill="#f4d67a" transform="rotate(-6 80 117)" />
        <text x="80" y="122" textAnchor="middle" fontSize="15" fill="#3b2f24" fontFamily="Yusei Magic, serif" transform="rotate(-6 80 117)">JAPAN</text>
        <circle cx="20" cy="166" r="9" fill="#2b2118" />
        <circle cx="140" cy="166" r="9" fill="#2b2118" />
      </g>
      {/* ガイドブックの山 */}
      <g transform="translate(170 790)">
        <ellipse cx="60" cy="48" rx="90" ry="10" fill="rgba(30,12,0,0.4)" filter={`url(#soft-${uid})`} />
        <rect x="0" y="22" width="120" height="22" rx="3" fill="#d9534f" />
        <rect x="8" y="2" width="106" height="22" rx="3" fill="#e0b04a" transform="rotate(-3 60 13)" />
        <rect x="14" y="-18" width="96" height="21" rx="3" fill="#3f6f8f" transform="rotate(4 60 -8)" />
      </g>

      {/* ── 机(クリックできる) ── */}
      <motion.g
        className="pen"
        onClick={onSit}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{ cursor: "pointer" }}
        filter={hover ? `url(#glow-${uid})` : undefined}
        tabIndex={0}
        role="button"
        aria-label="책상에 앉기"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") onSit();
        }}
      >
        <ellipse cx="800" cy="852" rx="470" ry="26" fill="rgba(25,10,0,0.5)" filter={`url(#soft-${uid})`} />
        {/* 脚と引き出し */}
        <polygon points="430,690 478,690 470,860 436,860" fill="#7a4f2d" />
        <polygon points="1122,690 1170,690 1164,860 1130,860" fill="#7a4f2d" />
        <rect x="486" y="684" width="624" height="22" fill="#7a4f2d" />
        <g>
          <rect x="960" y="700" width="160" height="150" fill="#8a5a34" stroke="#6d4426" strokeWidth="2" />
          <rect x="972" y="712" width="136" height="56" rx="3" fill="#9a6a40" stroke="#6d4426" strokeWidth="2" />
          <rect x="972" y="776" width="136" height="56" rx="3" fill="#9a6a40" stroke="#6d4426" strokeWidth="2" />
          <circle cx="1040" cy="740" r="6" fill="#e3c06a" />
          <circle cx="1040" cy="804" r="6" fill="#e3c06a" />
        </g>
        {/* 天板 */}
        <polygon points="470,588 1130,588 1204,650 396,650" fill={`url(#desktop-${uid})`} stroke="#7a4f2d" strokeWidth="2" />
        <polygon points="396,650 1204,650 1204,690 396,690" fill="#8a5a34" />
        <rect x="396" y="650" width="808" height="5" fill="rgba(255,235,200,0.35)" />
        {[598, 610, 624, 638].map((y, i) => (
          <line key={y} x1={500 - i * 24} y1={y} x2={1100 + i * 24} y2={y} stroke="rgba(60,30,8,0.18)" strokeWidth="1.3" />
        ))}

        {/* 机の上: 広げかけの地図 */}
        <g transform="translate(640 596) scale(0.34 0.075) skewX(-8)">
          <rect x="-10" y="-10" width="1020" height={780} rx="6" fill="#f3e9cd" stroke="#b9a77f" strokeWidth="6" />
          <path d={mapPath} fill="#e2d4a6" stroke="#8a7650" strokeWidth="5" />
        </g>
        <g transform="translate(902 604)">
          <line x1="0" y1="0" x2="-146" y2="2" stroke="#c8402f" strokeWidth="3" opacity="0.85" />
          <circle cx="0" cy="-3" r="7" fill="#d9534f" stroke="rgba(0,0,0,0.25)" />
          <rect x="-1" y="-2" width="2" height="8" fill="#cfd4d8" />
        </g>
        {/* パスポート・カメラ・マグ・チケット */}
        <g transform="translate(560 612) rotate(-8)">
          <rect width="38" height="22" rx="2" fill="#7a1f2b" stroke="#4a0f18" strokeWidth="1.5" />
          <circle cx="19" cy="11" r="5" fill="none" stroke="#e3c06a" strokeWidth="1.5" />
        </g>
        <g transform="translate(1010 598)">
          <rect width="62" height="34" rx="5" fill="#2b2b2e" stroke="#111" strokeWidth="1.5" />
          <rect x="6" y="-6" width="24" height="9" rx="2" fill="#444" />
          <circle cx="40" cy="18" r="12" fill="#1a1a1c" stroke="#777" strokeWidth="2.5" />
          <circle cx="40" cy="18" r="5" fill="#3b4a6a" />
        </g>
        <g transform="translate(468 596)">
          <ellipse cx="22" cy="24" rx="24" ry="7" fill="rgba(25,10,0,0.4)" />
          <rect x="0" y="0" width="38" height="26" rx="5" fill="#fff" stroke="#cfc6b0" strokeWidth="1.5" />
          <ellipse cx="19" cy="2" rx="17" ry="4.5" fill="#6b3f22" />
          <path d="M38 6 q12 2 8 12 q-3 6 -10 4" fill="none" stroke="#fff" strokeWidth="4" />
          <path d="M12 -6 q-5 -10 2 -16 M24 -6 q-5 -10 2 -16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        {/* 付箋 */}
        <motion.g
          animate={hover ? { rotate: [-4, 3, -4], y: [0, -4, 0] } : { rotate: -4 }}
          transition={{ repeat: hover ? Infinity : 0, duration: 1.4 }}
          style={{ transformOrigin: "790px 612px" }}
        >
          <rect x="738" y="604" width="76" height="44" fill="#fff08a" stroke="rgba(120,100,0,0.3)" />
          <text x="776" y="622" textAnchor="middle" fontSize="15" fill="#3b2f24" fontFamily="Nanum Pen Script, cursive">여행 계획 ✎</text>
          <path d="M748 636 q10 -6 20 0 t20 0 t18 -2" fill="none" stroke="#d9534f" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </motion.g>

      {/* ── 椅子(引いてある。座るときに机へ寄る) ── */}
      <motion.g variants={chairVariants} style={{ pointerEvents: "none" }}>
        <ellipse cx="520" cy="858" rx="150" ry="16" fill="rgba(25,10,0,0.5)" filter={`url(#soft-${uid})`} />
        <g transform="rotate(-7 520 760)">
          {/* 脚 */}
          <rect x="418" y="770" width="16" height="92" rx="4" fill="#6d4426" />
          <rect x="606" y="770" width="16" height="92" rx="4" fill="#6d4426" />
          <rect x="446" y="760" width="12" height="70" rx="3" fill="#7a4f2d" />
          <rect x="584" y="760" width="12" height="70" rx="3" fill="#7a4f2d" />
          {/* 座面 */}
          <ellipse cx="520" cy="756" rx="116" ry="26" fill="#a9754a" stroke="#6d4426" strokeWidth="3" />
          <ellipse cx="520" cy="748" rx="106" ry="20" fill="#d89a6a" opacity="0.9" />
          <ellipse cx="520" cy="746" rx="90" ry="15" fill="#e8b284" opacity="0.8" />
          {/* 背もたれ(背中側が見える) */}
          <rect x="426" y="574" width="188" height="170" rx="22" fill="#a9754a" stroke="#6d4426" strokeWidth="3" />
          <rect x="440" y="588" width="160" height="142" rx="14" fill="#8a5a34" />
          {[462, 490, 518, 546, 574].map((x) => (
            <rect key={x} x={x} y="598" width="14" height="120" rx="6" fill="#b88458" opacity="0.8" />
          ))}
          {/* 椅子に掛けたジャケット */}
          <path d="M452 600 q68 -26 136 0 l8 64 q-76 18 -152 0z" fill="#3f6f8f" opacity="0.95" />
          <path d="M520 584 v76" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          <circle cx="532" cy="600" r="3.5" fill="#e3c06a" />
          <circle cx="532" cy="624" r="3.5" fill="#e3c06a" />
        </g>
      </motion.g>

      {/* 周辺を少し暗くして奥行きを出す */}
      <rect width="1600" height="900" fill={`url(#vig-${uid})`} pointerEvents="none" />
    </svg>
  );
}
