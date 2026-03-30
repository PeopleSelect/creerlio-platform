-- Allow conversations.talent_id to hold any UUID (auth user id or talent_profiles.id)
-- This enables ROS customer conversations where initiator_id is an auth user, not a talent profile.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_talent_id_fkey;

-- Also ensure conversations RLS allows ROS initiators to see their own conversations
-- (service-role API bypasses RLS, so this is defence-in-depth only)
DROP POLICY IF EXISTS "conversations_ros_initiator_select" ON public.conversations;
CREATE POLICY "conversations_ros_initiator_select"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  talent_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = conversations.business_id
      AND bp.user_id::text = auth.uid()::text
  )
);
