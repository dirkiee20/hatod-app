-- Add menu item variants table for size/price variations
CREATE TABLE menu_item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Small", "Medium", "Large", "Regular", "Family Size"
    price DECIMAL(6, 2) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at
CREATE TRIGGER update_menu_item_variants_updated_at
    BEFORE UPDATE ON menu_item_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_menu_item_variants_menu_item ON menu_item_variants(menu_item_id);
CREATE INDEX idx_menu_item_variants_available ON menu_item_variants(is_available);

-- Modify menu_items to make price optional (variants will have their own prices)
ALTER TABLE menu_items ADD COLUMN has_variants BOOLEAN DEFAULT false;
ALTER TABLE menu_items ALTER COLUMN price DROP NOT NULL;

-- Update existing items to not have variants by default
UPDATE menu_items SET has_variants = false WHERE has_variants IS NULL;