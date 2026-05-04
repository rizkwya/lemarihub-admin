-- Backfill products.images from existing products.image_url.
-- Safe to run multiple times.
--
-- Behavior:
-- - If images is NULL or empty array, set it to [image_url] when image_url exists.
-- - If image_url is NULL but images has at least 1 item, set image_url = images[0].
--
-- Run in Supabase SQL Editor.

begin;

-- 1) images <- image_url for legacy rows
update public.products
set images = jsonb_build_array(image_url)
where (images is null or images = '[]'::jsonb)
  and image_url is not null
  and length(trim(image_url)) > 0;

-- 2) image_url <- images[0] for newer rows that might miss cover image
update public.products
set image_url = (images->>0)
where (image_url is null or length(trim(image_url)) = 0)
  and images is not null
  and jsonb_typeof(images) = 'array'
  and jsonb_array_length(images) > 0;

commit;
