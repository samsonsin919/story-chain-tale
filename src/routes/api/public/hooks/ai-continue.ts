import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface StoryRow {
  id: string;
  title: string;
  opening: string;
  genre: string | null;
  max_segments: number;
  last_activity_at: string;
}

interface SegRow {
  position: number;
  content: string;
  is_ai: boolean;
}

const IDLE_MINUTES = 15;

async function generateNextSegment(opts: {
  title: string;
  genre: string | null;
  opening: string;
  recent: SegRow[];
  nextPosition: number;
  isFinale: boolean;
}): Promise<string> {
  const recentText = opts.recent
    .map((s) => `[第 ${s.position} 段${s.is_ai ? "・AI" : ""}] ${s.content}`)
    .join("\n\n");

  const finalePrompt = opts.isFinale
    ? `這是最後一段（第 ${opts.nextPosition} / 50 段），請畀一個有餘韻、合乎前文嘅結局。`
    : `這是第 ${opts.nextPosition} 段，仲未完，留個鈎畀下一個人接。`;

  const system = `你係一個廣東話故事接龍作者，用繁體中文寫作，自然帶啲粵語口語（例如「佢、嘅、咗、喺、唔、啲、咁、識」）。要求：
- 接住前文嘅情節同氣氛，唔好重複已寫嘅內容
- 字數 80–150 字之間
- 一段過，唔好分行，唔好標題，唔好用引號包住
- ${finalePrompt}`;

  const userPrompt = `故事題目：《${opts.title}》${opts.genre ? `（類型：${opts.genre}）` : ""}

開場：
${opts.opening}

最近段落：
${recentText}

請接寫第 ${opts.nextPosition} 段。直接畀文字，唔好加任何前綴或解釋。`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI 回應為空");
  }
  // Trim quotes / extra whitespace
  return content
    .trim()
    .replace(/^[「『"'\s]+|[」』"'\s]+$/g, "")
    .slice(0, 400);
}

async function processStory(story: StoryRow) {
  // Fetch recent segments (last 5) + count
  const { data: segs, error } = await supabaseAdmin
    .from("story_segments")
    .select("position,content,is_ai")
    .eq("story_id", story.id)
    .order("position", { ascending: false })
    .limit(5);
  if (error) throw error;

  const all = segs ?? [];
  const totalCount =
    (await supabaseAdmin
      .from("story_segments")
      .select("id", { count: "exact", head: true })
      .eq("story_id", story.id)).count ?? 0;

  if (totalCount >= story.max_segments) return { id: story.id, skipped: "max" };
  if (totalCount === 0) return { id: story.id, skipped: "no-human-segment" };

  const nextPosition = totalCount + 1;
  const recent = all.slice().reverse() as SegRow[];

  const content = await generateNextSegment({
    title: story.title,
    genre: story.genre,
    opening: story.opening,
    recent,
    nextPosition,
    isFinale: nextPosition >= story.max_segments,
  });

  const { error: insErr } = await supabaseAdmin.from("story_segments").insert({
    story_id: story.id,
    author_id: null,
    is_ai: true,
    position: nextPosition,
    content,
  });
  if (insErr) throw insErr;

  return { id: story.id, position: nextPosition, ok: true };
}

export const Route = createFileRoute("/api/public/hooks/ai-continue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Allow either apikey header (from pg_cron) or service role bearer
        const apikey = request.headers.get("apikey");
        const auth = request.headers.get("authorization");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const ok =
          (apikey && expected && apikey === expected) ||
          (auth === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
        if (!ok) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Idle threshold
        const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000).toISOString();

        const { data: stories, error } = await supabaseAdmin
          .from("stories")
          .select("id,title,opening,genre,max_segments,last_activity_at")
          .lt("last_activity_at", cutoff)
          .order("last_activity_at", { ascending: true })
          .limit(10);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const results: unknown[] = [];
        for (const s of (stories ?? []) as StoryRow[]) {
          try {
            results.push(await processStory(s));
          } catch (e) {
            results.push({ id: s.id, error: e instanceof Error ? e.message : String(e) });
          }
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
