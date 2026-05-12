import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BookOpen, PenLine, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { user, signOut, loading } = useAuth();
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <BookOpen className="w-6 h-6 text-primary group-hover:rotate-[-6deg] transition-transform" />
          <span className="font-display text-3xl text-ink leading-none">故事接龍</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition shadow-sm"
          >
            <PenLine className="w-4 h-4" />
            開新故事
          </Link>
          {!loading && (user ? (
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-muted-foreground hover:text-ink hover:bg-secondary transition"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 border border-border hover:bg-secondary transition"
            >
              <LogIn className="w-4 h-4" />
              登入
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
