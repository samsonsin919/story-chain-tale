import { useState } from "react";
import { Heart, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { relativeTime } from "@/lib/genres";

interface Props {
  id: string;
  position: number;
  content: string;
  authorName: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  onChanged?: () => void;
}

export function SegmentCard({ id, position, content, authorName, createdAt, likes, likedByMe, onChanged }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(likedByMe);
  const [optimisticCount, setOptimisticCount] = useState(likes);

  async function toggleLike() {
    if (!user) { toast.message("登入後就可以 ❤"); return; }
    if (busy) return;
    setBusy(true);
    const next = !optimisticLiked;
    setOptimisticLiked(next);
    setOptimisticCount((c) => c + (next ? 1 : -1));
    try {
      if (next) {
        const { error } = await supabase.from("segment_likes").insert({ segment_id: id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("segment_likes").delete().eq("segment_id", id).eq("user_id", user.id);
        if (error) throw error;
      }
      onChanged?.();
    } catch (e) {
      // revert
      setOptimisticLiked(!next);
      setOptimisticCount((c) => c + (next ? -1 : 1));
      toast.error(e instanceof Error ? e.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="cinema-card p-5 sm:p-6 animate-drift-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[color:var(--violet)] to-[color:var(--glow)] flex items-center justify-center text-sm font-semibold text-[oklch(0.12_0.02_280)]">
          {authorName.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{authorName}</div>
          <div className="text-xs text-muted-foreground">第 {position} 段 · {relativeTime(createdAt)}</div>
        </div>
      </div>
      <p className="leading-loose text-[1.05rem] whitespace-pre-wrap font-display text-foreground/95">
        {content}
      </p>
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={toggleLike}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 transition ${optimisticLiked ? "text-[color:var(--ember)]" : "hover:text-foreground"}`}
          aria-label="like"
        >
          <Heart className={`w-4 h-4 ${optimisticLiked ? "fill-current" : ""}`} />
          {optimisticCount}
        </button>
        <button
          className="inline-flex items-center gap-1.5 hover:text-[color:var(--violet)] transition opacity-60 cursor-not-allowed"
          title="分支宇宙（即將推出）"
          disabled
        >
          <GitBranch className="w-4 h-4" />
          開分支
        </button>
      </div>
    </article>
  );
}
