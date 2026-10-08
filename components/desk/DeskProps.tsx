/** 机の上の小物(真上から見た絵)。ふわっと影が落ちている */

export function Mug({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id="mug-body" cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d2c4" />
        </radialGradient>
        <radialGradient id="mug-coffee" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7a4a2a" />
          <stop offset="1" stopColor="#3b2012" />
        </radialGradient>
        <filter id="mug-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <ellipse cx="58" cy="60" rx="40" ry="38" fill="rgba(25,10,0,0.5)" filter="url(#mug-blur)" />
      {/* 取っ手 */}
      <path d="M84 36 Q104 40 98 58 Q94 70 80 68" fill="none" stroke="#e7e0d2" strokeWidth="9" strokeLinecap="round" />
      <path d="M84 36 Q104 40 98 58 Q94 70 80 68" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="9" strokeLinecap="round" strokeDasharray="1 30" />
      <circle cx="50" cy="52" r="38" fill="url(#mug-body)" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <circle cx="50" cy="52" r="31" fill="url(#mug-coffee)" />
      <ellipse cx="40" cy="42" rx="12" ry="7" fill="#fff" opacity="0.18" transform="rotate(-25 40 42)" />
      <path d="M30 56 Q50 74 70 52" fill="none" stroke="#e8c9a0" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

export function Pencil({ length = 190 }: { length?: number }) {
  const h = length * 0.1;
  return (
    <svg width={length} height={h * 2} viewBox="0 0 190 38" style={{ overflow: "visible" }} aria-hidden>
      <defs>
        <filter id="pc-blur" x="-10%" y="-80%" width="120%" height="260%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <linearGradient id="pc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8d24a" />
          <stop offset="0.5" stopColor="#e9b52a" />
          <stop offset="1" stopColor="#b98816" />
        </linearGradient>
      </defs>
      <rect x="6" y="22" width="178" height="12" rx="5" fill="rgba(25,10,0,0.5)" filter="url(#pc-blur)" />
      <rect x="40" y="10" width="140" height="18" fill="url(#pc-body)" />
      <rect x="40" y="18" width="140" height="1.2" fill="rgba(110,70,0,0.45)" />
      {/* 消しゴムと金具 */}
      <rect x="170" y="10" width="14" height="18" rx="3" fill="#e98a8a" />
      <rect x="164" y="10" width="7" height="18" fill="#bfc4c8" />
      <line x1="166.5" y1="10" x2="166.5" y2="28" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      {/* 削った木と芯 */}
      <polygon points="40,10 40,28 14,19" fill="#e9c8a0" />
      <polygon points="40,10 40,13 28,14.6 28,23.4 40,25 40,28 14,19" fill="rgba(120,80,40,0.25)" />
      <polygon points="19,16.5 19,21.5 14,19" fill="#3a3a3c" />
    </svg>
  );
}

/** マスキングテープで貼ったラベル */
export function TapeLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block" style={{ filter: "drop-shadow(0 3px 3px rgba(25,10,0,0.35))", transform: "rotate(-1.6deg)" }}>
      <div
        className="px-9 py-2 text-[#3b2f24]"
        style={{
          background: "repeating-linear-gradient(135deg, #f6e7b4 0 10px, #f1dea0 10px 20px)",
          clipPath: "polygon(0 8%, 3% 0, 6% 8%, 9% 0, 12% 8%, 15% 0, 100% 0, 100% 100%, 15% 100%, 12% 92%, 9% 100%, 6% 92%, 3% 100%, 0 92%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
