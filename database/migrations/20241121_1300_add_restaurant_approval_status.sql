-- Add approval status to restaurants table
ALTER TABLE restaurants ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE restaurants ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE restaurants ADD COLUMN approved_by UUID REFERENCES users(id) NULL;

-- Update existing restaurants to be approved by default (for backward compatibility)
UPDATE restaurants SET approval_status = 'approved', approved_at = created_at WHERE approval_status IS NULL;

-- Create index for approval status
CREATE INDEX idx_restaurants_approval_status ON restaurants(approval_status);