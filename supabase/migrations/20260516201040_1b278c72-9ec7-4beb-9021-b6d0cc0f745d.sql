DROP POLICY IF EXISTS "auth users add terms" ON public.story_dictionary;
CREATE POLICY "auth users add terms" ON public.story_dictionary
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "story owner delete terms" ON public.story_dictionary
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_dictionary.story_id AND s.created_by = auth.uid()
  )
);