-- Migration: Add location tracking fields to rider_profiles
-- Created: 2025-01-05 11:00
-- Description: Adds latitude and longitude fields to track rider's real-time location

-- Add location fields to rider_profiles table
ALTER TABLE rider_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_rider_profiles_location ON rider_profiles(latitude, longitude);

-- Add comment
COMMENT ON COLUMN rider_profiles.latitude IS 'Current latitude of the rider for real-time tracking';
COMMENT ON COLUMN rider_profiles.longitude IS 'Current longitude of the rider for real-time tracking';
COMMENT ON COLUMN rider_profiles.location_updated_at IS 'Timestamp when the rider location was last updated';

