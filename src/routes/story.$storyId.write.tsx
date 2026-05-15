import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Pin, PinOff, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getGenre, MIN_SEG, MAX_SEG, relativeTime } from "@/lib/genres";
import { FocusIntro } from "@/components/FocusIntro";
import { WorldCard } from "@/components/WorldCard";
import { SpellcheckEditor } from "@/components/SpellcheckEditor";
import { addTerm } from "@/lib/dictionary.functions";

export const Route = createFileRoute("/story/$storyId/write")({ component: WritePage });

interface Story {
  id: string; title: string; opening: string; created_by: string;
  genre: string | null;
}
interface Segment {
  id: string; content: string; position: number; created_at: string; author_id: string;
}
interface DictRow { term: string; kind: string }

function WritePage() {
  const { storyId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const addTermFn = useServerFn(addTerm);

  const [showIntro, setShowIntro] = useState(true);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [recapOpen, setRecapOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["story-write", storyId],
    queryFn: async () => {
      const [{ data: story, error: e1 }, { data: segs, error: e2 }, { data: dict }, { data: recap }] = await Promise.all([
        supabase.from("stories").select("id,title,opening,created_by,genre").eq("id", storyId).single(),
        supabase.from("story_segments").select("*").eq("story_id", storyId).order("position", { ascending: true }),
        supabase.from("story_dictionary").select("term,kind").eq("story_id", storyId),
        supabase.from("story_recaps").select("content,up_to_position").eq("story_id", storyId)
          .order("up_to_position", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const segments = (segs ?? []) as Segment[];
      const authorIds = Array.from(new Set([story.created_by, ...segments.map((s) => s.author_id)]));
      const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", authorIds);
      const names: Record<string, string> = {};
      (profiles ?? []).forEach((p) => { names[p.id] = p.display_name; });
      return {
        story: story as Story,
        segments,
        dictionary: (dict ?? []) as DictRow[],
        recap,
        names,
      };
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`write-${storyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_segments", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story-write", storyId] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "story_dictionary", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story-write", storyId] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "story_recaps", filter: `story_id=eq.${storyId}` },
        () => qc.invalidateQueries({ queryKey: ["story-write", storyId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, qc]);

  // Auto-scroll to latest segment when data first loads or grows
  useEffect(() => {
    if (!data || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data?.segments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const dictTerms = useMemo(() => (data?.dictionary ?? []).map((d) => d.term), [data]);
  const characters = useMemo(
    () => (data?.dictionary ?? []).filter((d) => d.kind === "character").map((d) => d.term),
    [data],
  );
  const recentEvents = useMemo(() => {
    if (!data) return [];
    return data.segments.slice(-5).reverse().map((s) => {
      const firstSent = s.content.split(/[。！？!?\n]/)[0]?.trim() ?? s.content;
      return firstSent.slice(0, 60) + (firstSent.length > 60 ? "…" : "");
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">進入故事中…</p>
      </div>
    );
  }
  if (!data) return null;

  const lastAuthor = data.segments[data.segments.length - 1]?.author_id ?? data.story.created_by;
  const isMyTurnBlocked = user?.id === lastAuthor;
  const nextPosition = (data.segments[data.segments.length - 1]?.position ?? 0) + 1;
  const lastSegmentExcerpt = data.segments[data.segments.length - 1]?.content ?? data.story.opening;
  const genre = getGenre(data.story.genre);

  function togglePin(id: string) {
    setPinned((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleSubmit(content: string) {
    if (!user) return;
    if (content.length < MIN_SEG || content.length > MAX_SEG) {
      toast.error(`字數需在 ${MIN_SEG}–${MAX_SEG} 之間`);
      return;
    }
    const { error } = await supabase.from("story_segments").insert({
      story_id: storyId,
      author_id: user.id,
      content,
      position: nextPosition,
    });
    if (error) { toast.error(error.message); throw error; }
    toast.success("接上了一段 ✦");
    qc.invalidateQueries({ queryKey: ["story-write", storyId] });
    qc.invalidateQueries({ queryKey: ["story", storyId] });
    qc.invalidateQueries({ queryKey: ["stories"] });
    // Return to the read view so the writer can see the full story land.
    setTimeout(() => nav({ to: "/story/$storyId", params: { storyId } }), 400);
  }

  async function handleAddTerm(term: string) {
    try {
      await addTermFn({ data: { storyId, term, kind: "word" } });
      toast.success(`已加入字典：${term}`);
      qc.invalidateQueries({ queryKey: ["story-write", storyId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入失敗");
    }
  }

  const pinnedSegs = data.segments.filter((s) => pinned.has(s.id));
  const segCount = data.segments.length;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ height: "100dvh" }}>
      {showIntro && (
        <FocusIntro
          storyTitle={data.story.title}
          nextPosition={nextPosition}
          lastSegmentExcerpt={lastSegmentExcerpt.slice(0, 120)}
          characters={characters}
          recap={data.recap?.content ?? null}
          onDone={() => setShowIntro(false)}
        />
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 glass z-10">
        <Link
          to="/story/$storyId"
          params={{ storyId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" /> 退出
        </Link>
        <div className="min-w-0 flex-1 text-center px-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[color:var(--violet)]">續寫中</div>
          <div className="font-display text-sm truncate text-gradient">《{data.story.title}》</div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">第 {nextPosition} 段</div>
      </header>

      {/* Story area */}
      <section
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ minHeight: 0 }}
      >
        {/* AI Recap collapsible */}
        {data.recap && (
          <div className="pinned-strip pt-1 pb-2 -mx-4 px-4">
            <button
              type="button"
              onClick={() => setRecapOpen((v) => !v)}
              className="w-full flex items-center justify-between text-left rounded-xl border border-[color:var(--violet)]/30 bg-[color:var(--violet)]/10 px-3 py-2"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-[color:var(--violet)]">
                <Sparkles className="w-3 h-3" /> 30 秒追劇
              </span>
              {recapOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {recapOpen && (
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90 font-display animate-fade-in">
                {data.recap.content}
              </p>
            )}
          </div>
        )}

        {/* Pinned strip */}
        {pinnedSegs.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ember)] flex items-center gap-1">
              <Pin className="w-3 h-3" /> 釘住嘅段落
            </div>
            {pinnedSegs.map((s) => (
              <SegmentRow
                key={`pin-${s.id}`}
                seg={s}
                authorName={data.names[s.author_id] ?? "匿名旅人"}
                pinned
                onTogglePin={() => togglePin(s.id)}
                emphasized
              />
            ))}
            <div className="ambient-divider" />
          </div>
        )}

        {/* Opening */}
        <div className={`rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 ${segCount > 6 ? "seg-faded" : ""}`}>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ember)] mb-1">EP. 00 · 開場</div>
          <p className="text-[13px] leading-relaxed font-display whitespace-pre-wrap text-foreground/90">
            {data.story.opening}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-right">— {data.names[data.story.created_by] ?? "匿名旅人"}</p>
        </div>

        {/* Segments — older fades, last 3 stay full */}
        {data.segments.map((s, i) => {
          const distanceFromEnd = data.segments.length - 1 - i;
          const faded = distanceFromEnd >= 3;
          const isLast = distanceFromEnd === 0;
          return (
            <SegmentRow
              key={s.id}
              seg={s}
              authorName={data.names[s.author_id] ?? "匿名旅人"}
              pinned={pinned.has(s.id)}
              onTogglePin={() => togglePin(s.id)}
              faded={faded}
              emphasized={isLast}
            />
          );
        })}

        <div className="text-center text-[11px] text-muted-foreground py-4">
          ─── 你接落去就喺呢度 ───
        </div>
      </section>

      {/* Editor */}
      <section className="border-t border-white/10 glass px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!user ? (
          <div className="text-center text-sm text-muted-foreground py-3">
            <Link to="/auth" className="text-[color:var(--glow)] underline">登入</Link> 後就可以接龍
          </div>
        ) : (
          <SpellcheckEditor
            dictionary={dictTerms}
            onSubmit={handleSubmit}
            onAddDictionary={handleAddTerm}
            disabled={isMyTurnBlocked}
            disabledReason="你剛剛接過一段，等等別人 ☕"
          />
        )}
      </section>

      <WorldCard
        storyTitle={data.story.title}
        genreLabel={genre?.label ?? null}
        opening={data.story.opening}
        recentEvents={recentEvents}
        dictionary={data.dictionary}
      />
    </div>
  );
}

function SegmentRow({
  seg, authorName, pinned, onTogglePin, faded, emphasized,
}: {
  seg: Segment; authorName: string; pinned: boolean;
  onTogglePin: () => void; faded?: boolean; emphasized?: boolean;
}) {
  return (
    <div className={`group rounded-xl px-4 py-3 border ${
      emphasized
        ? "border-[color:var(--glow)]/40 bg-[color:var(--glow)]/[0.04]"
        : "border-white/8 bg-white/[0.02]"
    } ${faded ? "seg-faded" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[10px] text-muted-foreground">
          第 {seg.position} 段 · {authorName} · {relativeTime(seg.created_at)}
        </div>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? "取消釘住" : "釘住"}
          className={`p-1 -m-1 transition opacity-0 group-hover:opacity-100 ${pinned ? "opacity-100 text-[color:var(--ember)]" : "text-muted-foreground hover:text-foreground"}`}
        >
          {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className={`leading-relaxed font-display whitespace-pre-wrap text-foreground/90 ${emphasized ? "text-[15px]" : "text-[13px]"}`}>
        {seg.content}
      </p>
    </div>
  );
}
