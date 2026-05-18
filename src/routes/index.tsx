import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { getGenre, relativeTime } from "@/lib/genres";
import { Sparkles, Plus, BookOpen, Bot } from "lucide-react";

export const Route = createFileRoute("/")({ component: HomePage });

interface StoryRow {
  id: string;
  title: string;
  opening: string;
  genre: string | null;
  cover_emoji: string | null;
  created_at: string;
  last_activity_at: string;
  max_segments: number;
}

function HomePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("id,title,opening,genre,cover_emoji,created_at,last_activity_at,max_segments")
        .order("last_activity_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const ids = (stories ?? []).map((s) => s.id);
      let counts: Record<string, { total: number; ai: number }> = {};
      if (ids.length) {
        const { data: segs } = await supabase
          .from("story_segments")
          .select("story_id,is_ai")
          .in("story_id", ids);
        (segs ?? []).forEach((r) => {
          const c = counts[r.story_id] ?? { total: 0, ai: 0 };
          c.total += 1;
          if (r.is_ai) c.ai += 1;
          counts[r.story_id] = c;
        });
      }
      return { stories: (stories ?? []) as StoryRow[], counts };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("home-stories")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" },
        () => qc.invalidateQueries({ queryKey: ["stories"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "story_segments" },
        () => qc.invalidateQueries({ queryKey: ["stories"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-12">
        <section className="mb-10">
          <div className="flex items-center gap-2 text-[color:var(--violet)] mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs tracking-[0.25em] uppercase">午夜故事接龍</span>
          </div>
          <h1 className="font-cinematic text-4xl sm:text-5xl text-gradient leading-tight">
            一句話，分裂出無數結局
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            開一個故事，等陌生人接落去。如果 15 分鐘無人接，AI 會幫你寫一段，直到第 50 段為止。
          </p>
          <div className="mt-5 flex gap-2">
            <Link to="/new" className="btn-neon">
              <Plus className="w-4 h-4" /> 開新故事
            </Link>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">最近活躍嘅故事</h2>
            <span className="text-xs text-muted-foreground">{data?.stories.length ?? 0} 個</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">載入中…</p>
          ) : !data?.stories.length ? (
            <div className="cinema-card p-8 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">仲未有故事。做第一個開故事嘅人？</p>
              <Link to="/new" className="btn-neon mt-4 inline-flex">開新故事</Link>
            </div>
          ) : (
            <ul className="grid gap-3">
              {data.stories.map((s) => {
                const g = getGenre(s.genre);
                const c = data.counts[s.id] ?? { total: 0, ai: 0 };
                const progress = Math.min(100, Math.round((c.total / s.max_segments) * 100));
                const done = c.total >= s.max_segments;
                return (
                  <li key={s.id}>
                    <Link
                      to="/story/$storyId"
                      params={{ storyId: s.id }}
                      className="cinema-card block p-4 sm:p-5 hover:border-[color:var(--glow)]/40 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">{s.cover_emoji ?? g?.emoji ?? "✦"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {g && (
                              <span className="pill text-[10px]">
                                {g.label}
                              </span>
                            )}
                            {done && (
                              <span className="pill text-[10px] bg-[color:var(--ember)]/15 text-[color:var(--ember)]">
                                ✦ 完結
                              </span>
                            )}
                            {c.ai > 0 && (
                              <span className="pill text-[10px] bg-[color:var(--violet)]/15 text-[color:var(--violet)] inline-flex items-center gap-1">
                                <Bot className="w-2.5 h-2.5" /> AI 接過 {c.ai}
                              </span>
                            )}
                          </div>
                          <h3 className="font-display text-lg leading-tight group-hover:text-gradient truncate">
                            《{s.title}》
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.opening}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[color:var(--violet)] to-[color:var(--glow)]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {c.total} / {s.max_segments} 段
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {relativeTime(s.last_activity_at)}更新
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
