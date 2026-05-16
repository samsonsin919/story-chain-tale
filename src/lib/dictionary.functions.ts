import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExtractInput = z.object({
  storyId: z.string().uuid(),
  upToPosition: z.number().int().min(1).max(10000),
});

/**
 * AI-extract proper nouns (characters / places / things / coined words) from
 * the story so far, and upsert them into story_dictionary. Designed to run
 * piggy-back on recap generation, every 5 segments.
 */
export const extractTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const [{ data: story }, { data: segs }] = await Promise.all([
      supabaseAdmin.from("stories").select("title, opening").eq("id", data.storyId).single(),
      supabaseAdmin
        .from("story_segments")
        .select("position, content")
        .eq("story_id", data.storyId)
        .order("position", { ascending: true })
        .lte("position", data.upToPosition),
    ]);
    if (!story) return { terms: [] };

    const transcript =
      `【開場】${story.opening}\n\n` +
      (segs ?? []).map((s) => `【第 ${s.position} 段】${s.content}`).join("\n\n");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { terms: [] };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "你係文字編輯。畀你一段繁體中文／港式書面接龍故事，請抽取最多 12 個故事獨有專有名詞。" +
              "包括：角色名（character）、地點（place）、物件／組織／系統（thing）、自創詞或港式口語（word）。" +
              "唔好抽：日常常用字、常見地點（香港、九龍）、形容詞、動詞、空字串。" +
              "只回傳純 JSON：{\"terms\":[{\"term\":\"...\",\"kind\":\"character|place|thing|word\"}]}，唔好任何其他文字。",
          },
          { role: "user", content: `《${story.title}》\n\n${transcript}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { terms: [] };

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return { terms: [] };

    let parsed: { terms?: Array<{ term?: string; kind?: string }> } = {};
    try { parsed = JSON.parse(raw); } catch { return { terms: [] }; }

    const valid = (parsed.terms ?? [])
      .map((t) => ({
        term: String(t.term ?? "").trim(),
        kind: ["character", "place", "thing", "word"].includes(String(t.kind))
          ? String(t.kind)
          : "word",
      }))
      .filter((t) => t.term.length >= 1 && t.term.length <= 40)
      .slice(0, 12);

    if (valid.length === 0) return { terms: [] };

    const rows = valid.map((t) => ({
      story_id: data.storyId,
      term: t.term,
      kind: t.kind,
      added_by: null,
    }));

    await supabaseAdmin
      .from("story_dictionary")
      .upsert(rows, { onConflict: "story_id,term", ignoreDuplicates: true });

    return { terms: valid };
  });

const AddInput = z.object({
  storyId: z.string().uuid(),
  term: z.string().min(1).max(40),
  kind: z.enum(["character", "place", "thing", "word"]).default("word"),
});

/** User-driven: add a term to the story dictionary from the spellcheck popover. */
export const addTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AddInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("story_dictionary")
      .upsert(
        { story_id: data.storyId, term: data.term, kind: data.kind, added_by: userId },
        { onConflict: "story_id,term", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
