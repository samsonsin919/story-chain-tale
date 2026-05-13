import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StoryCard, type StoryCardData } from "@/components/StoryCard";
import { GENRES, getGenre } from "@/lib/genres";
import { Flame, Sparkles, Plus } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

interface StoryRow {
  id: string;
  title: string;
  opening: string;
  created_at: string;
  created_by: string;
  genre: string | null;
  cover_emoji: string | null;
  is_featured: boolean;
}

function Index() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async (): Promise<StoryCardData[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as StoryRow[];
      const ids = rows.map((s) => s.id);
      let counts: Record<string, number> = {};
      let contribs: Record<string, Set<string>> = {};
      if (ids.length) {
        const { data: segs } = await supabase
          .from("story_segments")
          .select("story_id, author_id")
          .in("story_id", ids);
        for (const r of segs ?? []) {
          counts[r.story_id] = (counts[r.story_id] ?? 0) + 1;
          (contribs[r.story_id] ??= new Set()).add(r.author_id);
        }
      }
      // include opener as contributor
      const now = Date.now();
      return rows.map((s) => {
        const set = contribs[s.id] ?? new Set();
        set.add(s.created_by);
        const seg = counts[s.id] ?? 0;
        return {
          id: s.id,
          title: s.title,
          opening: s.opening,
          genre: s.genre,
          cover_emoji: s.cover_emoji,
          segCount: seg,
          contributors: set.size,
          isHot: seg >= 4 || set.size >= 3,
          isNew: now - new Date(s.created_at).getTime() < 1000 * 60 * 60 * 24 * 2,
        };
      });
    },
  });

  const featured = useMemo(() => {
    if (!stories?.length) return null;
    // Prefer hot, fall back to most recent
    return [...stories].sort((a, b) => (b.contributors + b.segCount) - (a.contributors + a.segCount))[0];
  }, [stories]);

  const trending = useMemo(
    () => stories?.filter((s) => s.id !== featured?.id && (s.isHot || s.contributors > 1)).slice(0, 12) ?? [],
    [stories, featured],
  );
  const fresh = useMemo(
    () => stories?.filter((s) => s.id !== featured?.id).slice(0, 12) ?? [],
    [stories, featured],
  );

  const byGenre = useMemo(() => {
    const map: Record<string, StoryCardData[]> = {};
    for (const s of stories ?? []) {
      if (!s.genre) continue;
      (map[s.genre] ??= []).push(s);
    }
    return map;
  }, [stories]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero / featured */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10">
        {isLoading ? (
          <div className="cinema-card h-[420px] animate-pulse" />
        ) : featured ? (
          <StoryCard story={featured} variant="hero" />
        ) : (
          <EmptyHero />
        )}
      </section>

      {/* Genre chips */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-8">
        <div className="scroll-row">
          {GENRES.map((g) => (
            <a
              key={g.id}
              href={`#genre-${g.id}`}
              className="glass rounded-full px-4 py-2 text-sm whitespace-nowrap hover:border-[color:var(--glow)] transition"
            >
              <span className="mr-1.5">{g.emoji}</span>{g.label}
            </a>
          ))}
        </div>
      </section>

      {/* Trending row */}
      {trending.length > 0 && (
        <Row
          title="今夜熱門"
          icon={<Flame className="w-5 h-5 text-[color:var(--ember)]" />}
          stories={trending}
        />
      )}

      {/* Fresh row */}
      {fresh.length > 0 && (
        <Row
          title="剛剛拉開帷幕"
          icon={<Sparkles className="w-5 h-5 text-[color:var(--glow)]" />}
          stories={fresh}
        />
      )}

      {/* Genre rows */}
      {GENRES.map((g) => {
        const list = byGenre[g.id];
        if (!list?.length) return null;
        return (
          <div id={`genre-${g.id}`} key={g.id}>
            <Row
              title={`${g.emoji} ${g.label}`}
              icon={null}
              stories={list}
            />
          </div>
        );
      })}

      {!isLoading && (!stories || stories.length === 0) && (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
          <EmptyHero />
        </section>
      )}

      <footer className="mx-auto max-w-6xl px-6 py-12 text-center text-xs text-muted-foreground">
        <div className="ambient-divider mb-6" />
        每一段，都可能改寫整個宇宙。
      </footer>
    </div>
  );
}

function Row({ title, icon, stories }: { title: string; icon: React.ReactNode; stories: StoryCardData[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-10">
      <div className="flex items-center gap-2 mb-3 px-1">
        {icon}
        <h2 className="font-cinematic text-xl tracking-[0.18em] text-gradient">{title}</h2>
      </div>
      <div className="scroll-row">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} variant="row" />
        ))}
      </div>
    </section>
  );
}

function EmptyHero() {
  return (
    <div className="cinema-card p-10 text-center">
      <div className="text-6xl mb-3">🌌</div>
      <h2 className="font-display text-4xl text-gradient mb-2">宇宙還在等待第一句</h2>
      <p className="text-muted-foreground mb-6">寫下開場，讓陌生人接著把故事推向你想不到的結局。</p>
      <Link to="/new" className="btn-neon"><Plus className="w-4 h-4" /> 開一個新宇宙</Link>
    </div>
  );
}
