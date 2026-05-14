import { useEffect, useRef, useState, type FormEvent } from "react";
import { Feather, Send, X, BookOpen, Sparkles } from "lucide-react";
import { MIN_SEG, MAX_SEG } from "@/lib/genres";
import { autoCorrect } from "@/lib/autocorrect";

export interface ContextSegment {
  position: number; // 0 = opening
  authorName: string;
  content: string;
}

interface Props {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  /** Opening + recent segments to show inside the writing drawer. Newest last. */
  context?: ContextSegment[];
  storyTitle?: string;
}

export function ComposeSegment({ onSubmit, disabled, disabledReason, context = [], storyTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoFixOn, setAutoFixOn] = useState(true);
  const [lastFix, setLastFix] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fixTimer = useRef<number | null>(null);

  const len = draft.trim().length;
  const inRange = len >= MIN_SEG && len <= MAX_SEG;
  const tooShort = len > 0 && len < MIN_SEG;
  const tooLong = len > MAX_SEG;

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 80);
  }, [open]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    if (!autoFixOn) { setDraft(next); return; }
    const { text, changes } = autoCorrect(draft, next);
    setDraft(text);
    if (changes.length > 0) {
      const c = changes[changes.length - 1];
      setLastFix(`${c.from} → ${c.to}`);
      if (fixTimer.current) window.clearTimeout(fixTimer.current);
      fixTimer.current = window.setTimeout(() => setLastFix(null), 1800);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!inRange || busy) return;
    setBusy(true);
    try {
      await onSubmit(draft.trim());
      setDraft("");
      setOpen(false);
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

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="btn-neon fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-30 animate-glow-pulse"
        >
          <Feather className="w-4 h-4" />
          接落去
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/70 backdrop-blur-sm animate-drift-in"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl glass rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col max-h-[92vh]"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-white/5">
              <div className="min-w-0">
                <h3 className="font-display text-2xl text-gradient truncate">接下去寫…</h3>
                {storyTitle && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">《{storyTitle}》</p>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 -m-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story context (scrollable) — keeps writer in flow */}
            {context.length > 0 && (
              <div className="px-5 sm:px-6 pt-3 overflow-y-auto" style={{ maxHeight: "32vh" }}>
                <div className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-[color:var(--ember)] mb-2">
                  <BookOpen className="w-3 h-3" />
                  劇情回顧
                </div>
                <div className="space-y-2.5">
                  {context.map((c) => (
                    <div
                      key={c.position}
                      className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5"
                    >
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {c.position === 0 ? "開場" : `第 ${c.position} 段`} · {c.authorName}
                      </div>
                      <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap line-clamp-4">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3" />
              </div>
            )}

            {/* Editor */}
            <div className="px-5 sm:px-6 pb-4">
              <textarea
                ref={ref}
                required
                rows={5}
                value={draft}
                onChange={handleChange}
                placeholder="然後呢……"
                className="w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none text-base"
              />

              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <div className={`tabular-nums ${tooLong ? "text-destructive" : tooShort ? "text-muted-foreground" : "text-[color:var(--glow)]"}`}>
                  {len} / {MAX_SEG}
                  <span className="text-muted-foreground ml-2">最少 {MIN_SEG}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoFixOn((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border transition ${
                    autoFixOn
                      ? "border-[color:var(--glow)]/50 text-[color:var(--glow)] bg-[color:var(--glow)]/10"
                      : "border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                  title="即時改錯"
                >
                  <Sparkles className="w-3 h-3" />
                  自動修正 {autoFixOn ? "開" : "關"}
                </button>
              </div>

              {/* Length progress bar */}
              <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
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

              {/* Last fix toast (inline) */}
              <div className="h-5 mt-1.5 text-[11px] text-muted-foreground">
                {lastFix && (
                  <span className="inline-flex items-center gap-1 text-[color:var(--glow)] animate-drift-in">
                    <Sparkles className="w-3 h-3" />
                    已修正：{lastFix}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!inRange || busy}
                className="btn-neon w-full mt-2"
              >
                <Send className="w-4 h-4" />
                {busy ? "送出中…" : "接上這一段"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
