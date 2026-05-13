
-- Phase 1: cinematic story platform additions
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS cover_emoji text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stories_genre ON public.stories(genre);
CREATE INDEX IF NOT EXISTS idx_stories_is_featured ON public.stories(is_featured) WHERE is_featured = true;

-- Likes table
CREATE TABLE IF NOT EXISTS public.segment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.story_segments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment_id, user_id)
);

ALTER TABLE public.segment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes readable by all"
  ON public.segment_likes FOR SELECT
  USING (true);

CREATE POLICY "auth users like"
  ON public.segment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner unlike"
  ON public.segment_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_segment_likes_segment ON public.segment_likes(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_likes_user ON public.segment_likes(user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_likes;
