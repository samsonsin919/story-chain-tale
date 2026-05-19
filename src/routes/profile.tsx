import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LogOut, BookOpen, Heart, Sparkles, Pencil, Check, X } from "lucide-react";
import { relativeTime, getGenre } from "@/lib/genres";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const { data, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const uid = user!.id;
      const [{ data: profile }, { data: stories }, { data: segs }, { data: likes }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("stories").select("*").eq("created_by", uid).order("created_at", { ascending: false }),
        supabase.from("story_segments").select("id,story_id").eq("author_id", uid),
        supabase.from("segment_likes").select("id").eq("user_id", uid),
      ]);
      return {
        profile,
        stories: stories ?? [],
        segCount: segs?.length ?? 0,
        likeCount: likes?.length ?? 0,
      };
    },
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (data?.profile?.display_name) setName(data.profile.display_name);
  }, [data?.profile?.display_name]);

  async function saveName() {
    if (!user) return;
    const v = name.trim();
    if (!v) return toast.error("筆名不能空白");
    const { error } = await supabase.from("profiles").update({ display_name: v }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("已更新筆名");
    setEditing(false);
    refetch();
  }

  if (loading || !user || !data) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="text-center text-sm text-muted-foreground py-20 animate-pulse">載入中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Identity */}
        <section className="cinema-card p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-2 mb-2 text-[color:var(--glow)]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs tracking-[0.2em] uppercase">你的時間線</span>
          </div>

          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="flex-1 rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-3 py-2 font-display text-2xl outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
              />
              <button onClick={saveName} className="btn-neon !py-2 !px-3"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditing(false); setName(data.profile?.display_name ?? ""); }} className="btn-ghost !py-2 !px-3"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl sm:text-4xl text-gradient">
                {data.profile?.display_name ?? "匿名旅人"}
              </h1>
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <Stat icon={BookOpen} label="開創故事" value={data.stories.length} />
            <Stat icon={Sparkles} label="接過段落" value={data.segCount} />
            <Stat icon={Heart} label="送出心心" value={data.likeCount} />
          </div>

          <button
            onClick={async () => { await signOut(); nav({ to: "/" }); }}
            className="btn-ghost mt-6 w-full !py-2.5"
          >
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </section>

        {/* My stories */}
        <section>
          <h2 className="font-cinematic tracking-[0.18em] text-sm text-muted-foreground mb-3">
            我開的故事
          </h2>
          {data.stories.length === 0 ? (
            <div className="cinema-card p-6 text-center text-sm text-muted-foreground">
              你仲未開過故事。
              <Link to="/new" className="block btn-neon mt-3">開第一個</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.stories.map((s) => {
                const g = getGenre(s.genre);
                return (
                  <li key={s.id}>
                    <Link
                      to="/story/$storyId"
                      params={{ storyId: s.id }}
                      className="cinema-card p-4 flex items-start gap-3 hover:border-[color:var(--glow)]/40 transition"
                    >
                      <span className="text-2xl shrink-0">{s.cover_emoji ?? g?.emoji ?? "✦"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {g && <span className="pill text-[10px]">{g.label}</span>}
                          <span className="text-[10px] text-muted-foreground">{relativeTime(s.created_at)}</span>
                        </div>
                        <p className="font-display text-base text-foreground truncate">《{s.title}》</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.opening}</p>
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

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[color:var(--surface-2)] border border-white/5 p-3 text-center">
      <Icon className="w-4 h-4 mx-auto text-[color:var(--glow)] mb-1" />
      <div className="font-display text-xl tabular-nums">{value}</div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
