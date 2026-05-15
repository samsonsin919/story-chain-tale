import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

interface Props {
  storyTitle: string;
  nextPosition: number;
  lastSegmentExcerpt: string;
  characters: string[];
  recap: string | null;
  onDone: () => void;
}

/**
 * Pre-writing focus overlay. Shows ~3s countdown with key context so the
 * writer slips into the story before typing.
 */
export function FocusIntro({ storyTitle, nextPosition, lastSegmentExcerpt, characters, recap, onDone }: Props) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4">
      <div className="relative max-w-md w-full glass rounded-3xl border-white/10 p-6 sm:p-8">
        <button
          type="button"
          onClick={onDone}
          aria-label="略過"
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-[color:var(--violet)] text-[11px] tracking-[0.3em] uppercase mb-4">
          <Sparkles className="w-3 h-3" /> 進入故事
        </div>

        <h2 className="font-display text-3xl text-gradient text-glow leading-tight">
          《{storyTitle}》
        </h2>
        <p className="text-xs text-muted-foreground mt-1">你將接的是第 {nextPosition} 段</p>

        <div className="space-y-3 mt-5 text-sm">
          {recap && (
            <div className="rounded-xl bg-[color:var(--violet)]/10 border border-[color:var(--violet)]/30 px-3 py-2.5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--violet)] mb-1">前情提要</div>
              <p className="text-foreground/90 leading-relaxed text-[13px] line-clamp-4">{recap}</p>
            </div>
          )}

          {lastSegmentExcerpt && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ember)] mb-1">上一段</div>
              <p className="text-foreground/85 leading-relaxed text-[13px] line-clamp-3">{lastSegmentExcerpt}</p>
            </div>
          )}

          {characters.length > 0 && (
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">主要角色</div>
              <div className="flex flex-wrap gap-1.5">
                {characters.slice(0, 6).map((c) => (
                  <span key={c} className="pill pill-violet">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={onDone} className="btn-neon w-full mt-6">
          開始寫 → ({count})
        </button>
        <p className="text-center text-[11px] text-muted-foreground mt-2">點任何位置即可略過</p>
      </div>
    </div>
  );
}
