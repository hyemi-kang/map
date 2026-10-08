"use client";

import { motion } from "motion/react";
import type { Area, Prefecture } from "@/data/types";
import Write, { chain } from "./Write";

type Props = {
  pref: Prefecture;
  areas: Area[];
  onPick: (areaId: string) => void;
};

/** 都県を選んだあと、ノートにペンで書かれるおすすめエリアの一覧 */
export default function PrefPage({ pref, areas, onPick }: Props) {
  const title = `${pref.ko} 추천 여행지`;
  const delays = chain([title, pref.note], 0.07, 0.9);
  const rowStart = delays[1] + Math.max(0.2, pref.note.length * 0.07) + 0.2;
  return (
    <div>
      <h2 className="text-[44px] leading-[68px]" style={{ fontFamily: "var(--font-hand)" }}>
        <Write text={title} delay={delays[0]} speed={0.07} />
        <span className="ml-3 text-[22px] opacity-60" style={{ fontFamily: "var(--font-ja)" }}>
          {pref.ja}
        </span>
      </h2>
      <p className="text-[21px] opacity-80">
        <Write text={pref.note} delay={delays[1]} speed={0.04} />
      </p>

      <ul className="mt-4 space-y-[2px]">
        {areas.map((a, i) => (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rowStart + i * 0.35, duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => onPick(a.id)}
              className="pen group block w-full rounded-md py-[2px] text-left transition-colors hover:bg-[rgba(255,230,120,0.45)]"
            >
              <span className="text-[30px]" style={{ fontFamily: "var(--font-hand)" }}>
                <Write text={`${i + 1}. ${a.ko}`} delay={rowStart + i * 0.35} speed={0.05} />
              </span>
              <span className="ml-2 text-[17px] opacity-60" style={{ fontFamily: "var(--font-ja)" }}>
                {a.ja}
              </span>
              <span className="block pl-5 text-[19px] leading-[26px] opacity-75">{a.tagline} · 추천 스팟 {a.spots.length}곳</span>
            </button>
          </motion.li>
        ))}
      </ul>
      <p className="mt-4 text-[18px] opacity-60">지도에서 색칠된 곳을 직접 눌러도 돼요.</p>
    </div>
  );
}
