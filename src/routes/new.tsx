import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({ component: NewStory });

function NewStory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [opening, setOpening] = useState("");
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
        .insert({ title: title.trim(), opening: opening.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      toast.success("故事開好了！");
      navigate({ to: "/story/$storyId", params: { storyId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="font-display text-5xl text-ink mb-2">開一本新故事</h1>
        <p className="text-muted-foreground mb-8">給它一個標題，寫下第一段，剩下的留給接下來的人。</p>
        <form onSubmit={submit} className="paper-card p-7 space-y-5">
          <div>
            <label className="text-sm text-muted-foreground">書名</label>
            <input
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：午夜的麵包店"
              className="mt-1 w-full rounded-lg border border-input bg-paper px-4 py-2.5 font-display text-2xl outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">第一段</label>
            <textarea
              required
              maxLength={500}
              rows={6}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="窗外下著雨。她推開那扇從來沒有人推開過的門……"
              className="mt-1 w-full rounded-lg border border-input bg-paper px-4 py-3 leading-relaxed outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">{opening.length} / 500</div>
          </div>
          <button
            type="submit"
            disabled={busy || !title.trim() || !opening.trim()}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {busy ? "正在裝訂…" : "開始這本書"}
          </button>
        </form>
      </div>
    </div>
  );
}
