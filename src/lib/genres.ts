export const GENRES = [
  { id: "mystery",  label: "懸疑",     emoji: "🕯️", tone: "violet" },
  { id: "horror",   label: "恐怖",     emoji: "👁️", tone: "ember"  },
  { id: "romance",  label: "戀愛",     emoji: "💔", tone: "ember"  },
  { id: "scifi",    label: "科幻",     emoji: "🛸", tone: "neon"   },
  { id: "urban",    label: "都市傳說", emoji: "🌃", tone: "violet" },
  { id: "fantasy",  label: "奇幻",     emoji: "🜂", tone: "neon"   },
] as const;

export type GenreId = typeof GENRES[number]["id"];

export function getGenre(id: string | null | undefined) {
  return GENRES.find((g) => g.id === id);
}

export function genrePillClass(tone: string | undefined) {
  if (tone === "ember")  return "pill pill-ember";
  if (tone === "violet") return "pill pill-violet";
  return "pill";
}

// Segment composition rules
export const MIN_SEG = 80;
export const MAX_SEG = 150;

export function relativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-Hant");
}
