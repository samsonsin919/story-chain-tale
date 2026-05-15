import { useState } from "react";
import { Book, X, Globe2, Users, AlertTriangle, Shield } from "lucide-react";

interface DictTerm { term: string; kind: string }

interface Props {
  storyTitle: string;
  genreLabel: string | null;
  opening: string;
  recentEvents: string[];   // last few segment first-line summaries
  dictionary: DictTerm[];
}

const TABS = [
  { id: "world",     label: "世界", icon: Globe2 },
  { id: "people",    label: "角色", icon: Users },
  { id: "events",    label: "大事", icon: AlertTriangle },
  { id: "rules",     label: "規則", icon: Shield },
] as const;

export function WorldCard({ storyTitle, genreLabel, opening, recentEvents, dictionary }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("world");

  const characters = dictionary.filter((d) => d.kind === "character");
  const places = dictionary.filter((d) => d.kind === "place");
  const things = dictionary.filter((d) => d.kind === "thing" || d.kind === "word");

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="世界觀資訊卡"
          className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full glass border border-[color:var(--violet)]/40 flex items-center justify-center text-[color:var(--violet)] shadow-lg hover:scale-105 transition"
          style={{ boxShadow: "0 8px 32px -8px color-mix(in oklab, var(--violet) 60%, transparent)" }}
        >
          <Book className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm sm:mr-6 glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--violet)]/30 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-[color:var(--violet)]" />
                <span className="font-cinematic tracking-[0.2em] text-sm">世界觀</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 -m-2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-3 pt-3 gap-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 py-2 text-xs rounded-lg transition ${
                      active ? "bg-[color:var(--violet)]/20 text-[color:var(--violet)] border border-[color:var(--violet)]/40"
                             : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto text-sm space-y-3">
              {tab === "world" && (
                <>
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">類型</div>
                    <span className="pill pill-violet">{genreLabel ?? "未分類"}</span>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">故事</div>
                    <p className="font-display text-base text-gradient">《{storyTitle}》</p>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">開場</div>
                    <p className="text-[13px] leading-relaxed text-foreground/85 line-clamp-6 whitespace-pre-wrap">{opening}</p>
                  </div>
                  {places.length > 0 && (
                    <div>
                      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">地點</div>
                      <div className="flex flex-wrap gap-1.5">
                        {places.map((p) => <span key={p.term} className="pill">{p.term}</span>)}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "people" && (
                characters.length > 0 ? (
                  <div className="space-y-2">
                    {characters.map((c) => (
                      <div key={c.term} className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--violet)] to-[color:var(--glow)] flex items-center justify-center text-xs font-semibold text-[oklch(0.12_0.02_280)]">
                          {c.term.slice(0, 1)}
                        </div>
                        <div className="text-foreground/90">{c.term}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">AI 仲未識認到角色，再寫多幾段就會自動出現。</p>
                )
              )}

              {tab === "events" && (
                recentEvents.length > 0 ? (
                  <ol className="space-y-2 list-none">
                    {recentEvents.map((ev, i) => (
                      <li key={i} className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 text-[13px] leading-relaxed text-foreground/85">
                        <span className="text-[color:var(--ember)] mr-1.5">●</span>
                        {ev}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-muted-foreground italic">未有重大事件。</p>
                )
              )}

              {tab === "rules" && (
                <ul className="space-y-2 text-[13px] text-foreground/85">
                  <li className="flex gap-2"><span>📏</span><span>每段 80–150 字</span></li>
                  <li className="flex gap-2"><span>🔁</span><span>剛剛接過嗰位等下一輪先可以再接</span></li>
                  <li className="flex gap-2"><span>🌌</span><span>想轉方向？開分支宇宙，唔好強行轉軚</span></li>
                  <li className="flex gap-2"><span>👻</span><span>保留懸念，唔好劇透未發生嘅嘢</span></li>
                  <li className="flex gap-2"><span>🎭</span><span>沿用已有角色名同地點，可以用「世界觀」tab 對照</span></li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
