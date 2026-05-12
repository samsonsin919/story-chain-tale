import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Feather } from "lucide-react";

export const Route = createFileRoute("/story/$storyId")({ component: StoryPage });

interface Story {
  id: string;
  title: string;
  opening: string;
  created_at: string;
  created_by: string;
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
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const [{ data: story, error: e1 }, { data: segs, error: e2 }] = await Promise.all([
        supabase.from("stories").select("*").eq("id", storyId).single(),
        supabase.from("story_segments").select("*").eq("story_id", storyId).order("position", { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const authorIds = Array.from(new Set([story.created_by, ...(segs ?? []).map((s) => s.author_id)]));
      const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", authorIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p) => { nameMap[p.id] = p.display_name; });
      return { story: story as Story, segments: (segs ?? []) as Segment[], names: nameMap };
    },
  });

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`story-${storyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "story_segments", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story", storyId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, qc]);

  async function addSegment(e: FormEvent) {
    e.preventDefault();
    if (!user || !data) return;
    setBusy(true);
    try {
      const last = data.segments[data.segments.length - 1];
      const nextPos = (last?.position ?? 0) + 1;
      const { error } = await supabase.from("story_segments").insert({
        story_id: storyId,
        author_id: user.id,
        content: draft.trim(),
        position: nextPos,
      });
      if (error) throw error;
      setDraft("");
      toast.success("接上了一段！");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">翻頁中…</p>
      </div>
    );
  }
  if (!data) return null;

  const lastAuthor = data.segments[data.segments.length - 1]?.author_id ?? data.story.created_by;
  const isMyTurnBlocked = user?.id === lastAuthor;

  return (
    <div className="min-h-screen">
      <Header />
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-ink">← 回書架</Link>

        <header className="mt-4 mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-ink leading-tight">{data.story.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            由 <span className="text-ink">{data.names[data.story.created_by] ?? "匿名旅人"}</span> 開頭・共 {data.segments.length + 1} 段
          </p>
        </header>

        <div className="paper-card p-8 md:p-10 space-y-6">
          <p className="leading-loose text-lg whitespace-pre-wrap">
            <span className="float-left font-display text-6xl text-primary leading-none mr-2 mt-1">
              {data.story.opening.charAt(0)}
            </span>
            {data.story.opening.slice(1)}
          </p>

          {data.segments.map((s) => (
            <div key={s.id}>
              <div className="ink-divider mb-6" />
              <p className="leading-loose text-lg whitespace-pre-wrap">{s.content}</p>
              <p className="mt-2 text-xs text-muted-foreground text-right font-display text-base">
                — {data.names[s.author_id] ?? "匿名旅人"}
              </p>
            </div>
          ))}
        </div>

        {/* Compose */}
        <section className="mt-10">
          <h2 className="font-display text-3xl text-ink mb-3 flex items-center gap-2">
            <Feather className="w-5 h-5 text-primary" />
            接下去寫…
          </h2>
          {!user ? (
            <div className="paper-card p-6 text-center">
              <p className="text-muted-foreground mb-3">登入後就可以接龍</p>
              <Link to="/auth" className="rounded-full bg-primary text-primary-foreground px-5 py-2">登入 / 註冊</Link>
            </div>
          ) : isMyTurnBlocked ? (
            <div className="paper-card p-6 text-center text-muted-foreground">
              你剛剛才寫過一段，等等別人接吧 ☕
            </div>
          ) : (
            <form onSubmit={addSegment} className="paper-card p-6 space-y-3">
              <textarea
                required
                maxLength={400}
                rows={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="然後呢……"
                className="w-full rounded-lg border border-input bg-paper px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length} / 400</span>
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "送出中…" : "接上這一段"}
                </button>
              </div>
            </form>
          )}
        </section>
      </article>
    </div>
  );
}
