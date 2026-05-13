import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft, Users } from "lucide-react";
import { SegmentCard } from "@/components/SegmentCard";
import { ComposeSegment } from "@/components/ComposeSegment";
import { getGenre, genrePillClass, MIN_SEG, MAX_SEG } from "@/lib/genres";

export const Route = createFileRoute("/story/$storyId")({ component: StoryPage });

interface Story {
  id: string;
  title: string;
  opening: string;
  created_at: string;
  created_by: string;
  genre: string | null;
  cover_emoji: string | null;
}
interface Segment {
  id: string;
  content: string;
  position: number;
  created_at: string;
  author_id: string;
}

function StoryPage() {
  const { storyId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["story", storyId, user?.id ?? null],
    queryFn: async () => {
      const [{ data: story, error: e1 }, { data: segs, error: e2 }] = await Promise.all([
        supabase.from("stories").select("*").eq("id", storyId).single(),
        supabase.from("story_segments").select("*").eq("story_id", storyId).order("position", { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const segments = (segs ?? []) as Segment[];
      const segIds = segments.map((s) => s.id);

      const authorIds = Array.from(new Set([story.created_by, ...segments.map((s) => s.author_id)]));
      const [{ data: profiles }, { data: likes }] = await Promise.all([
        supabase.from("profiles").select("id,display_name").in("id", authorIds),
        segIds.length
          ? supabase.from("segment_likes").select("segment_id, user_id").in("segment_id", segIds)
          : Promise.resolve({ data: [] as { segment_id: string; user_id: string }[] }),
      ]);

      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p) => { nameMap[p.id] = p.display_name; });

      const likeCount: Record<string, number> = {};
      const likedByMe: Record<string, boolean> = {};
      for (const l of likes ?? []) {
        likeCount[l.segment_id] = (likeCount[l.segment_id] ?? 0) + 1;
        if (user && l.user_id === user.id) likedByMe[l.segment_id] = true;
      }

      return {
        story: story as Story,
        segments,
        names: nameMap,
        likeCount,
        likedByMe,
      };
    },
  });

  // Realtime: segments + likes
  useEffect(() => {
    const ch = supabase
      .channel(`story-${storyId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "story_segments", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story", storyId] }))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "segment_likes" },
        () => qc.invalidateQueries({ queryKey: ["story", storyId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, qc]);

  const contributors = useMemo(() => {
    if (!data) return 0;
    const s = new Set<string>([data.story.created_by, ...data.segments.map((x) => x.author_id)]);
    return s.size;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-4">
          <div className="cinema-card h-40 animate-pulse" />
          <div className="cinema-card h-32 animate-pulse" />
          <div className="cinema-card h-32 animate-pulse" />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const genre = getGenre(data.story.genre);
  const lastAuthor = data.segments[data.segments.length - 1]?.author_id ?? data.story.created_by;
  const isMyTurnBlocked = user?.id === lastAuthor;
  const totalLikes = Object.values(data.likeCount).reduce((a, b) => a + b, 0);

  async function handleSubmit(content: string) {
    if (!user || !data) return;
    if (content.length < MIN_SEG || content.length > MAX_SEG) {
      toast.error(`字數需在 ${MIN_SEG}–${MAX_SEG} 之間`);
      return;
    }
    const last = data.segments[data.segments.length - 1];
    const nextPos = (last?.position ?? 0) + 1;
    const { error } = await supabase.from("story_segments").insert({
      story_id: storyId,
      author_id: user.id,
      content,
      position: nextPos,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("接上了一段 ✦");
    qc.invalidateQueries({ queryKey: ["story", storyId] });
    qc.invalidateQueries({ queryKey: ["stories"] });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> 回探索
        </Link>

        {/* Story header */}
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {genre && <span className={genrePillClass(genre.tone)}>{genre.emoji} {genre.label}</span>}
            <span className="pill"><Users className="w-3 h-3" /> {contributors} 人</span>
            <span className="text-xs text-muted-foreground">· {data.segments.length + 1} 段 · {totalLikes} ❤</span>
          </div>
          {(data.story.cover_emoji || genre?.emoji) && (
            <div className="text-5xl mb-3">{data.story.cover_emoji ?? genre?.emoji}</div>
          )}
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] text-gradient text-glow">
            《{data.story.title}》
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            開場：<span className="text-foreground/80">{data.names[data.story.created_by] ?? "匿名旅人"}</span>
          </p>
        </header>

        {/* Opening */}
        <div className="cinema-card p-5 sm:p-7 mb-4 animate-drift-in">
          <div className="text-[11px] tracking-[0.2em] text-[color:var(--ember)] uppercase mb-2">EP. 00 · 開場</div>
          <p className="leading-loose text-lg whitespace-pre-wrap font-display">
            <span className="float-left font-cinematic text-6xl text-[color:var(--glow)] leading-none mr-2 mt-1 text-glow">
              {data.story.opening.charAt(0)}
            </span>
            {data.story.opening.slice(1)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground text-right">
            — {data.names[data.story.created_by] ?? "匿名旅人"}
          </p>
        </div>

        {/* Segments timeline */}
        <div className="space-y-4">
          {data.segments.map((s) => (
            <SegmentCard
              key={s.id}
              id={s.id}
              position={s.position}
              content={s.content}
              authorName={data.names[s.author_id] ?? "匿名旅人"}
              createdAt={s.created_at}
              likes={data.likeCount[s.id] ?? 0}
              likedByMe={!!data.likedByMe[s.id]}
            />
          ))}
        </div>

        {/* Compose */}
        <section className="mt-10 mb-24 sm:mb-10">
          {!user ? (
            <div className="cinema-card p-6 text-center">
              <p className="text-muted-foreground mb-3">登入後就可以加入這條時間線</p>
              <Link to="/auth" className="btn-neon">登入 / 註冊</Link>
            </div>
          ) : (
            <ComposeSegment
              onSubmit={handleSubmit}
              disabled={isMyTurnBlocked}
              disabledReason="你剛剛接過一段，等等別人 ☕"
            />
          )}
        </section>
      </article>
    </div>
  );
}
