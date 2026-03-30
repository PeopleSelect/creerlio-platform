-- 1. Allow 'customer' as sender_type in messages
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type IN ('talent', 'business', 'customer'));

-- 2. Add profile_visibility to customer_profiles
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (profile_visibility IN ('private', 'qr_connections', 'all_connections'));

-- 3. Update _has_accepted_connection to also accept active ROS connections
--    (talent_id arg may be a talent_profiles.id OR an auth user_id for ROS customers)
CREATE OR REPLACE FUNCTION public._has_accepted_connection(_talent_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.talent_connection_requests tcr
    WHERE tcr.talent_id   = _talent_id
      AND tcr.business_id = _business_id
      AND tcr.status      = 'accepted'
  )
  OR EXISTS (
    SELECT 1
    FROM public.ros_connections rc
    WHERE rc.initiator_id = _talent_id
      AND rc.business_id  = _business_id
      AND rc.status       = 'active'
  );
$$;
