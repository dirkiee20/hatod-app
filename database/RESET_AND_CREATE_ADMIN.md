# Database Reset and Admin Account Creation Guide

This guide will help you reset your database and create a new admin account.

## ⚠️ WARNING
**This will delete ALL data from your database!** Make sure you have backups if needed.

---

## Step 1: Reset the Database

### Option A: Using SQL Script (Recommended)

Run the reset script:

```bash
# For local PostgreSQL
psql -d your_database_name -f database/reset_database.sql

# For Supabase
# Copy the contents of database/reset_database.sql and paste into Supabase SQL Editor
```

### Option B: Manual SQL Commands

If you prefer to run commands manually, connect to your database and run:

```sql
-- Delete all data (in order to respect foreign keys)
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
DELETE FROM delivery_fee_tiers;
DELETE FROM business_hours;
```

---

## Step 2: Re-run Migrations (Optional but Recommended)

After resetting, you may want to re-run migrations to set up delivery fee tiers:

```bash
# Run migrations in order
psql -d your_database_name -f database/migrations/20250102_1000_add_tiered_delivery_fees.sql
psql -d your_database_name -f database/migrations/20250106_1000_replace_espina_with_gigaquit.sql
```

---

## Step 3: Create Admin Account

### Option A: Using Node.js Script (Easiest - Recommended)

This script will prompt you for admin details and create the account:

```bash
node database/create_admin_user.js
```

You'll be prompted for:
- Admin email
- Admin password
- Full name
- Phone number (optional)

**Example:**
```
Enter admin email: admin@hatod.com
Enter admin password: your_secure_password
Enter admin full name: System Administrator
Enter admin phone (optional, press Enter to skip): +1234567890
```

### Option B: Using SQL Script

1. **Generate a password hash:**
   ```bash
   node generate_password_hash.js
   ```
   Enter your password when prompted, and it will output the hash.

2. **Edit `database/create_admin_user.sql`:**
   - Replace `'admin@hatod.com'` with your desired email
   - Replace the `password_hash` with the hash from step 1
   - Replace `'System Administrator'` with your admin's name
   - Replace `'+1234567890'` with your admin's phone

3. **Run the SQL script:**
   ```bash
   psql -d your_database_name -f database/create_admin_user.sql
   ```

### Option C: Quick SQL Insert (Using Pre-hashed Password)

If you want to use the default password "password123", you can use this hash:

```sql
INSERT INTO users (
    email, 
    password_hash, 
    full_name, 
    phone, 
    user_type, 
    email_verified, 
    is_active
)
VALUES (
    'admin@hatod.com',  -- Change this email
    '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm',  -- Hash for "password123"
    'System Administrator',  -- Change this name
    '+1234567890',  -- Change this phone
    'admin',
    true,
    true
)
ON CONFLICT (email) DO UPDATE
SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    user_type = 'admin',
    is_active = true,
    email_verified = true;
```

**Note:** The password hash above is for "password123". For security, generate your own hash using `generate_password_hash.js`.

---

## Step 4: Verify Admin Account

Check that your admin account was created:

```sql
SELECT 
    id,
    email,
    full_name,
    user_type,
    is_active,
    email_verified,
    created_at
FROM users 
WHERE user_type = 'admin';
```

---

## Quick Reference

### Default Admin Credentials (if using seed.sql)
- **Email:** `admin@hatod.com`
- **Password:** `password123`

### Files Reference
- **Reset Script:** `database/reset_database.sql`
- **Create Admin (Node.js):** `database/create_admin_user.js`
- **Create Admin (SQL):** `database/create_admin_user.sql`
- **Generate Password Hash:** `generate_password_hash.js`
- **Seed Data:** `database/seed.sql` (creates multiple test users)

---

## Troubleshooting

### Error: "relation does not exist"
- Make sure you've run the schema first: `database/schema.sql`

### Error: "duplicate key value violates unique constraint"
- The email already exists. Use `ON CONFLICT` handling or delete the existing user first.

### Can't connect to database
- Check your `DATABASE_URL` in `.env` file
- For Supabase, ensure you're using the connection string from your project settings

---

## Next Steps

After creating your admin account:
1. Log in to the admin panel at `pages/admin/admin_dashboard.html`
2. Set up delivery fee tiers if needed
3. Create restaurant accounts
4. Configure system settings

