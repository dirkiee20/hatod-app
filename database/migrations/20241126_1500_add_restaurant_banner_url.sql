-- Add banner_url column so restaurants can upload hero images for customer views
ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);

-- Default any existing restaurants to reuse the current logo/banner image
UPDATE restaurants
SET banner_url = COALESCE(banner_url, image_url);

