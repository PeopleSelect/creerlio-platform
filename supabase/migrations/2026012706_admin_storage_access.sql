-- ============================================
-- Allow admins to access all storage files
-- ============================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all talent storage files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all business storage files" ON storage.objects;

-- Admin policy for talent-bank bucket
CREATE POLICY "Admins can view all talent storage files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'talent-bank'
  AND (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
);

-- Admin policy for business-bank bucket
CREATE POLICY "Admins can view all business storage files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'business-bank'
  AND (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
);
