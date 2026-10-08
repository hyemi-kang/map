import credits from "@/data/photo-credits.json";

export type Credit = { file: string; author: string; license: string; source: string; title: string };
export type Photo = Credit & { src: string };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const photoOf = (spotId: string): Photo | null => {
  const c = (credits as Record<string, Credit>)[spotId];
  return c ? { ...c, src: `${BASE}/photos/${c.file}` } : null;
};
