-- Destructive reset
DROP TABLE IF EXISTS public.story_recaps CASCADE;
DROP TABLE IF EXISTS public.story_dictionary CASCADE;
DROP TABLE IF EXISTS public.segment_likes CASCADE;
DROP TABLE IF EXISTS public.story_segments CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;

-- Stories
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  opening text NOT NULL,
  genre text,
  cover_emoji text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  max_segments int NOT NULL DEFAULT 50,
  last_activity_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories readable by all" ON public.stories FOR SELECT USING (true);
CREATE POLICY "auth create stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "owner update story" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "owner delete story" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Segments
CREATE TABLE public.story_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  position int NOT NULL,
  content text NOT NULL,
  author_id uuid,
  is_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, position)
);
CREATE INDEX idx_segments_story ON public.story_segments(story_id, position);
ALTER TABLE public.story_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "segments readable by all" ON public.story_segments FOR SELECT USING (true);
CREATE POLICY "auth add segments" ON public.story_segments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND is_ai = false);
CREATE POLICY "owner delete segment" ON public.story_segments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Likes
CREATE TABLE public.segment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.story_segments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment_id, user_id)
);
ALTER TABLE public.segment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by all" ON public.segment_likes FOR SELECT USING (true);
CREATE POLICY "auth like" ON public.segment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner unlike" ON public.segment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: update last_activity_at when a segment is added
CREATE OR REPLACE FUNCTION public.touch_story_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stories SET last_activity_at = now() WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_story_activity
AFTER INSERT ON public.story_segments
FOR EACH ROW EXECUTE FUNCTION public.touch_story_activity();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_likes;