// Non-destructive spellcheck. Returns an Issue[] for the editor to surface.
// Does NOT mutate the user's text — the writer chooses to apply or ignore.

export interface Issue {
  start: number;
  end: number;
  word: string;
  suggestion: string;
  kind: "typo" | "punct";
}

const EN_MAP: Record<string, string> = {
  teh: "the", Teh: "The", adn: "and",
  recieve: "receive", seperate: "separate",
  definately: "definitely", occured: "occurred",
  untill: "until", wich: "which",
  youre: "you're", dont: "don't", cant: "can't", wont: "won't",
  im: "I'm", Im: "I'm",
};

const ZH_MAP: Array<[string, string]> = [
  ["在見", "再見"],
  ["在來", "再來"],
  ["在一次", "再一次"],
  ["他門", "他們"],
  ["她門", "她們"],
  ["我門", "我們"],
  ["因該", "應該"],
  ["突燃", "突然"],
  ["忽燃", "忽然"],
  ["聲因", "聲音"],
  ["迷迷胡胡", "迷迷糊糊"],
];

const PUNCT_MAP: Array<[string, string]> = [
  [",,", "，"],
  ["。。", "。"],
  ["!!", "！"],
  ["??", "？"],
  ["...", "……"],
];

/**
 * Find all issues. `dictionary` is a list of story-specific terms that must
 * never be flagged (character names, places, slang).
 */
export function findIssues(text: string, dictionary: string[] = []): Issue[] {
  const out: Issue[] = [];
  const dictSet = new Set(dictionary);

  // English typos — match standalone tokens
  const enRe = /[A-Za-z']+/g;
  let m: RegExpExecArray | null;
  while ((m = enRe.exec(text)) !== null) {
    const w = m[0];
    if (dictSet.has(w)) continue;
    const sug = EN_MAP[w];
    if (sug && sug !== w) {
      out.push({ start: m.index, end: m.index + w.length, word: w, suggestion: sug, kind: "typo" });
    }
  }

  // Chinese typos — substring scan
  for (const [from, to] of ZH_MAP) {
    if (dictSet.has(from)) continue;
    let i = 0;
    while ((i = text.indexOf(from, i)) !== -1) {
      out.push({ start: i, end: i + from.length, word: from, suggestion: to, kind: "typo" });
      i += from.length;
    }
  }

  // Punctuation
  for (const [from, to] of PUNCT_MAP) {
    let i = 0;
    while ((i = text.indexOf(from, i)) !== -1) {
      out.push({ start: i, end: i + from.length, word: from, suggestion: to, kind: "punct" });
      i += from.length;
    }
  }

  // Sort by position so the editor can show them in order
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** Apply a single issue's suggestion to text, returning the new string. */
export function applyIssue(text: string, issue: Issue): string {
  return text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end);
}

/** Apply all issues left-to-right, accounting for length shifts. */
export function applyAll(text: string, issues: Issue[]): string {
  let result = text;
  let offset = 0;
  for (const i of issues) {
    const start = i.start + offset;
    const end = i.end + offset;
    result = result.slice(0, start) + i.suggestion + result.slice(end);
    offset += i.suggestion.length - (end - start);
  }
  return result;
}
