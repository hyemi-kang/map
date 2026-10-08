"use client";

import type { ReactNode } from "react";

/** 罫線入りのノート。左端にスパイラルの穴、紙の端に少し影 */
export default function Notebook({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`notebook-paper pen-area relative size-full overflow-hidden rounded-[10px_16px_16px_10px] ${className ?? ""}`}
      style={{ boxShadow: "0 2px 3px rgba(40,25,10,0.3), 0 22px 40px rgba(25,12,0,0.5), inset -2px 0 4px rgba(120,90,50,0.15)" }}
    >
      {/* スパイラル */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[30px]">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="absolute left-[7px] block h-[14px] w-[24px] rounded-full"
            style={{
              top: `calc(${(i + 0.5) * (100 / 18)}% - 7px)`,
              background: "linear-gradient(180deg,#e9e9ea,#8e949a 55%,#d9dcde)",
              boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.5)",
              transform: "rotate(-4deg)",
            }}
          >
            <span className="absolute left-[4px] top-[3px] h-[8px] w-[8px] rounded-full bg-[#4a2f18] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]" />
          </span>
        ))}
      </div>
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-8 pl-[72px] pr-5 pt-5" style={{ lineHeight: "34px", scrollbarWidth: "thin" }}>
        {children}
      </div>
    </div>
  );
}
