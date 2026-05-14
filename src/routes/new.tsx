import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { GENRES, getGenre } from "@/lib/genres";
import { Sparkles, GitBranch, ChevronLeft } from "lucide-react";

const SearchSchema = z.object({
  from: z.string().uuid().optional(),
  parent: z.string().uuid().optional(),
});

export const Route = createFileRoute("/new")({
  component: NewStory,
  validateSearch: (s) => SearchSchema.parse(s),
});

const EMOJIS = ["🕯️", "👁️", "🌃", "🛸", "💔", "🜂", "🩸", "🗝️", "📼", "🌌", "🎭", "🚪"];

function NewStory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { from, parent } = Route.useSearch();
  const isBranch = !!(from && parent);

  const [title, setTitle] = useState("");
  const [opening, setOpening] = useState("");
  const [genre, setGenre] = useState<string>("mystery");
  const [emoji, setEmoji] = useState<string>("🕯️");
  const [branchLabel, setBranchLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Load source story + segment for context
  const { data: branchSource } = useQuery({
    queryKey: ["branch-source", parent, from],
    enabled: isBranch,
    queryFn: async () => {
      const [{ data: s }, { data: seg }] = await Promise.all([
        supabase.from("stories").select("title, genre, cover_emoji").eq("id", parent!).single(),
        supabase.from("story_segments").select("position, content").eq("id", from!).single(),
      ]);
      return { story: s, segment: seg };
    },
  });

  // Inherit genre + emoji from source on first load
  useEffect(() => {
    if (branchSource?.story) {
      if (branchSource.story.genre) setGenre(branchSource.story.genre);
      if (branchSource.story.cover_emoji) setEmoji(branchSource.story.cover_emoji);
    }
  }, [branchSource?.story]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("stories")
        .insert({
          title: title.trim(),
          opening: opening.trim(),
          created_by: user.id,
          genre,
          cover_emoji: emoji,
          parent_story_id: isBranch ? parent! : null,
          branch_from_segment_id: isBranch ? from! : null,
          branch_label: isBranch ? (branchLabel.trim() || null) : null,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success(isBranch ? "平行宇宙已誕生 ✦" : "新宇宙已開啟 ✦");
      navigate({ to: "/story/$storyId", params: { storyId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setBusy(false);
    }
  }

  const g = getGenre(genre);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-14 mb-20 sm:mb-0">
        <div className="flex items-center gap-2 mb-2 text-[color:var(--glow)]">
          {isBranch ? <GitBranch className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span className="text-xs tracking-[0.2em] uppercase">{isBranch ? "平行宇宙" : "新宇宙"}</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-gradient mb-2">
          {isBranch ? "如果故事走另一條路…" : "寫下開場那句"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isBranch ? "從原故事一段抽出來，重新分裂出一條時間線。" : "第一句要夠勾人。剩下的，交給陌生人。"}
        </p>

        {isBranch && branchSource?.story && (
          <div className="cinema-card p-4 mb-5 border-[color:var(--violet)]/30">
            <Link
              to="/story/$storyId"
              params={{ storyId: parent! }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> 母宇宙：《{branchSource.story.title}》
            </Link>
            {branchSource.segment && (
              <div className="mt-2 text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                <span className="text-[10px] tracking-[0.2em] text-[color:var(--violet)] uppercase mr-2">第 {branchSource.segment.position} 段</span>
                {branchSource.segment.content}
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="cinema-card p-5 sm:p-7 space-y-6">
          {isBranch && (
            <div>
              <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">這個分支的 What If</label>
              <input
                maxLength={48}
                value={branchLabel}
                onChange={(e) => setBranchLabel(e.target.value)}
                placeholder="如果他沒有打開那扇門呢？"
                className="mt-2 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
          )}

          <div>
            <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">類型</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENRES.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => setGenre(x.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    genre === x.id
                      ? "bg-gradient-to-r from-[color:var(--glow)]/30 to-[color:var(--violet)]/30 border-[color:var(--glow)] text-foreground"
                      : "border-white/10 text-muted-foreground hover:border-white/30"
                  }`}
                >
                  {x.emoji} {x.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">封面符號</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl border transition ${
                    emoji === e
                      ? "border-[color:var(--glow)] bg-white/5"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">書名</label>
            <input
              required
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`例如：第14層 / 死咗三次嘅男朋友`}
              className="mt-2 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 font-display text-2xl outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
            />
          </div>

          <div>
            <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
              {isBranch ? "新時間線的開場" : "開場第一句"}
            </label>
            <textarea
              required
              maxLength={300}
              rows={5}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder={isBranch ? "從那一刻起，一切完全不同了……" : "電梯停在一個不存在的樓層。"}
              className="mt-2 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">{opening.length} / 300</div>
          </div>

          <div className="rounded-xl border border-white/10 p-4 bg-black/30">
            <div className="text-xs text-muted-foreground mb-2">預覽</div>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{emoji}</span>
              <div className="min-w-0">
                <div className="font-display text-xl text-gradient truncate">《{title || "未命名宇宙"}》</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {g && <span className="pill">{g.emoji} {g.label}</span>}
                  {isBranch && <span className="pill pill-violet"><GitBranch className="w-3 h-3" /> 分支</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{opening || "這裡會出現你的開場……"}</p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy || !title.trim() || !opening.trim()} className="btn-neon w-full">
            {busy ? "正在開啟宇宙…" : isBranch ? "分裂出這條時間線 ✦" : "開啟這條時間線 ✦"}
          </button>
        </form>
      </div>
    </div>
  );
}
