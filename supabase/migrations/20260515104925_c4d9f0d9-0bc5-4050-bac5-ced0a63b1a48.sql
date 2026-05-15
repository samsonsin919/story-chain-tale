
CREATE TABLE public.story_dictionary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL,
  term text NOT NULL,
  kind text NOT NULL DEFAULT 'word',
  added_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (story_id, term)
);

CREATE INDEX idx_story_dictionary_story ON public.story_dictionary(story_id);

ALTER TABLE public.story_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dictionary readable by all"
ON public.story_dictionary FOR SELECT USING (true);

CREATE POLICY "auth users add terms"
ON public.story_dictionary FOR INSERT
WITH CHECK (auth.uid() = added_by OR added_by IS NULL);

CREATE POLICY "owner delete term"
ON public.story_dictionary FOR DELETE
USING (auth.uid() = added_by);
