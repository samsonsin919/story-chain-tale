import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { GENRES, getGenre } from "@/lib/genres";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/new")({ component: NewStory });

const EMOJIS = ["🕯️", "👁️", "🌃", "🛸", "💔", "🜂", "🩸", "🗝️", "📼", "🌌", "🎭", "🚪"];

function NewStory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [opening, setOpening] = useState("");
  const [genre, setGenre] = useState<string>("mystery");
  const [emoji, setEmoji] = useState<string>("🕯️");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("新宇宙已開啟 ✦");
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
          <Sparkles className="w-4 h-4" />
          <span className="text-xs tracking-[0.2em] uppercase">新宇宙</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-gradient mb-2">寫下開場那句</h1>
        <p className="text-muted-foreground mb-8">第一句要夠勾人。剩下的，交給陌生人。</p>

        <form onSubmit={submit} className="cinema-card p-5 sm:p-7 space-y-6">
          {/* Genre */}
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

          {/* Cover emoji */}
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
            <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">開場第一句</label>
            <textarea
              required
              maxLength={300}
              rows={5}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="電梯停在一個不存在的樓層。"
              className="mt-2 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--glow)] resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">{opening.length} / 300</div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/30">
            <div className="text-xs text-muted-foreground mb-2">預覽</div>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{emoji}</span>
              <div className="min-w-0">
                <div className="font-display text-xl text-gradient truncate">《{title || "未命名宇宙"}》</div>
                {g && <span className="pill mt-1">{g.emoji} {g.label}</span>}
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{opening || "這裡會出現你的開場……"}</p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy || !title.trim() || !opening.trim()} className="btn-neon w-full">
            {busy ? "正在開啟宇宙…" : "開啟這條時間線 ✦"}
          </button>
        </form>
      </div>
    </div>
  );
}
