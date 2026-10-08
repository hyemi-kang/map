"use client";

import { useEffect, useRef, useState } from "react";
import PaperMap from "./map/PaperMap";
import { japanView, prefRect, fitView } from "@/lib/views";

export default function App() {
  const ref = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.6);
  const [stage, setStage] = useState<"japan" | "kanagawa">("japan");
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setAspect(el.clientWidth / el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const view = stage === "japan" ? japanView(aspect) : fitView(prefRect("kanagawa"), aspect, 1.2);
  return (
    <div ref={ref} style={{ position: "fixed", inset: 0 }}>
      <PaperMap
        className="size-full"
        view={view}
        layer={stage === "japan" ? { level: "japan" } : { level: "pref", prefId: "kanagawa" }}
        onPick={(id) => id === "kanagawa" && setStage("kanagawa")}
      />
      <button style={{ position: "absolute", left: 12, top: 12 }} onClick={() => setStage("japan")}>back</button>
    </div>
  );
}
