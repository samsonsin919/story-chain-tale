import { useEffect, useRef, useState, type FormEvent } from "react";
import { Feather, Send, X } from "lucide-react";
import { MIN_SEG, MAX_SEG } from "@/lib/genres";

interface Props {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

export function ComposeSegment({ onSubmit, disabled, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const len = draft.trim().length;
  const inRange = len >= MIN_SEG && len <= MAX_SEG;
  const tooShort = len > 0 && len < MIN_SEG;
  const tooLong = len > MAX_SEG;

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 80);
  }, [open]);

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
      {/* Floating trigger (mobile + desktop) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="btn-neon fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-30 animate-glow-pulse"
        >
          <Feather className="w-4 h-4" />
          接落去
        </button>
      )}

      {/* Drawer / sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm animate-drift-in"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl glass rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-white/10"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-2xl text-gradient">接下去寫…</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-2 -m-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              ref={ref}
              required
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="然後呢……"
              className="w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none text-base"
            />

            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <div className={`tabular-nums ${tooLong ? "text-destructive" : tooShort ? "text-muted-foreground" : "text-[color:var(--glow)]"}`}>
                {len} / {MAX_SEG}
                <span className="text-muted-foreground ml-2">最少 {MIN_SEG}</span>
              </div>
              <div className="text-muted-foreground hidden sm:block">
                {tooShort && `再寫 ${MIN_SEG - len} 字`}
                {tooLong && `超出 ${len - MAX_SEG} 字`}
                {inRange && "節奏剛剛好 ✦"}
              </div>
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

            <button
              type="submit"
              disabled={!inRange || busy}
              className="btn-neon w-full mt-4"
            >
              <Send className="w-4 h-4" />
              {busy ? "送出中…" : "接上這一段"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
