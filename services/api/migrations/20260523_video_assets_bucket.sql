-- Create public storage bucket for video background assets (review cards)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-assets',
  'video-assets',
  true,
  5242880,  -- 5 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'video-assets service upload'
  ) THEN
    CREATE POLICY "video-assets service upload"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'video-assets');
  END IF;
END $$;

-- Allow public (anon) read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'video-assets public read'
  ) THEN
    CREATE POLICY "video-assets public read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'video-assets');
  END IF;
END $$;

-- Allow service role to update/replace (upsert support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'video-assets service update'
  ) THEN
    CREATE POLICY "video-assets service update"
    ON storage.objects FOR UPDATE
    TO service_role
    USING (bucket_id = 'video-assets');
  END IF;
END $$;
