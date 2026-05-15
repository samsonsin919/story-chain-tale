import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, BookPlus, Check, X as XIcon } from "lucide-react";
import { findIssues, applyIssue, applyAll, type Issue } from "@/lib/spellcheck";
import { MIN_SEG, MAX_SEG } from "@/lib/genres";

interface Props {
  dictionary: string[];
  onSubmit: (content: string) => Promise<void>;
  onAddDictionary?: (term: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Spellcheck-aware editor. Suggestions surface as chips below the textarea
 * — never auto-mutates the writer's voice.
 */
export function SpellcheckEditor({ dictionary, onSubmit, onAddDictionary, disabled, disabledReason }: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);

  const issues = useMemo<Issue[]>(() => {
    if (!enabled) return [];
    return findIssues(draft, dictionary).filter(
      (i) => !ignored.has(`${i.start}:${i.word}`),
    );
  }, [draft, dictionary, ignored, enabled]);

  const len = draft.trim().length;
  const inRange = len >= MIN_SEG && len <= MAX_SEG;
  const tooShort = len > 0 && len < MIN_SEG;
  const tooLong = len > MAX_SEG;

  function applySingle(issue: Issue) {
    setDraft((d) => applyIssue(d, issue));
  }
  function applyEverything() {
    setDraft((d) => applyAll(d, issues));
  }
  function ignore(issue: Issue) {
    setIgnored((s) => new Set(s).add(`${issue.start}:${issue.word}`));
  }
  async function addToDict(issue: Issue) {
    if (!onAddDictionary) return;
    try { await onAddDictionary(issue.word); } catch { /* noop */ }
    ignore(issue);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!inRange || busy) return;
    setBusy(true);
    try {
      await onSubmit(draft.trim());
      setDraft("");
      setIgnored(new Set());
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <div className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground">
        {disabledReason ?? "暫時無法接龍"}
      </div>
    );
  }

  const hasIssues = issues.length > 0;

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="relative">
        <textarea
          ref={ref}
          required
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="然後呢……"
          className={`w-full rounded-xl bg-[color:var(--surface-2)] border px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none text-base transition ${
            hasIssues
              ? "border-[color:var(--destructive)]/50"
              : "border-white/10"
          }`}
        />
        {hasIssues && (
          <span className="absolute top-2 right-3 inline-flex items-center gap-1 text-[10px] text-[color:var(--destructive)] bg-black/40 px-1.5 py-0.5 rounded-full">
            ● {issues.length}
          </span>
        )}
      </div>

      {/* Suggestions */}
      {hasIssues && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">建議</span>
            <button
              type="button"
              onClick={applyEverything}
              className="text-[11px] text-[color:var(--glow)] hover:underline"
            >
              全部採用
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {issues.slice(0, 8).map((i) => (
              <span key={`${i.start}-${i.word}`} className="typo-chip">
                <span className="line-through opacity-70">{i.word}</span>
                <span>→</span>
                <span className="text-foreground font-medium">{i.suggestion}</span>
                <button type="button" onClick={() => applySingle(i)} title="採用" aria-label="採用">
                  <Check className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => ignore(i)} title="忽略" aria-label="忽略">
                  <XIcon className="w-3 h-3" />
                </button>
                {onAddDictionary && i.kind === "typo" && (
                  <button type="button" onClick={() => addToDict(i)} title="加入字典" aria-label="加入字典">
                    <BookPlus className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className={`tabular-nums ${tooLong ? "text-destructive" : tooShort ? "text-muted-foreground" : "text-[color:var(--glow)]"}`}>
          {len} / {MAX_SEG}
          <span className="text-muted-foreground ml-2">最少 {MIN_SEG}</span>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border transition ${
            enabled
              ? "border-[color:var(--glow)]/50 text-[color:var(--glow)] bg-[color:var(--glow)]/10"
              : "border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-3 h-3" />
          智能建議 {enabled ? "開" : "關"}
        </button>
      </div>

      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(100, (len / MAX_SEG) * 100)}%`,
            background: tooLong
              ? "var(--destructive)"
              : inRange
              ? "linear-gradient(90deg, var(--glow), var(--violet))"
              : "color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
          }}
        />
      </div>

      <button type="submit" disabled={!inRange || busy} className="btn-neon w-full">
        <Send className="w-4 h-4" />
        {busy ? "送出中…" : "接上這一段"}
      </button>
    </form>
  );
}
