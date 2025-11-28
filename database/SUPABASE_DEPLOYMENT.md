# Deploying HATOD Database to Supabase

This guide will walk you through deploying your HATOD database schema to Supabase.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created
3. Access to your Supabase project's SQL Editor

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: HATOD (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Copy the **URI** connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
4. Save this for later use in your `.env` file

## Step 3: Deploy the Database Schema

### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `database/deploy_to_supabase.sql` from your project
4. Copy the entire contents
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for the script to complete (should take 10-30 seconds)
8. You should see a success message: "HATOD database schema deployed successfully to Supabase!"

### Option B: Using psql Command Line

If you prefer using the command line:

```bash
# Install psql if you don't have it
# On Windows: Download from https://www.postgresql.org/download/windows/
# On Mac: brew install postgresql
# On Linux: sudo apt-get install postgresql-client

# Run the deployment script
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" -f database/deploy_to_supabase.sql
```

Replace `[YOUR-PASSWORD]` and `db.xxxxx.supabase.co` with your actual Supabase credentials.

## Step 4: Verify the Deployment

1. In Supabase SQL Editor, run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see all your tables listed (users, restaurants, orders, etc.)

2. Check that indexes were created:

```sql
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

3. Verify triggers exist:

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## Step 5: Update Your Application Configuration

1. Create or update your `.env` file in the `api` directory:

```env
# Supabase Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Or use individual connection parameters
PGHOST=db.xxxxx.supabase.co
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=[YOUR-PASSWORD]
PGSSL=true

# Your other environment variables...
PORT=4000
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
# ... etc
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your actual Supabase database password
- Replace `db.xxxxx.supabase.co` with your actual Supabase host
- The `DATABASE_URL` format is recommended as it's simpler
- Make sure `PGSSL=true` or use `ssl: { rejectUnauthorized: false }` in your connection config (already configured in `api/config/db.js`)

## Step 6: Test the Connection

1. Start your API server:
```bash
cd api
npm start
```

2. Check the console for any database connection errors
3. If you see "Database connected successfully" or no errors, you're good to go!

## Step 7: (Optional) Set Up Row Level Security (RLS)

Supabase uses Row Level Security by default. You may want to configure RLS policies for your tables. However, since your application handles authentication at the application level, you can disable RLS for now:

```sql
-- Disable RLS on all tables (if needed)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

Or create policies that allow all operations (less secure but simpler):

```sql
-- Example: Allow all operations on users table
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true) WITH CHECK (true);
```

## Troubleshooting

### Connection Issues

- **Error: "password authentication failed"**
  - Double-check your password in the connection string
  - Make sure there are no extra spaces or special characters

- **Error: "SSL connection required"**
  - Make sure `PGSSL=true` in your `.env` file
  - Or ensure your connection string includes `?sslmode=require`

- **Error: "timeout"**
  - Check your internet connection
  - Verify the Supabase host is correct
  - Check if your IP is allowed (Supabase allows all IPs by default)

### Schema Issues

- **Error: "relation already exists"**
  - The table already exists. You can either:
    - Drop and recreate: `DROP TABLE IF EXISTS table_name CASCADE;`
    - Or use `CREATE TABLE IF NOT EXISTS` (already in the script)

- **Error: "permission denied"**
  - Make sure you're using the `postgres` superuser account
  - Check your Supabase project permissions

## Next Steps

1. **Seed Initial Data** (Optional):
   - You can run `database/seed.sql` to add sample data
   - Or create your own seed data

2. **Set Up Backups**:
   - Supabase automatically backs up your database
   - You can also set up additional backup strategies

3. **Monitor Performance**:
   - Use Supabase dashboard to monitor query performance
   - Set up alerts for slow queries

4. **Environment Variables**:
   - Make sure all your environment variables are set correctly
   - Never commit `.env` files to version control

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Enable SSL/TLS** for all database connections (already configured)
4. **Regular backups** (Supabase handles this automatically)
5. **Monitor access logs** in Supabase dashboard

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs
2. Check Supabase status: https://status.supabase.com
3. Review your application logs for detailed error messages

