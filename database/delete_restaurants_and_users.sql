-- HATOD Database Cleanup Script
-- This script deletes all restaurants and users EXCEPT admin users
-- Keeps: Admin users, delivery fee tiers, business hours, and other system data
--
-- Usage:
--   psql -d your_database_name -f database/delete_restaurants_and_users.sql
--
-- Or in Supabase SQL Editor, paste and run this script

BEGIN;

-- Delete in order to respect foreign key constraints

-- 1. Delete restaurant-related data (child tables first)
DELETE FROM order_status_events WHERE order_id IN (
    SELECT id FROM orders WHERE restaurant_id IS NOT NULL
);

DELETE FROM delivery_requests WHERE restaurant_id IS NOT NULL;

DELETE FROM payments WHERE order_id IN (
    SELECT id FROM orders WHERE restaurant_id IS NOT NULL
);

DELETE FROM reviews WHERE restaurant_id IS NOT NULL;

DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE restaurant_id IS NOT NULL
);

DELETE FROM deliveries WHERE order_id IN (
    SELECT id FROM orders WHERE restaurant_id IS NOT NULL
);

DELETE FROM orders WHERE restaurant_id IS NOT NULL;

-- Delete menu items and variants (restaurant-related)
DELETE FROM menu_item_variants WHERE menu_item_id IN (
    SELECT id FROM menu_items WHERE restaurant_id IS NOT NULL
);

DELETE FROM menu_items WHERE restaurant_id IS NOT NULL;

DELETE FROM menu_categories WHERE restaurant_id IS NOT NULL;

-- Delete restaurants
DELETE FROM restaurants;

-- 2. Delete non-admin users and their related data
-- First, delete data related to non-admin users

-- Delete order status events for orders by non-admin users
DELETE FROM order_status_events WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN users u ON o.customer_id = u.id
    WHERE u.user_type != 'admin'
);

-- Delete delivery requests for non-admin riders
DELETE FROM delivery_requests WHERE rider_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete payments for orders by non-admin users
DELETE FROM payments WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN users u ON o.customer_id = u.id
    WHERE u.user_type != 'admin'
);

-- Delete reviews by non-admin users
DELETE FROM reviews WHERE customer_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete order items for orders by non-admin users
DELETE FROM order_items WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN users u ON o.customer_id = u.id
    WHERE u.user_type != 'admin'
);

-- Delete deliveries assigned to non-admin riders
DELETE FROM deliveries WHERE rider_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete orders by non-admin users
DELETE FROM orders WHERE customer_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete cart items for non-admin users
DELETE FROM cart_items WHERE user_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete favorites for non-admin users
DELETE FROM favorites WHERE user_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete addresses for non-admin users
DELETE FROM addresses WHERE user_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Delete rider profiles for non-admin riders
DELETE FROM rider_profiles WHERE user_id IN (
    SELECT id FROM users WHERE user_type != 'admin'
);

-- Finally, delete all non-admin users
DELETE FROM users WHERE user_type != 'admin';

COMMIT;

-- Display completion message
DO $$
DECLARE
    admin_count INTEGER;
    deleted_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE user_type = 'admin';
    
    RAISE NOTICE '✅ Cleanup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - All restaurants deleted';
    RAISE NOTICE '   - All non-admin users deleted';
    RAISE NOTICE '   - Admin users preserved: %', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ System data preserved:';
    RAISE NOTICE '   - Delivery fee tiers';
    RAISE NOTICE '   - Business hours';
    RAISE NOTICE '   - Admin accounts';
END $$;

