-- Restrict Realtime channel subscriptions to authenticated users.
-- story_segments and segment_likes are publicly readable via RLS, so authenticated
-- subscribers receiving change events is consistent with existing access rules.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can receive story realtime" ON realtime.messages;
CREATE POLICY "authenticated can receive story realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);