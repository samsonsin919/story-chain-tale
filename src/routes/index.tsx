import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import heroImg from "@/assets/hero.jpg";
import { Sparkles, Feather, Users } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

interface StoryRow {
  id: string;
  title: string;
  opening: string;
  created_at: string;
  created_by: string;
}

function Index() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async (): Promise<(StoryRow & { segCount: number })[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const ids = (data ?? []).map((s) => s.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: segs } = await supabase
          .from("story_segments")
          .select("story_id")
          .in("story_id", ids);
        counts = (segs ?? []).reduce<Record<string, number>>((acc, r) => {
          acc[r.story_id] = (acc[r.story_id] ?? 0) + 1;
          return acc;
        }, {});
      }
      return (data ?? []).map((s) => ({ ...s, segCount: counts[s.id] ?? 0 }));
    },
  });

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary">
              <Sparkles className="w-3.5 h-3.5" /> 一起寫故事
            </span>
            <h1 className="font-display text-6xl md:text-7xl mt-3 leading-[1.05] text-ink">
              一句話，<br />接成一個世界。
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md leading-relaxed">
              開一本新書，留下開頭。其他旅人會接著寫下一段，一段一段，
              長成你也想不到的結局。
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/new"
                className="rounded-full bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition shadow-soft"
              >
                <Feather className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                開一本新故事
              </Link>
              <a
                href="#bookshelf"
                className="rounded-full border border-border px-6 py-3 hover:bg-secondary transition"
              >
                逛逛書架
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="一本翻開的故事書，紙鳥與小燈籠從書頁裡飛出"
              width={1536}
              height={1024}
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <div className="ink-divider" />
      </div>

      {/* Bookshelf */}
      <section id="bookshelf" className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-4xl text-ink">書架</h2>
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" /> 大家正在寫的故事
          </span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">正在翻書架…</p>
        ) : !stories || stories.length === 0 ? (
          <div className="paper-card p-10 text-center">
            <p className="font-display text-3xl mb-2">書架還空空的</p>
            <p className="text-muted-foreground mb-5">當第一個寫下開頭的人吧。</p>
            <Link to="/new" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5">
              開一本新故事
            </Link>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-5">
            {stories.map((s, i) => (
              <li key={s.id}>
                <Link
                  to="/story/$storyId"
                  params={{ storyId: s.id }}
                  className="paper-card block p-6 h-full hover:-translate-y-0.5 transition-transform"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -0.4 : 0.5)}deg)` }}
                >
                  <h3 className="font-display text-2xl text-ink leading-tight mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {s.opening}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.segCount + 1} 段</span>
                    <span className="text-primary">繼續寫 →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-xs text-muted-foreground">
        每一個故事，都是一群人留下的腳印。
      </footer>
    </div>
  );
}
