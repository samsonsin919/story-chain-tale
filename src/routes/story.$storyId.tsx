import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { getGenre, relativeTime, MIN_SEG, MAX_SEG } from "@/lib/genres";
import { toast } from "sonner";
import { Heart, Bot, ChevronLeft, Send, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/story/$storyId")({ component: StoryPage });

interface Segment {
  id: string;
  position: number;
  content: string;
  author_id: string | null;
  is_ai: boolean;
  created_at: string;
}

function StoryPage() {
  const { storyId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const [{ data: story, error: e1 }, { data: segs, error: e2 }] = await Promise.all([
        supabase.from("stories").select("*").eq("id", storyId).single(),
        supabase.from("story_segments").select("*").eq("story_id", storyId).order("position", { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const segments = (segs ?? []) as Segment[];
      const humanIds = Array.from(
        new Set([story.created_by, ...segments.filter((s) => s.author_id).map((s) => s.author_id!)]),
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", humanIds);
      const names: Record<string, string> = {};
      (profiles ?? []).forEach((p) => { names[p.id] = p.display_name; });

      // Likes counts
      const segIds = segments.map((s) => s.id);
      let likeCounts: Record<string, number> = {};
      let mine = new Set<string>();
      if (segIds.length) {
        const { data: likes } = await supabase
          .from("segment_likes")
          .select("segment_id,user_id")
          .in("segment_id", segIds);
        (likes ?? []).forEach((l) => {
          likeCounts[l.segment_id] = (likeCounts[l.segment_id] ?? 0) + 1;
          if (user && l.user_id === user.id) mine.add(l.segment_id);
        });
      }

      return { story, segments, names, likeCounts, mine };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`story-${storyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_segments", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story", storyId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "segment_likes" },
        () => qc.invalidateQueries({ queryKey: ["story", storyId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, qc]);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const nextPosition = useMemo(() => {
    if (!data) return 1;
    return (data.segments[data.segments.length - 1]?.position ?? 0) + 1;
  }, [data]);

  const lastSeg = data?.segments[data?.segments.length - 1];
  const justMine = !!(user && lastSeg && lastSeg.author_id === user.id);
  const done = !!data && data.segments.length >= data.story.max_segments;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !data) return;
    const content = draft.trim();
    if (content.length < MIN_SEG || content.length > MAX_SEG) {
      toast.error(`字數需要 ${MIN_SEG}–${MAX_SEG} 字`);
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from("story_segments").insert({
        story_id: storyId,
        author_id: user.id,
        content,
        position: nextPosition,
        is_ai: false,
      });
      if (error) throw error;
      setDraft("");
      toast.success("接上咗一段 ✦");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "失敗");
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(segId: string, liked: boolean) {
    if (!user) { toast.error("登入後先可以畀心"); return; }
    if (liked) {
      await supabase.from("segment_likes").delete().eq("segment_id", segId).eq("user_id", user.id);
    } else {
      await supabase.from("segment_likes").insert({ segment_id: segId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["story", storyId] });
  }

  async function deleteSegment(segId: string) {
    if (!confirm("確定刪除呢段？")) return;
    const { error } = await supabase.from("story_segments").delete().eq("id", segId);
    if (error) return toast.error(error.message);
    toast.success("已刪");
    qc.invalidateQueries({ queryKey: ["story", storyId] });
  }

  async function deleteStory() {
    if (!data || !user) return;
    if (!confirm(`確定刪除《${data.story.title}》？所有段落都會消失。`)) return;
    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    if (error) return toast.error(error.message);
    toast.success("已刪");
    nav({ to: "/" });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="text-center text-sm text-muted-foreground py-20 animate-pulse">載入中…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="cinema-card max-w-md mx-auto mt-20 p-8 text-center">
          <p className="text-sm text-muted-foreground">揾唔到呢個故事</p>
          <Link to="/" className="btn-neon mt-4 inline-flex">返首頁</Link>
        </div>
      </div>
    );
  }

  const g = getGenre(data.story.genre);
  const progress = Math.round((data.segments.length / data.story.max_segments) * 100);
  const isOwner = user?.id === data.story.created_by;

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> 返列表
        </Link>

        {/* Story header */}
        <header className="cinema-card p-5 sm:p-7 mb-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0">{data.story.cover_emoji ?? g?.emoji ?? "✦"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {g && <span className="pill text-[10px]">{g.label}</span>}
                {done && (
                  <span className="pill text-[10px] bg-[color:var(--ember)]/15 text-[color:var(--ember)]">
                    ✦ 完結
                  </span>
                )}
              </div>
              <h1 className="font-cinematic text-3xl sm:text-4xl text-gradient leading-tight">
                《{data.story.title}》
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                由 {data.names[data.story.created_by] ?? "匿名旅人"} 開創 · {relativeTime(data.story.created_at)}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[color:var(--violet)] to-[color:var(--glow)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {data.segments.length} / {data.story.max_segments}
                </span>
              </div>
              {isOwner && (
                <button onClick={deleteStory} className="mt-3 text-xs text-muted-foreground hover:text-[color:var(--ember)] inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> 刪除整個故事
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Opening */}
        <article className="cinema-card p-5 mb-3">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ember)] mb-2">EP. 00 · 開場</div>
          <p className="font-display text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
            {data.story.opening}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 text-right">
            — {data.names[data.story.created_by] ?? "匿名旅人"}
          </p>
        </article>

        {/* Segments */}
        <ol className="space-y-3">
          {data.segments.map((s) => {
            const likes = data.likeCounts[s.id] ?? 0;
            const liked = data.mine.has(s.id);
            const isMine = user && s.author_id === user.id;
            return (
              <li
                key={s.id}
                className={`cinema-card p-5 ${
                  s.is_ai ? "border-[color:var(--violet)]/40 bg-[color:var(--violet)]/[0.04]" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground tabular-nums">
                    EP. {String(s.position).padStart(2, "0")}
                  </span>
                  {s.is_ai ? (
                    <span className="pill text-[10px] bg-[color:var(--violet)]/15 text-[color:var(--violet)] inline-flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> AI 接續
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {data.names[s.author_id ?? ""] ?? "匿名"}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">· {relativeTime(s.created_at)}</span>
                </div>
                <p className="font-display text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {s.content}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(s.id, liked)}
                    className={`inline-flex items-center gap-1 text-xs transition ${
                      liked ? "text-[color:var(--ember)]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                    {likes > 0 && <span className="tabular-nums">{likes}</span>}
                  </button>
                  {isMine && (
                    <button
                      onClick={() => deleteSegment(s.id)}
                      className="text-xs text-muted-foreground hover:text-[color:var(--ember)] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {done && (
          <div className="cinema-card mt-6 p-6 text-center border-[color:var(--ember)]/30">
            <Sparkles className="w-5 h-5 text-[color:var(--ember)] mx-auto mb-2" />
            <p className="font-display text-lg text-gradient">完結 · 第 {data.story.max_segments} 段</p>
            <p className="text-sm text-muted-foreground mt-1">呢條時間線已經完整。</p>
          </div>
        )}
      </main>

      {/* Compose */}
      {!done && (
        <div className="fixed bottom-0 inset-x-0 z-30 glass border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-3">
            {!user ? (
              <div className="text-center text-sm text-muted-foreground py-3">
                <Link to="/auth" className="text-[color:var(--glow)] underline">登入</Link> 後就可以接龍
              </div>
            ) : justMine ? (
              <div className="text-center text-sm text-muted-foreground py-3">
                你啱啱接過一段，等其他人或 AI 接落去 ☕
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  maxLength={MAX_SEG}
                  placeholder={`接住第 ${nextPosition} 段（${MIN_SEG}–${MAX_SEG} 字）…`}
                  className="w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] tabular-nums ${draft.length < MIN_SEG || draft.length > MAX_SEG ? "text-[color:var(--ember)]" : "text-muted-foreground"}`}>
                    {draft.length} / {MAX_SEG}
                  </span>
                  <button
                    type="submit"
                    disabled={posting || draft.trim().length < MIN_SEG}
                    className="btn-neon !py-2 !px-4 text-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> 接落去
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
