-- Migration: Add menu item approval status and admin markup
-- Created: 2025-01-04 14:00
-- Description: Adds approval workflow and admin markup functionality for menu items

-- Add approval status column
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add admin markup fields
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS admin_markup_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS admin_markup_amount DECIMAL(6, 2) DEFAULT 0.00;

-- Add index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_menu_items_approval_status ON menu_items(approval_status);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_approval ON menu_items(restaurant_id, approval_status);

-- Update existing menu items to approved status (backward compatibility)
UPDATE menu_items SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';

