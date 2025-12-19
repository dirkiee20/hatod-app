-- Migration: Add original price fields for price reset functionality
-- Created: 2025-01-08 15:00
-- Description: Adds original_price fields to track base prices before adjustments

-- Add original_price to menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(6, 2);

-- Add original_price to menu_item_variants
ALTER TABLE menu_item_variants 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(6, 2);

-- For existing records, set original_price to current price if not set
UPDATE menu_items 
SET original_price = price 
WHERE original_price IS NULL AND price IS NOT NULL;

UPDATE menu_item_variants 
SET original_price = price 
WHERE original_price IS NULL AND price IS NOT NULL;







