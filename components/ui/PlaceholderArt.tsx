import type { Category } from "@/data/types";

const PALETTE: Record<Category, [string, string, string]> = {
  shrine: ["#f6d6c2", "#d9694f", "#7a9b76"],
  temple: ["#efe0b8", "#a8704a", "#6f8f6a"],
  nature: ["#cfe6d6", "#5f9b7a", "#3f6f5a"],
  food: ["#f7e0b5", "#d98b4a", "#b5532f"],
  view: ["#cfe0f0", "#7fa6c9", "#4f77a0"],
  walk: ["#e3ecc9", "#8fb36a", "#5f8450"],
  museum: ["#e4d9ee", "#9a82b8", "#6d5a8c"],
  play: ["#ffe0d0", "#f08a6a", "#c8553a"],
};

/** 写真が無いスポット用の、水彩風のイラスト */
export default function PlaceholderArt({ category, label }: { category: Category; label: string }) {
  const [sky, mid, deep] = PALETTE[category];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sky-${category}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky} />
          <stop offset="1" stopColor="#fff8ea" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#sky-${category})`} />
      <circle cx="150" cy="52" r="22" fill="#fff" opacity="0.7" />
      <path d="M0 150 Q40 100 80 140 T160 120 T200 140 V200 H0Z" fill={mid} opacity="0.75" />
      <path d="M0 170 Q50 135 100 165 T200 160 V200 H0Z" fill={deep} opacity="0.8" />
      <text x="100" y="105" textAnchor="middle" fontSize="46" fill="#3b2f24" opacity="0.55" fontFamily="Yusei Magic, serif">
        {label.slice(0, 2)}
      </text>
    </svg>
  );
}
