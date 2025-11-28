-- Add image_url column to users table for profile pictures
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

