-- HATOD Database Reset Script
-- This script deletes ALL data from the database while keeping the schema intact
-- WARNING: This will permanently delete all data! Use with caution.
--
-- Usage:
--   psql -d your_database_name -f database/reset_database.sql
--
-- Or in Supabase SQL Editor, paste and run this script

-- Disable foreign key checks temporarily (PostgreSQL doesn't have this, so we delete in order)
-- Delete in reverse order of dependencies to avoid foreign key constraint violations

BEGIN;

-- Delete data from tables with foreign key dependencies first (child tables)
DELETE FROM order_status_events;
DELETE FROM delivery_requests;
DELETE FROM payments;
DELETE FROM reviews;
DELETE FROM order_items;
DELETE FROM deliveries;
DELETE FROM orders;
DELETE FROM cart_items;
DELETE FROM favorites;
DELETE FROM addresses;
DELETE FROM menu_item_variants;
DELETE FROM menu_items;
DELETE FROM menu_categories;
DELETE FROM rider_profiles;
DELETE FROM restaurants;
DELETE FROM users;

-- Delete delivery fee tiers (no foreign keys, but keep structure)
DELETE FROM delivery_fee_tiers;

-- Delete business hours (if exists)
DELETE FROM business_hours;

-- Reset sequences if any (PostgreSQL uses UUIDs, so no sequences needed)
-- But if you have any sequences, reset them here

COMMIT;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Database reset completed successfully!';
    RAISE NOTICE 'All data has been deleted. The database schema remains intact.';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Run migrations to set up delivery fee tiers:';
    RAISE NOTICE '      - database/migrations/20250102_1000_add_tiered_delivery_fees.sql';
    RAISE NOTICE '      - database/migrations/20250106_1000_replace_espina_with_gigaquit.sql';
    RAISE NOTICE '   2. Create an admin account using:';
    RAISE NOTICE '      - database/create_admin_user.sql (SQL method)';
    RAISE NOTICE '      - OR node database/create_admin_user.js (Node.js method)';
END $$;

