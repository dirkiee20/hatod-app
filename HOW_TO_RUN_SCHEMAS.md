# How to Run Database Schemas - PostgreSQL Guide

## Method 1: Using `psql` (PostgreSQL Command Line Tool)

### Step 1: Connect to your PostgreSQL database

If you have a connection string (like Supabase):
```bash
psql "your-database-connection-string"
```

Or if you have individual connection details:
```bash
psql -h localhost -p 5432 -U your_username -d your_database_name
```

For Supabase (using DATABASE_URL from .env):
```bash
# Windows PowerShell
$env:DATABASE_URL="your-connection-string-here"
psql $env:DATABASE_URL

# Or directly
psql "postgresql://user:password@host:port/database"
```

### Step 2: Run the schema file

Once connected to psql, you can run:
```sql
\i database/schema.sql
```

Or from command line without entering psql:
```bash
psql "your-connection-string" -f database/schema.sql
```

### Step 3: Run migrations

```bash
# Run a single migration
psql "your-connection-string" -f database/migrations/20250101_1000_add_location_selection.sql

# Or run all migrations (you'd need to script this)
```

---

## Method 2: Using Node.js Script (Easiest - Already Created!)

We already created a script for you:

```bash
# Create all tables from schema.sql and apply migrations
node create_tables.js
```

This is the easiest method and handles everything automatically!

---

## Method 3: Using pgAdmin or Supabase Dashboard

### For Supabase:
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Copy and paste the contents of `database/schema.sql`
4. Click "Run" to execute

### For pgAdmin:
1. Open pgAdmin
2. Connect to your database
3. Right-click on your database → "Query Tool"
4. Open `database/schema.sql` file
5. Click "Execute" (F5)

---

## Method 4: Direct SQL Execution

If you're already in psql, you can copy-paste SQL directly:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ... rest of the schema
);
```

---

## Quick Reference Commands

### Check if psql is installed:
```bash
psql --version
```

### Connect to database:
```bash
psql "postgresql://user:password@host:port/database"
```

### List all tables:
```sql
\dt
```

### Describe a table:
```sql
\d table_name
```

### Exit psql:
```sql
\q
```

### Run a SQL file:
```sql
\i path/to/file.sql
```

### Or from command line:
```bash
psql "connection-string" -f path/to/file.sql
```

---

## Recommended Approach

**For your project, I recommend using Method 2 (Node.js script):**

```bash
node create_tables.js
```

This script:
- ✅ Handles connection automatically
- ✅ Applies schema.sql
- ✅ Applies all migrations in order
- ✅ Verifies everything was created
- ✅ Works with your existing .env configuration

---

## Troubleshooting

### "psql: command not found"
- Install PostgreSQL client tools
- Or use the Node.js script instead

### "Connection refused"
- Check your database is running
- Verify connection string is correct
- Check firewall settings

### "Permission denied"
- Make sure your user has CREATE TABLE permissions
- Check database user privileges

