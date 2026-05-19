import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Flame, Plus, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Compass;
  match: (p: string, s: string) => boolean;
  accent?: boolean;
}

export function MobileTabBar() {
  const loc = useLocation();
  const path = loc.pathname;
  const search = typeof loc.search === "string" ? loc.search : JSON.stringify(loc.search ?? "");

  // Hide on immersive routes (writing room, focused composer)
  if (path.endsWith("/write") || path.startsWith("/new")) return null;

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/5"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, match, accent }) => {
          const active = match(path, search);
          return (
            <li key={label} className="flex">
              <Link
                to={to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? "text-[color:var(--glow)]" : "text-muted-foreground"
                }`}
              >
                <span className={`flex items-center justify-center w-10 h-10 rounded-full transition ${
                  accent
                    ? "bg-gradient-to-br from-[color:var(--glow)] to-[color:var(--violet)] text-[oklch(0.12_0.02_280)] shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--glow)_70%,transparent)]"
                    : active ? "bg-white/5" : ""
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={accent ? 2.5 : 2} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
