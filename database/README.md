# HATOD Database Setup

This directory contains the PostgreSQL database schema and setup files for the HATOD food delivery application.

## Database Schema Overview

The database consists of the following main tables:

- **users**: All user types (customers, restaurants, riders, admins)
- **restaurants**: Restaurant information and settings
- **menu_categories**: Categories for organizing menu items
- **menu_items**: Individual food items with pricing and details
- **addresses**: Delivery addresses for customers
- **orders**: Order information and status
- **order_items**: Items within each order
- **deliveries**: Delivery assignments and tracking
- **payments**: Payment records and status
- **reviews**: Customer reviews and ratings

## Local Development Setup

### Prerequisites

- PostgreSQL 12+ installed locally
- psql command-line tool

### Setup Steps

1. **Create the database:**
   ```bash
   createdb hatod_db
   ```

2. **Run the setup script:**
   ```bash
   psql -d hatod_db -f database/setup.sql
   ```

   Or use the provided shell script:
   ```bash
   chmod +x database/setup.sh
   ./database/setup.sh
   ```

3. **Verify the setup:**
   ```bash
   psql -d hatod_db -c "SELECT COUNT(*) as users_count FROM users;"
   psql -d hatod_db -c "SELECT COUNT(*) as restaurants_count FROM restaurants;"
   ```

## Production Deployment

### Google Cloud SQL

1. Create a PostgreSQL instance in Google Cloud Console
2. Note the connection details (host, port, database name)
3. Update your application configuration with production credentials
4. Run the schema migration:
   ```bash
   psql -h [HOST] -p [PORT] -U [USER] -d [DATABASE] -f database/schema.sql
   ```

### Environment Variables

Set these environment variables in your application:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=hatod_db
DB_USER=your-username
DB_PASSWORD=your-password
```

## Sample Data

The setup script includes sample data for development:

- Admin user: `admin@hatod.com`
- Restaurant owner: `mario@pizza.com`
- Delivery rider: `john@rider.com`
- Customer: `customer@example.com`
- Sample restaurant with menu items

**Important:** The passwords in the sample data are dummy hashes. In production, implement proper password hashing.

## Database Migrations

For future schema changes, create new migration files in the `migrations/` directory following the naming convention:

```
YYYYMMDD_HHMM_description.sql
```

Example: `20241112_1430_add_user_preferences.sql`

## Backup and Restore

### Backup
```bash
pg_dump hatod_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore
```bash
psql -d hatod_db < backup_file.sql
```

## Performance Considerations

- Indexes are created on frequently queried columns
- UUIDs are used for primary keys to avoid conflicts in distributed systems
- JSONB is used for flexible data storage (gateway responses)
- Arrays are used for simple lists (allergens)

## Security Notes

- Never commit real passwords or production credentials
- Use environment variables for sensitive configuration
- Implement proper password hashing (bcrypt recommended)
- Enable SSL/TLS for database connections in production