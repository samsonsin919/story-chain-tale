import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  storyId: z.string().uuid(),
  upToPosition: z.number().int().min(1).max(10000),
});

/**
 * Ensure an AI-generated recap exists for `storyId` covering up to `upToPosition`.
 * No-op + returns existing if already present. Designed to be called from the
 * client whenever a story crosses every 5 segments.
 */
export const ensureRecap = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    // Existing?
    const { data: existing } = await supabaseAdmin
      .from("story_recaps")
      .select("id, content, up_to_position")
      .eq("story_id", data.storyId)
      .eq("up_to_position", data.upToPosition)
      .maybeSingle();
    if (existing) return { recap: existing, generated: false };

    // Fetch story + segments up to position
    const [{ data: story, error: e1 }, { data: segs, error: e2 }] = await Promise.all([
      supabaseAdmin.from("stories").select("title, opening, genre").eq("id", data.storyId).single(),
      supabaseAdmin
        .from("story_segments")
        .select("position, content")
        .eq("story_id", data.storyId)
        .order("position", { ascending: true })
        .lte("position", data.upToPosition),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!story) throw new Error("Story not found");

    const transcript =
      `【開場】${story.opening}\n\n` +
      (segs ?? []).map((s) => `【第 ${s.position} 段】${s.content}`).join("\n\n");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY 未設定");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "你是 Netflix 劇集旁白。用繁體中文（港式書面），把多人接龍嘅故事壓縮成一段 80-130 字嘅『前情提要』。" +
              "語氣要戲劇、神秘、勾人，唔好劇透未發生嘅嘢，唔好用『他們』『某人』咁含糊嘅字眼。" +
              "格式：純文字一段，唔好標題、唔好條列、唔好引號包住整段。",
          },
          {
            role: "user",
            content: `故事題目：《${story.title}》\n\n${transcript}\n\n請寫前情提要：`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI 服務暫時繁忙，稍後再試");
    if (res.status === 402) throw new Error("AI 額度已用完");
    if (!res.ok) throw new Error(`AI 失敗 (${res.status})`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI 沒有回應");

    const { data: inserted, error: e3 } = await supabaseAdmin
      .from("story_recaps")
      .insert({
        story_id: data.storyId,
        up_to_position: data.upToPosition,
        content,
      })
      .select("id, content, up_to_position")
      .single();
    if (e3) throw new Error(e3.message);

    return { recap: inserted, generated: true };
  });
