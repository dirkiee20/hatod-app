# Supabase Connection Troubleshooting

## Error: ENOTFOUND - Cannot resolve hostname

If you're getting an `ENOTFOUND` error when trying to connect to Supabase, follow these steps:

### Step 1: Verify Your Supabase Project is Active

1. Go to https://supabase.com/dashboard
2. Check if your project is **Active** (not paused)
3. If paused, click "Restore" to activate it
4. Wait 1-2 minutes for the project to fully start

### Step 2: Get the Correct Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Make sure you're copying the **URI** format (not the other formats)
4. The format should be:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 3: Check Your Connection String Format

Your connection string should look like one of these:

**Option A: Direct connection (port 5432)**
```
postgresql://postgres:hatod%4020205@db.sjxzsjqjpuebtxxskdza.supabase.co:5432/postgres
```

**Option B: Connection pooler (port 6543) - Recommended for production**
```
postgresql://postgres.sjxzsjqjpuebtxxskdza:hatod%4020205@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 4: Verify Project Reference

1. In Supabase dashboard, go to **Settings** → **General**
2. Check your **Reference ID** - it should match the one in your connection string
3. If it doesn't match, update your `.env` file with the correct connection string

### Step 5: Test Connection

Try pinging the hostname:
```powershell
Test-NetConnection -ComputerName db.sjxzsjqjpuebtxxskdza.supabase.co -Port 5432
```

If this fails, the project might be:
- Paused (check dashboard)
- Not fully provisioned (wait a few minutes)
- Using a different hostname (get fresh connection string)

### Step 6: Alternative - Use Connection Pooler

If direct connection doesn't work, try the pooler connection:

1. In Supabase dashboard → **Settings** → **Database**
2. Look for **Connection pooling** section
3. Copy the **Session mode** connection string
4. Update your `.env` file

### Common Issues:

1. **Project is paused**: Free tier projects pause after inactivity
   - Solution: Go to dashboard and click "Restore"

2. **Wrong hostname**: Connection string might be outdated
   - Solution: Get fresh connection string from Supabase dashboard

3. **Password encoding**: Special characters in password need URL encoding
   - `@` becomes `%40`
   - `#` becomes `%23`
   - etc.

4. **Network/Firewall**: Some networks block database connections
   - Solution: Check if you can access Supabase dashboard from same network

### Quick Fix:

1. Go to Supabase dashboard
2. Settings → Database
3. Copy the **URI** connection string (fresh copy)
4. Update `api/.env` file with the new connection string
5. Make sure password is URL encoded (use `%40` for `@`)

