-- Multiple images per product: array of URLs
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT NULL;

COMMENT ON COLUMN products.image_urls IS 'Array of image URLs; first is primary. When set, image_url can be derived from it.';

-- Backfill: migrate single image_url to image_urls where image_urls is null
UPDATE products
SET image_urls = ARRAY[image_url]::text[]
WHERE image_url IS NOT NULL AND image_url != '' AND (image_urls IS NULL OR cardinality(image_urls) = 0);

-- Storage bucket for product image uploads (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read for product images; upload via API (service role)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Service role upload product images" ON storage.objects;
CREATE POLICY "Service role upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');
