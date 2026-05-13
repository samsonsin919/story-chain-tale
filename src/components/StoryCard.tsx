import { Link } from "@tanstack/react-router";
import { Users, Flame, Sparkles } from "lucide-react";
import { getGenre, genrePillClass } from "@/lib/genres";

export interface StoryCardData {
  id: string;
  title: string;
  opening: string;
  genre: string | null;
  cover_emoji: string | null;
  segCount: number;
  contributors: number;
  isHot?: boolean;
  isNew?: boolean;
}

interface Props {
  story: StoryCardData;
  variant?: "hero" | "row" | "grid";
}

export function StoryCard({ story, variant = "grid" }: Props) {
  const genre = getGenre(story.genre);
  const pill = genrePillClass(genre?.tone);
  const emoji = story.cover_emoji ?? genre?.emoji ?? "📖";

  if (variant === "hero") {
    return (
      <Link
        to="/story/$storyId"
        params={{ storyId: story.id }}
        className="cinema-card relative block p-6 sm:p-10 animate-drift-in"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="pill pill-ember"><Sparkles className="w-3 h-3" /> 今夜推薦</span>
            {genre && <span className={pill}>{genre.emoji} {genre.label}</span>}
          </div>
          <div className="text-5xl sm:text-6xl mb-3">{emoji}</div>
          <h2 className="font-display text-4xl sm:text-6xl leading-[1.05] text-gradient text-glow mb-4">
            《{story.title}》
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground line-clamp-3 leading-relaxed mb-6">
            「{story.opening}」
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {story.contributors} 人正在接龍
            </span>
            <span>·</span>
            <span>{story.segCount + 1} 段</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <Link
        to="/story/$storyId"
        params={{ storyId: story.id }}
        className="cinema-card block w-[260px] sm:w-[300px] p-5 group"
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{emoji}</span>
          <div className="flex flex-col gap-1 items-end">
            {story.isHot && <span className="pill pill-ember"><Flame className="w-3 h-3" /> 熱門</span>}
            {story.isNew && !story.isHot && <span className="pill"><Sparkles className="w-3 h-3" /> 新</span>}
          </div>
        </div>
        <h3 className="font-display text-2xl leading-tight mb-2 text-gradient">
          《{story.title}》
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4 min-h-[3.75rem]">
          {story.opening}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-white/5">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {story.contributors}
          </span>
          {genre && <span className={pill}>{genre.label}</span>}
          <span className="text-[color:var(--glow)] group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      </Link>
    );
  }

  // grid
  return (
    <Link
      to="/story/$storyId"
      params={{ storyId: story.id }}
      className="cinema-card block p-5 group"
    >
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl leading-tight text-gradient truncate">
            《{story.title}》
          </h3>
          {genre && <span className={`${pill} mt-1`}>{genre.label}</span>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
        {story.opening}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-3 border-t border-white/5">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> {story.contributors} 人 · {story.segCount + 1} 段
        </span>
        <span className="text-[color:var(--glow)] group-hover:translate-x-0.5 transition-transform">繼續 →</span>
      </div>
    </Link>
  );
}
