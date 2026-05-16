import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ensureRecap } from "@/lib/recap.functions";
import { Sparkles } from "lucide-react";

interface Props {
  storyId: string;
  /** Total segments (excluding opening). */
  segCount: number;
  /** Latest existing recap, if any. */
  recap: { content: string; up_to_position: number } | null;
  onGenerated?: () => void;
}

/**
 * Shows the latest AI recap for a story, and auto-generates one whenever the
 * segment count crosses a multiple of 5 and no recap covers that milestone yet.
 */
export function StoryRecap({ storyId, segCount, recap, onGenerated }: Props) {
  const ensure = useServerFn(ensureRecap);
  const triedRef = useRef<Set<number>>(new Set());

  // Latest milestone reached (every 5 segs).
  const milestone = Math.floor(segCount / 5) * 5;

  const m = useMutation({
    mutationFn: (upTo: number) => ensure({ data: { storyId, upToPosition: upTo } }),
    onSuccess: (res) => {
      if (res.generated) onGenerated?.();
    },
  });

  useEffect(() => {
    if (milestone < 5) return;
    if (recap?.up_to_position === milestone) return;
    if (triedRef.current.has(milestone)) return;
    triedRef.current.add(milestone);
    m.mutate(milestone);
  }, [milestone, recap?.up_to_position]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recap && !m.isPending) return null;

  return (
    <div className="cinema-card p-5 mb-4 border-[color:var(--violet)]/30 bg-gradient-to-br from-[color:var(--violet)]/5 to-transparent">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--violet)]">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-[10px] tracking-[0.25em] uppercase">前情提要 · AI</span>
        {recap && <span className="text-[10px] text-muted-foreground">— 截至第 {recap.up_to_position} 段</span>}
      </div>
      {m.isPending && !recap ? (
        <p className="text-sm text-muted-foreground italic animate-pulse">AI 正在重看整個宇宙…</p>
      ) : (
        <p className="text-[0.95rem] leading-relaxed text-foreground/90 font-display">{recap!.content}</p>
      )}
    </div>
  );
}
