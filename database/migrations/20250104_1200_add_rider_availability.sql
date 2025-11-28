-- Migration: Add availability field to rider_profiles
-- Created: 2025-01-04 12:00
-- Description: Adds is_available field to rider_profiles table for tracking rider availability

ALTER TABLE rider_profiles 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rider_profiles_available ON rider_profiles(is_available) WHERE is_available = true;

