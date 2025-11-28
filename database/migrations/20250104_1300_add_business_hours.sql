-- Migration: Add business hours table
-- Created: 2025-01-04 13:00
-- Description: Creates business_hours table to store restaurant operating hours

CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false, -- If true, restaurant is closed on this day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, day_of_week)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_hours_restaurant ON business_hours(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);

-- Add trigger for updated_at
CREATE TRIGGER update_business_hours_updated_at 
    BEFORE UPDATE ON business_hours 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

