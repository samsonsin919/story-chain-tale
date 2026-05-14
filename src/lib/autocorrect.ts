// Simple auto-correct dictionary inspired by Word/Excel.
// Triggers when the user types a boundary char (space, punctuation, newline).
// Returns { text, replaced } where replaced lists the corrections applied.

type Rule = { from: string; to: string };

// Common English typos
const EN: Rule[] = [
  { from: "teh", to: "the" },
  { from: "Teh", to: "The" },
  { from: "adn", to: "and" },
  { from: "recieve", to: "receive" },
  { from: "seperate", to: "separate" },
  { from: "definately", to: "definitely" },
  { from: "occured", to: "occurred" },
  { from: "untill", to: "until" },
  { from: "wich", to: "which" },
  { from: "youre", to: "you're" },
  { from: "dont", to: "don't" },
  { from: "cant", to: "can't" },
  { from: "wont", to: "won't" },
  { from: "im", to: "I'm" },
  { from: "Im", to: "I'm" },
  { from: "i", to: "I" }, // standalone
];

// Common Chinese (Trad/HK) 錯字、語感修正
const ZH: Rule[] = [
  { from: "在見", to: "再見" },
  { from: "在來", to: "再來" },
  { from: "在一次", to: "再一次" },
  { from: "做什麼", to: "做甚麼" }, // optional, HK style — keep gentle
  { from: "好像", to: "好像" }, // no-op placeholder
  { from: "他門", to: "他們" },
  { from: "她門", to: "她們" },
  { from: "我門", to: "我們" },
  { from: "因該", to: "應該" },
  { from: "突燃", to: "突然" },
  { from: "忽燃", to: "忽然" },
  { from: "聲因", to: "聲音" },
  { from: "黑暗", to: "黑暗" },
  { from: "拼命", to: "拚命" },
  { from: "迷迷胡胡", to: "迷迷糊糊" },
  { from: "模模糊糊", to: "模模糊糊" },
  { from: "藍色色", to: "藍色" },
];

// Punctuation normalization (full-width preferred for Chinese context)
const PUNCT: Rule[] = [
  { from: ",,", to: "，" },
  { from: "。。", to: "。" },
  { from: "!!", to: "！" },
  { from: "??", to: "？" },
  { from: "...", to: "……" },
  { from: " ， ", to: "，" },
  { from: " 。 ", to: "。" },
];

const EN_MAP = new Map(EN.map((r) => [r.from, r.to]));
const ZH_RULES = ZH.filter((r) => r.from !== r.to);

const BOUNDARY = /[\s，。！？、；：\.\,\!\?\;\:\n\r"'()\[\]「」『』]/;

export interface AutoCorrectResult {
  text: string;
  changes: Array<{ from: string; to: string }>;
}

/**
 * Run auto-correct only when the latest character typed is a boundary
 * (space / punctuation / newline). Operates on the word just before that
 * boundary plus a few global ZH/punctuation passes.
 */
export function autoCorrect(prev: string, next: string): AutoCorrectResult {
  const changes: Array<{ from: string; to: string }> = [];

  // Only trigger if user just added text and the last char is a boundary.
  if (next.length <= prev.length) return { text: next, changes };
  const lastChar = next[next.length - 1];
  if (!BOUNDARY.test(lastChar)) return { text: next, changes };

  let result = next;

  // 1) English word fix on the token immediately before the boundary
  const beforeBoundary = result.slice(0, -1);
  const m = beforeBoundary.match(/([A-Za-z']+)$/);
  if (m) {
    const word = m[1];
    const replacement = EN_MAP.get(word);
    if (replacement && replacement !== word) {
      result = beforeBoundary.slice(0, -word.length) + replacement + lastChar;
      changes.push({ from: word, to: replacement });
    }
  }

  // 2) Chinese rules — scan whole text, apply once per rule
  for (const r of ZH_RULES) {
    if (result.includes(r.from)) {
      result = result.split(r.from).join(r.to);
      changes.push({ from: r.from, to: r.to });
    }
  }

  // 3) Punctuation normalization
  for (const r of PUNCT) {
    if (result.includes(r.from)) {
      result = result.split(r.from).join(r.to);
      changes.push({ from: r.from, to: r.to });
    }
  }

  return { text: result, changes };
}
