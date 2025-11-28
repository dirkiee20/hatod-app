-- Add delivery_requests table for rider-restaurant request system
CREATE TABLE IF NOT EXISTS delivery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
    requested_by VARCHAR(20) NOT NULL CHECK (requested_by IN ('rider', 'restaurant')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(delivery_id, rider_id, status) -- Prevent duplicate pending requests
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_requests_delivery_id ON delivery_requests(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_rider_id ON delivery_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_restaurant_id ON delivery_requests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);

