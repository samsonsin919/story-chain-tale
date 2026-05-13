import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Plus, LogOut, LogIn, Sparkles } from "lucide-react";

export function Header() {
  const { user, signOut, loading } = useAuth();
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Sparkles className="w-5 h-5 text-[color:var(--glow)] group-hover:rotate-12 transition-transform" />
          <span className="font-cinematic text-base sm:text-lg tracking-[0.18em] text-gradient">
            午夜故事宇宙
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link to="/new" className="hidden sm:inline-flex btn-neon !py-2 !px-4 text-sm">
            <Plus className="w-4 h-4" />
            開新故事
          </Link>
          {!loading && (user ? (
            <button
              onClick={() => signOut()}
              className="btn-ghost !py-2 !px-3"
              title="登出"
              aria-label="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link to="/auth" className="btn-ghost !py-2 !px-4">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">登入</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
