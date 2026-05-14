
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS parent_story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_from_segment_id uuid REFERENCES public.story_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_label text;

CREATE INDEX IF NOT EXISTS idx_stories_parent ON public.stories(parent_story_id);
CREATE INDEX IF NOT EXISTS idx_stories_branch_from ON public.stories(branch_from_segment_id);

CREATE TABLE IF NOT EXISTS public.story_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  up_to_position integer NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, up_to_position)
);

ALTER TABLE public.story_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recaps readable by all"
  ON public.story_recaps FOR SELECT USING (true);
