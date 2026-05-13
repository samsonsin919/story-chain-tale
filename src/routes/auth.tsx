import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("註冊成功！請查收確認信後再登入。");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("歡迎回到宇宙 ✦");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-md px-4 sm:px-6 py-10 sm:py-16 mb-20 sm:mb-0">
        <div className="cinema-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2 text-[color:var(--glow)] justify-center">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs tracking-[0.2em] uppercase">
              {mode === "signin" ? "回到時間線" : "註冊新身份"}
            </span>
          </div>
          <h1 className="font-display text-4xl text-gradient text-center mb-1">
            {mode === "signin" ? "歡迎回來" : "加入故事宇宙"}
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-7">
            {mode === "signin" ? "繼續未完的劇情" : "為你準備一條新的時間線"}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">筆名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="想被怎麼稱呼？"
                  className="mt-1 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
                />
              </div>
            )}
            <div>
              <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">電子郵件</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.18em] uppercase text-muted-foreground">密碼</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-[color:var(--surface-2)] border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--glow)]"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-neon w-full">
              {busy ? "請稍候…" : mode === "signin" ? "登入" : "註冊"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "還沒有帳號？建立一個" : "已經有帳號？登入"}
          </button>
        </div>
      </div>
    </div>
  );
}
