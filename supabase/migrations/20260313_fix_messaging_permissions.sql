-- Fix messaging permissions: ensure authenticated role has necessary grants
-- and messaging RLS policies are correctly in place.

-- Grant SELECT on business_profiles (needed by conversations RLS policy)
GRANT SELECT ON public.business_profiles TO authenticated, anon;

-- Grant SELECT on talent_connection_requests (needed by _has_accepted_connection helper)
GRANT SELECT ON public.talent_connection_requests TO authenticated;

-- Grant SELECT, INSERT on conversations and messages
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- Ensure _has_accepted_connection function exists and is correct
CREATE OR REPLACE FUNCTION public._has_accepted_connection(_talent_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.talent_connection_requests tcr
    WHERE tcr.talent_id = _talent_id
      AND tcr.business_id = _business_id
      AND tcr.status = 'accepted'
  );
$$;

-- Drop all existing conversation/message policies and recreate cleanly
DROP POLICY IF EXISTS "conversations_select_with_active_grant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_with_active_grant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_with_accepted_connection" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_with_accepted_connection" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_via_conversation" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_with_active_grant_and_role" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_with_accepted_connection_and_role" ON public.messages;

-- Conversations: SELECT if talent owner or business owner AND accepted connection
CREATE POLICY "conversations_select_with_accepted_connection"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public._has_accepted_connection(talent_id, business_id)
  AND (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = conversations.talent_id
        AND (tp.user_id::text = auth.uid()::text OR tp.id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = conversations.business_id
        AND bp.user_id::text = auth.uid()::text
    )
  )
);

-- Conversations: INSERT if talent owner or business owner AND accepted connection
CREATE POLICY "conversations_insert_with_accepted_connection"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public._has_accepted_connection(talent_id, business_id)
  AND (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = conversations.talent_id
        AND (tp.user_id::text = auth.uid()::text OR tp.id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = conversations.business_id
        AND bp.user_id::text = auth.uid()::text
    )
  )
);

-- Messages: SELECT if user can access parent conversation
CREATE POLICY "messages_select_via_conversation"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND public._has_accepted_connection(c.talent_id, c.business_id)
      AND (
        EXISTS (
          SELECT 1 FROM public.talent_profiles tp
          WHERE tp.id = c.talent_id
            AND (tp.user_id::text = auth.uid()::text OR tp.id::text = auth.uid()::text)
        )
        OR EXISTS (
          SELECT 1 FROM public.business_profiles bp
          WHERE bp.id = c.business_id
            AND bp.user_id::text = auth.uid()::text
        )
      )
  )
);

-- Messages: INSERT if sender role matches user AND connection accepted
CREATE POLICY "messages_insert_with_accepted_connection_and_role"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND public._has_accepted_connection(c.talent_id, c.business_id)
      AND (
        (messages.sender_type = 'talent'
          AND EXISTS (
            SELECT 1 FROM public.talent_profiles tp
            WHERE tp.id = c.talent_id
              AND (tp.user_id::text = auth.uid()::text OR tp.id::text = auth.uid()::text)
              AND messages.sender_user_id::text = auth.uid()::text
          )
        )
        OR
        (messages.sender_type = 'business'
          AND EXISTS (
            SELECT 1 FROM public.business_profiles bp
            WHERE bp.id = c.business_id
              AND bp.user_id::text = auth.uid()::text
              AND messages.sender_user_id::text = auth.uid()::text
          )
        )
      )
  )
);

NOTIFY pgrst, 'reload schema';
