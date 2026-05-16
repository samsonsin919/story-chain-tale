import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractTermsImpl } from "./dictionary.server";

const ExtractInput = z.object({
  storyId: z.string().uuid(),
  upToPosition: z.number().int().min(1).max(10000),
});

/**
 * AI-extract proper nouns from the story and upsert into story_dictionary.
 * Auth required to prevent anonymous AI quota abuse.
 */
export const extractTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExtractInput.parse(input))
  .handler(async ({ data }) => extractTermsImpl(data.storyId, data.upToPosition));

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
