-- Database Setup Script for HATOD
-- Run this script to initialize the database

-- Create database (run this manually or adjust for your environment)
-- CREATE DATABASE hatod_db;

-- Connect to the database
-- \c hatod_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run the main schema
\i database/schema.sql


-- Create development admin user
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'admin@hatod.com',
    '$2a$12$5ne5X1LC5jwz4GQFM3kEeOLAHAg5KB9ziQA.YoTLtWVMTt0LhwV7O', -- password123
    'System Administrator',
    '+1234567890',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Create sample restaurant owner
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'mario@pizza.com',
    '$2a$12$5ne5X1LC5jwz4GQFM3kEeOLAHAg5KB9ziQA.YoTLtWVMTt0LhwV7O', -- password123
    'Mario Rossi',
    '+1234567890',
    'restaurant',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Create sample restaurant
INSERT INTO restaurants (
    owner_id,
    name,
    description,
    phone,
    email,
    address,
    cuisine_type,
    price_range,
    delivery_fee,
    minimum_order,
    is_open
)
SELECT
    u.id,
    'Mario''s Authentic Pizza',
    'Traditional Italian pizza made with fresh ingredients and imported San Marzano tomatoes',
    '+1234567890',
    'mario@pizza.com',
    '123 Main Street, New York, NY 10001',
    'Italian',
    '$$',
    2.99,
    15.00,
    true
FROM users u
WHERE u.email = 'mario@pizza.com'
ON CONFLICT DO NOTHING;

-- Create sample delivery rider
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'john@rider.com',
    '$2a$12$5ne5X1LC5jwz4GQFM3kEeOLAHAg5KB9ziQA.YoTLtWVMTt0LhwV7O', -- password123
    'John Smith',
    '+1234567890',
    'rider',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Create sample customer
INSERT INTO users (email, password_hash, full_name, phone, user_type, email_verified, is_active)
VALUES (
    'customer@example.com',
    '$2a$12$5ne5X1LC5jwz4GQFM3kEeOLAHAg5KB9ziQA.YoTLtWVMTt0LhwV7O', -- password123
    'Jane Doe',
    '+1234567890',
    'customer',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Create sample address for customer
INSERT INTO addresses (user_id, label, street_address, city, state, zip_code, country, is_default)
SELECT
    u.id,
    'Home',
    '456 Oak Avenue',
    'New York',
    'NY',
    '10002',
    'USA',
    true
FROM users u
WHERE u.email = 'customer@example.com'
ON CONFLICT DO NOTHING;

-- Create menu categories for the restaurant
INSERT INTO menu_categories (restaurant_id, name, description, display_order, is_active)
SELECT
    r.id,
    'Classic Pizzas',
    'Our signature pizzas made with traditional recipes',
    1,
    true
FROM restaurants r
WHERE r.name = 'Mario''s Authentic Pizza'
ON CONFLICT DO NOTHING;

INSERT INTO menu_categories (restaurant_id, name, description, display_order, is_active)
SELECT
    r.id,
    'Specialty Pizzas',
    'Creative pizzas with unique flavor combinations',
    2,
    true
FROM restaurants r
WHERE r.name = 'Mario''s Authentic Pizza'
ON CONFLICT DO NOTHING;

INSERT INTO menu_categories (restaurant_id, name, description, display_order, is_active)
SELECT
    r.id,
    'Pasta Dishes',
    'Homemade pasta with authentic Italian sauces',
    3,
    true
FROM restaurants r
WHERE r.name = 'Mario''s Authentic Pizza'
ON CONFLICT DO NOTHING;

-- Create sample menu items
INSERT INTO menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price,
    is_available,
    is_vegetarian,
    preparation_time_minutes
)
SELECT
    r.id,
    mc.id,
    'Margherita Pizza',
    'Fresh mozzarella, tomato sauce, basil, and extra virgin olive oil',
    18.99,
    true,
    true,
    15
FROM restaurants r
CROSS JOIN menu_categories mc
WHERE r.name = 'Mario''s Authentic Pizza'
AND mc.name = 'Classic Pizzas'
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price,
    is_available,
    is_vegetarian,
    preparation_time_minutes
)
SELECT
    r.id,
    mc.id,
    'Pepperoni Pizza',
    'Classic pepperoni with mozzarella and tomato sauce',
    22.99,
    true,
    false,
    15
FROM restaurants r
CROSS JOIN menu_categories mc
WHERE r.name = 'Mario''s Authentic Pizza'
AND mc.name = 'Classic Pizzas'
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price,
    is_available,
    is_vegetarian,
    preparation_time_minutes
)
SELECT
    r.id,
    mc.id,
    'Truffle Pizza',
    'White pizza with truffle oil, mushrooms, and parmesan',
    28.99,
    true,
    true,
    20
FROM restaurants r
CROSS JOIN menu_categories mc
WHERE r.name = 'Mario''s Authentic Pizza'
AND mc.name = 'Specialty Pizzas'
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price,
    is_available,
    is_vegetarian,
    preparation_time_minutes
)
SELECT
    r.id,
    mc.id,
    'Spaghetti Carbonara',
    'Classic Roman pasta with pancetta, eggs, and pecorino cheese',
    16.99,
    true,
    false,
    12
FROM restaurants r
CROSS JOIN menu_categories mc
WHERE r.name = 'Mario''s Authentic Pizza'
AND mc.name = 'Pasta Dishes'
ON CONFLICT DO NOTHING;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE 'HATOD database setup completed successfully!';
    RAISE NOTICE 'Created users: admin@hatod.com, mario@pizza.com, john@rider.com, customer@example.com';
    RAISE NOTICE 'Created restaurant: Mario''s Authentic Pizza with sample menu items';
END $$;